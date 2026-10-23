# MARS Architecture & Phase-Wise Implementation Plan
**Multi-Metric Adaptive Reinforcement-learning Scaling System**

---

## 1. Executive Summary & Core Principles

MARS is a real-time, closed-loop cloud autoscaling system driven by a Deep Q-Network (DQN) paired with real Docker container orchestration, live HTTP traffic generation, and zero mock data.

### Strict Real-Data Enforcement Rules
1. **Zero Mock Policy**: No hardcoded metrics, no synthetic chart values, no fabricated container states. If a container or metric is offline, the system reports `UNAVAILABLE` or `ERROR`.
2. **Verified Execution**: A scale-out or scale-in action is never reported as successful until Docker Engine confirms container creation/removal and the application `/health` check succeeds.
3. **No Direct Frontend-Docker Coupling**: The Next.js dashboard communicates exclusively with the FastAPI control plane via REST and WebSockets; privileged Docker operations remain isolated in the backend controller.
4. **Controlled RL Lifecycle**: An untrained agent is explicitly marked as `UNTRAINED`. Autonomous scaling is strictly disabled until the model completes a verified training and validation loop.

---

## 2. System Architecture & Topology

```
+-------------------------------------------------------------------------+
|                        Next.js Dashboard (:3000)                        |
|  - Overview  - Live Monitoring  - Containers  - Workload  - DQN  - Exp  |
+------------------------------------+------------------------------------+
                                     | HTTP REST & WebSocket (/ws/metrics)
                                     v
+-------------------------------------------------------------------------+
|                       FastAPI Control Plane (:8000)                     |
|  +------------------+  +-------------------+  +----------------------+  |
|  | Host Monitor     |  | Container Monitor |  | Workload Generator   |  |
|  | (psutil)         |  | (Docker SDK API)  |  | (Async HTTPX pool)   |  |
|  +------------------+  +-------------------+  +----------------------+  |
|  +------------------+  +-------------------+  +----------------------+  |
|  | Safe Docker      |  | DQN Agent &       |  | Static Threshold     |  |
|  | Controller       |  | Training Engine   |  | Baseline             |  |
|  +------------------+  +-------------------+  +----------------------+  |
+-------------------+-------------------+--------------------+------------+
                    |                   |                    |
         Docker API |                   | HTTP Workload      | Scrapes
                    v                   v                    v
          +-------------------+   +-----------+   +--------------------+
          | Docker Engine     |   | NGINX LB  |   | Prometheus Server  |
          | daemon (/var/run) |   | (:8080)   |   | (:9090)            |
          +---------+---------+   +-----+-----+   +---------+----------+
                    |                   |                   |
                    | Scales/Monitors   | Routes Requests   | Scrapes
                    v                   v                   v
          +------------------------------------------------------------+
          | Application Container Pool (mars-benchmark-1 .. 4)         |
          | - FastAPI /health, /work (bounded CPU), /metrics           |
          +------------------------------------------------------------+
```

---

## 3. Mathematical & RL Formulation

### State Vector $\mathbf{s}_t \in \mathbb{R}^6$ (Normalized to $[0, 1]$):
1. **Replica Count**: $\bar{N}_t = \frac{N_t - N_{min}}{N_{max} - N_{min}} = \frac{N_t - 1}{3} \in [0, 1]$
2. **CPU Utilization**: $\bar{C}_t = \frac{\text{CPU}\%}{100} \in [0, 1]$
3. **Memory Utilization**: $\bar{M}_t = \frac{\text{Mem}\%}{100} \in [0, 1]$
4. **Request Throughput**: $\bar{\lambda}_t = \min\left(1.0, \frac{\text{RPS}}{200.0}\right) \in [0, 1]$
5. **Response Latency (p95)**: $\bar{L}_t = \min\left(1.0, \frac{L_{p95}}{1.0\text{s}}\right) \in [0, 1]$
6. **Error Rate**: $E_t = \frac{\text{errors}_{5xx}}{\text{total\_requests}} \in [0, 1]$

### Action Space $\mathcal{A} = \{0, 1, 2\}$:
- $a = 0$: **Scale In** (Remove 1 container replica, bounded at $N_{min} = 1$)
- $a = 1$: **Maintain** (Keep current replica count)
- $a = 2$: **Scale Out** (Add 1 container replica, bounded at $N_{max} = 4$)

### Objective & Reward Function:
The reward balances latency SLA adherence, infrastructure cost, service stability, and anti-thrashing penalties:
$$R_t = - w_{lat} \cdot \max(0, L_{p95} - L_{SLA}) - w_{res} \cdot \left(\frac{N_t}{N_{max}}\right) - w_{err} \cdot E_t - w_{act} \cdot \mathbb{I}(a_t \neq 1) - P_{illegal}$$

