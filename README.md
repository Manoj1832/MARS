# MARS — Multi-Metric Adaptive Reinforcement-learning Scaling

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2016-black.svg)](https://nextjs.org/)
[![PyTorch](https://img.shields.io/badge/RL-PyTorch%20CPU-EE4C2C.svg)](https://pytorch.org/)
[![Docker](https://img.shields.io/badge/Orchestration-Docker%20Compose-2496ED.svg)](https://www.docker.com/)

A real-time, closed-loop cloud autoscaling research platform driven by a Deep Q-Network (DQN) paired with real Docker container lifecycle management, live asynchronous HTTP workload generation, and zero mock data.

---

## Key Features

1. **Strict Zero-Mock Architecture**:
   - Every metric (Host CPU/RAM, Container stats, Throughput, p50/p95 Latency, Error Rate) comes from genuine operating system and Prometheus measurements.
   - Scale-out and scale-in modify actual Docker container instances and are only verified after health checks pass.
2. **Deep Q-Network (DQN) Agent**:
   - 6-dimensional normalized observation vector: `[Replicas, CPU%, Mem%, RPS, Latency_p95, ErrorRate]`.
   - Discrete 3-action space: `[Scale In (-1), Maintain (0), Scale Out (+1)]`.
   - Multi-metric reward function balancing latency SLA targets (200ms), infrastructure footprint, error rates, and anti-flapping penalties.
   - Experience replay buffer (10k transitions) & target network with Huber loss.
   - Explicit untrained protection: autonomous mode cannot be engaged without a validated model checkpoint.
3. **Safe Container Scaling Controller**:
   - Configurable min (1) and max (4) replica boundaries (never terminates the last healthy replica).
   - 20-second anti-flapping cooldown timer.
   - Health check verification before declaring actions successful.
   - Emergency stop safeguard switch.
4. **Real HTTP Workload Generator**:
   - Asynchronous HTTPX client sending genuine requests to `/work` (bounded SHA-256 CPU computation).
   - Real-time Start, Spike (2.5x), Reduce (0.5x), and Stop controls.
5. **Dark Cloud Infrastructure Dashboard**:
   - Next.js (App Router), TypeScript, Tailwind CSS, Recharts, and Lucide icons.
   - Real-time WebSocket streaming at 1.0s tick interval.
   - 7 complete views: Overview, Live Monitoring, Containers, Workload Control, DQN Agent, Experiments, Settings.

---

## Directory Structure

```
MARS/
├── backend/                  # FastAPI Control Plane & RL
│   ├── monitoring/          # Host (psutil), Containers (Docker API), App (Prometheus)
│   ├── scaler/              # Safe Docker Scaling Controller & Static Baseline
│   ├── workload/            # Async HTTP Workload Generator
│   ├── rl/                  # DQN Agent, QNetwork (PyTorch), Replay Buffer
│   ├── experiments/         # Evaluation harness & CSV/JSON export
│   └── main.py              # REST API & WebSocket server
├── benchmark-app/            # Real containerized FastAPI app (/health, /work, /metrics)
│   ├── main.py
│   ├── Dockerfile
│   └── requirements.txt
├── infrastructure/           # Docker Compose, NGINX & Prometheus
│   ├── docker-compose.yml
│   ├── nginx/nginx.conf     # Dynamic DNS load balancing (127.0.0.11)
│   └── prometheus/          # Dynamic Prometheus scraper configuration
├── frontend/                 # Next.js 16 Dark Dashboard (7 pages)
├── models/checkpoints/       # Saved PyTorch model weights & metadata
├── results/                  # Exported benchmark CSV and JSON runs
├── tests/                    # Pytest test suite (13 unit & integration tests)
├── scripts/                  # E2E verification script (verify_e2e.py)
└── docs/                     # Architectural blueprints & implementation plans
```

---

## Quickstart

### 1. Prerequisites
Ensure Docker Engine is running on your host:
```bash
sudo systemctl start docker
```

### 2. Start the Backend Control Plane
```bash
source .venv/bin/activate
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

### 3. Start Infrastructure Containers (Docker Compose)
```bash
docker compose -f infrastructure/docker-compose.yml up -d
```

### 4. Launch Next.js Dashboard
```bash
cd frontend
npm run dev -- -p 3000
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Running Tests & End-to-End Verification

### Run Automated Unit Tests (13 passed):
```bash
.venv/bin/pytest tests/
```

### Run Full Infrastructure Verification Checklist:
```bash
.venv/bin/python scripts/verify_e2e.py
```
This automated script executes all 10 steps from `verify.md`:
1. Connects to Docker daemon
2. Verifies benchmark app container health
3. Routes actual HTTP traffic through NGINX
4. Confirms CPU computation on `/work`
5. Verifies Prometheus metric changes
6. Records before/after container counts
7. Executes controlled scale-out and verifies health checks
8. Executes controlled scale-in and confirms graceful drain
9. Compares container states
10. Validates zero-mock compliance
