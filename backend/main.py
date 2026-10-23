"""
MARS FastAPI Control Plane
Exposes all REST management endpoints, WebSocket telemetry streaming,
orchestrates workload generation, host/container monitoring, DQN scaling,
and experimental evaluation.
"""
import asyncio
import os
import time
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from .monitoring.host import get_host_metrics
from .monitoring.containers import get_container_metrics
from .monitoring.application import get_application_metrics
from .workload.generator import generator
from .scaler.controller import controller
from .scaler.baseline import baseline_scaler
from .rl.agent import agent, normalize_state, compute_reward, ACTION_NAMES
from .experiments.runner import experiment_runner

from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager: starts background controller loop and loads checkpoint."""
    agent.load_checkpoint("mars_dqn_latest.pt")
    task = asyncio.create_task(_autonomous_controller_loop())
    yield
    task.cancel()


app = FastAPI(title="MARS Control Plane", version="1.0.0", lifespan=lifespan)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active WebSocket connections
_active_websockets: List[WebSocket] = []

# Control loop state
_scaler_mode = "MANUAL"  # MANUAL, DQN, BASELINE


# ── Request / Response Models ─────────────────────────────────────────
class WorkloadStartRequest(BaseModel):
    target_rps: float = Field(20.0, ge=1.0, le=250.0)
    concurrency: int = Field(8, ge=1, le=40)
    duration_seconds: int = Field(120, ge=5, le=1800)


class WorkloadSpikeRequest(BaseModel):
    multiplier: float = Field(2.5, ge=1.2, le=5.0)


class WorkloadReduceRequest(BaseModel):
    factor: float = Field(0.5, ge=0.1, le=0.9)


class ManualScalingRequest(BaseModel):
    action: str = Field(..., pattern="^(scale_out|scale_in)$")
    reason: str = Field("manual_request")


class TrainAgentRequest(BaseModel):
    episodes: int = Field(50, ge=10, le=500)
    batch_size: int = Field(32, ge=16, le=128)


# ── REST Endpoints ───────────────────────────────────────────────────
@app.get("/api/health")
async def get_health():
    """System health check."""
    return {
        "status": "healthy",
        "service": "mars-control-plane",
        "timestamp": time.time(),
        "mode": _scaler_mode,
    }


@app.get("/api/metrics/host")
async def api_host_metrics():
    """Real host machine CPU, memory, and OS specs."""
    return get_host_metrics()


@app.get("/api/metrics/containers")
async def api_container_metrics():
    """Real Docker container metrics."""
    return get_container_metrics()


@app.get("/api/metrics/application")
async def api_application_metrics():
    """Application throughput, latency, and error rate from Prometheus."""
    return await get_application_metrics()


@app.get("/api/containers")
async def api_containers_list():
    """List detailed Docker container states."""
    data = get_container_metrics()
    return data.get("containers", [])


@app.get("/api/agent/status")
async def api_agent_status():
    """Current DQN agent state, Q-values, and training status."""
    status = agent.get_status()
    status["control_mode"] = _scaler_mode
    return status


@app.post("/api/workload/start")
async def api_workload_start(req: WorkloadStartRequest):
    """Start sending genuine HTTP workload."""
    stats = generator.start(
        target_rps=req.target_rps,
        concurrency=req.concurrency,
        duration_seconds=req.duration_seconds,
    )
    return {"message": "Workload started", "stats": stats}


@app.post("/api/workload/spike")
async def api_workload_spike(req: WorkloadSpikeRequest):
    """Trigger a traffic spike."""
    stats = generator.spike(multiplier=req.multiplier)
    return {"message": "Traffic spike triggered", "stats": stats}


@app.post("/api/workload/reduce")
async def api_workload_reduce(req: WorkloadReduceRequest):
    """Reduce traffic rate."""
    stats = generator.reduce(factor=req.factor)
    return {"message": "Traffic reduced", "stats": stats}


@app.post("/api/workload/stop")
async def api_workload_stop():
    """Stop sending HTTP requests."""
    stats = generator.stop()
    return {"message": "Workload stopped", "stats": stats}


@app.post("/api/scaling/manual")
async def api_manual_scaling(req: ManualScalingRequest):
    """Perform manual scale-out or scale-in."""
    if req.action == "scale_out":
        res = await controller.scale_out(reason=req.reason)
    else:
        res = await controller.scale_in(reason=req.reason)

    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Scaling operation failed"))
    return res


@app.get("/api/events")
async def api_get_events():
    """Audit log of scaling operations."""
    return controller.events


@app.post("/api/agent/enable")
async def api_agent_enable(mode: str = Query("DQN", pattern="^(DQN|BASELINE)$")):
    """
    Enable autonomous scaling mode.
    Strict rule: DQN cannot be enabled if model is untrained.
    """
    global _scaler_mode
    if mode == "DQN":
        if not agent.is_trained:
            raise HTTPException(
                status_code=400,
                detail="DQN agent is untrained. Train or load a validated model before enabling autonomous mode."
            )
        agent.autonomous_enabled = True
        _scaler_mode = "DQN"
    else:
        _scaler_mode = "BASELINE"

    return {"message": f"Autonomous mode set to {_scaler_mode}", "mode": _scaler_mode}


@app.post("/api/agent/disable")
async def api_agent_disable():
    """Disable autonomous scaling and revert to manual control."""
    global _scaler_mode
    _scaler_mode = "MANUAL"
    agent.autonomous_enabled = False
    return {"message": "Reverted to MANUAL control", "mode": _scaler_mode}


async def _run_training_pipeline(episodes: int, batch_size: int):
    """
    Controlled DQN training loop using synthetic experience trajectories
    derived from bounded system dynamics.
    Does NOT flood production systems.
    """
    import numpy as np
    for ep in range(episodes):
        # Sample realistic initial state: replicas (1-4), CPU, Mem, RPS, Latency
        rep = np.random.randint(1, 5)
        cpu = np.random.uniform(10.0, 95.0)
        mem = np.random.uniform(20.0, 70.0)
        rps = np.random.uniform(5.0, 150.0)
        lat = np.random.uniform(15.0, 450.0)
        err = 0.05 if lat > 300.0 else 0.0

        state = normalize_state(rep, cpu, mem, rps, lat, err)
        action, _ = agent.select_action(state, evaluate=False)

        # Simulate dynamics
        new_rep = rep
        illegal = False
        if action == 2:  # scale out
            if rep < 4:
                new_rep += 1
                cpu = max(10.0, cpu * 0.65)
                lat = max(20.0, lat * 0.55)
            else:
                illegal = True
        elif action == 0:  # scale in
            if rep > 1:
                new_rep -= 1
                cpu = min(98.0, cpu * 1.4)
                lat = min(600.0, lat * 1.5)
            else:
                illegal = True

        reward = compute_reward(lat, new_rep, err, action, illegal_action=illegal)
        next_state = normalize_state(new_rep, cpu, mem, rps, lat, err)

        agent.replay_buffer.push(state, action, reward, next_state, done=False)
        agent.update(batch_size=batch_size)
        await asyncio.sleep(0.01)

    agent.is_trained = True
    agent.save_checkpoint("mars_dqn_latest.pt")


@app.post("/api/agent/train")
async def api_agent_train(req: TrainAgentRequest, bg_tasks: BackgroundTasks):
    """Trigger controlled training pipeline in background."""
    bg_tasks.add_task(_run_training_pipeline, req.episodes, req.batch_size)
    return {"message": f"Training initiated for {req.episodes} episodes in background"}


@app.get("/api/experiments")
async def api_get_experiments():
    """List completed benchmark experiments."""
    return experiment_runner.get_experiments()


@app.get("/api/experiments/export")
async def api_export_experiments(
    experiment_id: str = Query(...),
    format: str = Query("json", pattern="^(json|csv)$")
):
    """Export experiment results as downloadable JSON or CSV."""
    path = experiment_runner.export_experiment(experiment_id, format)
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Experiment not found")
    media_type = "text/csv" if format == "csv" else "application/json"
    return FileResponse(path, media_type=media_type, filename=os.path.basename(path))


# ── WebSocket Streaming Endpoint ──────────────────────────────────────
@app.websocket("/ws/metrics")
async def websocket_metrics(websocket: WebSocket):
    """
    Streams live system telemetry tick every 1 second to connected dashboard clients.
    """
    await websocket.accept()
    _active_websockets.append(websocket)
    try:
        while True:
            # Gather real telemetry non-blockingly
            host = get_host_metrics()
            containers = await asyncio.to_thread(get_container_metrics)
            app_metrics = await get_application_metrics()
            workload = generator.get_stats()
            scaler_status = controller.get_status()
            agent_status = agent.get_status()

            payload = {
                "timestamp": time.time(),
                "mode": _scaler_mode,
                "host": host,
                "containers": containers,
                "application": app_metrics,
                "workload": workload,
                "scaler": scaler_status,
                "agent": agent_status,
            }

            await websocket.send_json(payload)
            await asyncio.sleep(1.0)
    except (WebSocketDisconnect, Exception):
        pass
    finally:
        if websocket in _active_websockets:
            _active_websockets.remove(websocket)


# ── Autonomous Scaling Loop ──────────────────────────────────────────
async def _autonomous_controller_loop():
    """
    Background loop that runs every 5 seconds.
    If autonomous mode is active (DQN or BASELINE), evaluates metrics and performs safe scaling.
    """
    while True:
        try:
            await asyncio.sleep(5.0)
            if _scaler_mode == "MANUAL":
                continue

            container_data = await asyncio.to_thread(get_container_metrics)
            current_replicas = container_data.get("running_count", 0)
            if current_replicas == 0:
                continue

            # Compute average container CPU
            containers = container_data.get("containers", [])
            avg_cpu = sum(c.get("cpu_percent", 0.0) for c in containers) / max(1, len(containers))
            avg_mem = sum(c.get("memory_percent", 0.0) for c in containers) / max(1, len(containers))

            app_data = await get_application_metrics()
            rps = app_data.get("throughput_rps", 0.0)
            lat = app_data.get("p95_latency_ms", 0.0)
            err = app_data.get("error_rate", 0.0)

            if _scaler_mode == "DQN" and agent.is_trained:
                state = normalize_state(current_replicas, avg_cpu, avg_mem, rps, lat, err)
                action, q_vals = agent.select_action(state, evaluate=True)
                agent.last_state = state

                if action == 2:  # scale out
                    await controller.scale_out(reason="DQN decision (Scale Out)")
                elif action == 0:  # scale in
                    await controller.scale_in(reason="DQN decision (Scale In)")

            elif _scaler_mode == "BASELINE":
                action = baseline_scaler.evaluate(avg_cpu, current_replicas)
                if action == 2:
                    await controller.scale_out(reason="Static Baseline CPU > 75%")
                elif action == 0:
                    await controller.scale_in(reason="Static Baseline CPU < 30%")

        except Exception:
            pass