**Default Hyperparameters:**
- Latency SLA Target: $L_{SLA} = 0.200\text{ s}$ (200 ms)
- Weights: $w_{lat} = 3.0$, $w_{res} = 0.6$, $w_{err} = 10.0$, $w_{act} = 0.2$
- Invalid action penalty (e.g. scale-in when $N=1$, scale-out when $N=4$): $P_{illegal} = 2.0$

### Neural Network Architecture:
- Input: 6 nodes
- Hidden Layer 1: Linear(64) + LayerNorm + ReLU
- Hidden Layer 2: Linear(64) + ReLU
- Output Layer: Linear(3) (Estimated Q-values $Q(s, a)$)
- Optimizer: Adam ($\alpha = 1\times 10^{-3}$)
- Loss: Huber Loss (Smooth L1) with discount factor $\gamma = 0.95$
- Target Network update: Polyak soft updates ($\tau = 0.01$) or hard sync every 50 steps.
- Replay Memory: Capacity 10,000 transitions, min replay size 128, batch size 32.

---

## 4. Phase-Wise Implementation Roadmap

### Phase 1: Environment & Workspace Foundation (Milestone 1)
- [x] Host environment inspected: AMD Ryzen 3 7320U (8 logical cores), 7 GB RAM, Python 3.12.3, Node v24.21.0, Docker CLI 29.9.0.
- [ ] Establish Python virtual environment (`.venv`) with PyTorch (CPU), FastAPI, Uvicorn, Docker SDK, psutil, HTTPX, prometheus-client, NumPy, Pandas.
- [ ] Initialize repository structure (`frontend/`, `backend/`, `benchmark-app/`, `infrastructure/`, `models/`, `results/`, `scripts/`, `docs/`).
- [ ] Verify Docker daemon connectivity (Docker socket active).

### Phase 2: Benchmark App, NGINX & Workload Generator (Milestone 2)
- [ ] **Benchmark Application (`benchmark-app/`)**:
  - FastAPI app with `/health`, `/metrics`, and `/work` (configurable CPU loop with request ID, instance ID, execution duration).
  - Prometheus metrics instrumentation (`http_requests_total`, `http_request_duration_seconds`, `http_active_requests`).
  - Containerized with optimized lightweight `Dockerfile`.
- [ ] **NGINX Reverse Proxy (`infrastructure/nginx/`)**:
  - Configuration with dynamic resolver (`127.0.0.11`) or upstream health-check routing to load balance across active benchmark containers.
- [ ] **Docker Compose Pipeline (`infrastructure/docker-compose.yml`)**:
  - Services: `nginx`, `benchmark-app` (scaleable 1-4), `prometheus`.
- [ ] **Real HTTP Workload Generator (`backend/workload/`)**:
  - Asynchronous HTTPX client with connection pooling.
  - Endpoints/actions: Start, Spike, Reduce, Stop.
  - Rolling metric windows: actual requests/sec, latency percentiles (p50, p95), error counts.
- [ ] **Verification**: Send real traffic through NGINX, verify responses from container IDs, and confirm Prometheus records real traffic.

### Phase 3: Host & Container Telemetry Engine (Milestone 3)
- [ ] **Host Telemetry (`backend/monitoring/host.py`)**:
  - `psutil` sampling with proper two-point delta for initial CPU calculation.
  - CPU usage, memory total/used/free, logical core count, host OS identifier.
- [ ] **Container Telemetry (`backend/monitoring/containers.py`)**:
  - Docker Engine API integration using Python `docker` SDK.
  - Per-container CPU% formula: $\frac{\Delta \text{container\_cpu}}{\Delta \text{system\_cpu}} \times N_{\text{cores}} \times 100\%$.
  - Per-container memory usage, status (`running`, `exited`), health check status.
- [ ] **Application Telemetry (`backend/monitoring/application.py`)**:
  - Scrapes Prometheus `/api/v1/query` for real throughput and latency percentiles.
- [ ] **Verification**: Validate `psutil` and Docker metrics against OS CLI tools (`top`, `docker stats`).

### Phase 4: Safe Docker Scaling Controller (Milestone 5 & Core Control)
- [ ] **Scaling Controller (`backend/scaler/controller.py`)**:
  - Strict replica boundary: $N \in [1, 4]$.
  - Cooldown timer (default: 20s) to prevent thrashing.
  - Scale-Out sequence:
    1. Verify current count $< 4$ and cooldown expired.
    2. Start new container (`docker compose up --scale` or Docker SDK).
    3. Poll container `/health` endpoint until healthy (timeout 25s).
    4. Confirm NGINX routing and verify final replica count.
  - Scale-In sequence:
    1. Verify current count $> 1$ and cooldown expired.
    2. Detach container from load balancer routing.
    3. Allow 2s drain for in-flight requests.
    4. Stop and remove container.
    5. Verify final replica count.
  - Emergency Stop mechanism to freeze all scaling operations instantly.
  - Persistent Scaling Event Log with audit trails.

### Phase 5: FastAPI Control Plane & WebSocket Server (Milestone 4)
- [ ] Complete REST API implementation according to Section 9 of specification:
  - `/api/health`, `/api/metrics/host`, `/api/metrics/containers`, `/api/metrics/application`
  - `/api/containers`, `/api/agent/status`, `/api/events`
  - `/api/workload/start`, `/api/workload/spike`, `/api/workload/reduce`, `/api/workload/stop`
  - `/api/agent/train`, `/api/agent/enable`, `/api/agent/disable`, `/api/scaling/manual`
  - `/api/experiments`, `/api/experiments/export`
- [ ] **WebSocket Server (`/ws/metrics`)**:
  - High-performance asynchronous broadcast loop pushing 1-second snapshots of host, containers, workload, and RL state to all connected dashboard clients.

### Phase 6: DQN Reinforcement Learning & Static Baseline (Milestone 6)
- [ ] **DQN Architecture & Agent (`backend/rl/`)**:
  - PyTorch neural network, experience replay buffer, target network, Bellman updates.
  - Epsilon-greedy exploration schedule with decay.
  - Model serialization and checkpointing in `models/checkpoints/`.
- [ ] **Training & Validation Workflow**:
  - Controlled synthetic workload scenarios for reproducible training.
  - Explicit Untrained Mode protection: autonomous scaling cannot be toggled until validation score passes threshold.
- [ ] **Static Threshold Baseline (`backend/scaler/baseline.py`)**:
  - Classical rule: Scale out if CPU > 75% for 2 ticks; Scale in if CPU < 30% for 3 ticks.
- [ ] **Experiment Harness (`backend/experiments/runner.py`)**:
  - Side-by-side reproducible evaluation under identical workload profiles.
  - Export full telemetry to CSV and JSON in `results/`.

### Phase 7: Next.js Frontend Dashboard (Milestone 7)
- [ ] **Design System & Foundation**:
  - Next.js App Router with TypeScript and Tailwind CSS.
  - Dark cloud-infrastructure aesthetic (deep obsidian `#090d16`, sleek borders, glowing accent badges, Lucide icons, responsive navigation).
- [ ] **Pages**:
  1. `/` (Overview): Live KPIs, host telemetry, active container count, agent mode, latest verified scaling action.
  2. `/monitoring`: Real-time Recharts time series for CPU, Memory, Throughput, Latency, and container table.
  3. `/containers`: Live container health, resource allocation, and manual lifecycle actions.
  4. `/workload`: Live traffic controls (Start, Spike, Reduce, Stop, target RPS, concurrency slider).
  5. `/agent`: DQN state inspection, action-value ($Q$) distribution, reward history, train/validate controls.
  6. `/experiments`: Comparative charts (DQN vs Static Baseline), SLA violation counts, CSV/JSON export buttons.
  7. `/settings`: Configuration of cooldowns, min/max replicas, SLA thresholds, Prometheus URL.
- [ ] Explicit offline/loading/error states for every component; zero mock fallbacks.

### Phase 8: End-to-End Verification & Documentation (Milestone 8)
- [ ] Execute `verify.md` verification checklist against live Docker containers.
- [ ] Automated pytest integration test suite (`tests/`):
  - Workload generator throughput test.
  - Scaling controller scale-out and scale-in verification.
  - DQN step and checkpoint validation test.
  - WebSocket telemetry streaming test.
- [ ] Complete documentation in `docs/` and root `README.md`.

---

## 5. Verification Gateways & Checkpoints

| Phase | Success Verification Criterion |
|---|---|
| **Phase 1** | Python venv ready, Docker daemon responsive, project structure created. |
| **Phase 2** | `curl -s http://localhost:8080/work` returns computed response with valid `instance_id`. Workload generator registers actual HTTP 200s and Prometheus shows increased counters. |
| **Phase 3** | Host CPU/RAM matches `top`/`free`. Container metrics match `docker stats`. |
| **Phase 4** | Scale-out creates actual container; scale-in destroys it; `docker ps` reflects exact replica count; NGINX balances traffic across new replica. |
| **Phase 5** | All 17 REST endpoints respond with valid Pydantic schemas; WebSocket client receives real-time JSON stream. |
| **Phase 6** | DQN model trains on simulated/controlled traffic; weights save to disk; autonomous decisions execute safely; baseline comparison exports to CSV/JSON. |
| **Phase 7** | Next.js dashboard connects via WebSocket, renders live graphs from real data, triggers workload changes, and controls the scaler. |
| **Phase 8** | All 10 steps in `verify.md` pass without mock fallbacks; full pytest suite passes. |
