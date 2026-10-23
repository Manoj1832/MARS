# MARS — Complete Real-Time Intelligent Autoscaling System

Act as a senior cloud infrastructure engineer, reinforcement-learning researcher, Python backend developer, and Next.js frontend architect.

Build a complete working research project named **MARS (Multi-Metric Adaptive Reinforcement-learning Scaling)**.

## 1. Primary objective

Create a real-time application autoscaling system that monitors actual machine and application resources, generates real HTTP traffic against a real containerized application, uses a Deep Q-Network (DQN) to choose scaling actions, and creates or removes real Docker containers.

This is a research project based on reinforcement-learning-driven application autoscaling.

**Strict requirements:**
- Do not use mock data, fake metrics, fabricated container states, placeholder charts, simulated scaling events, or hardcoded experimental results.
- Every displayed CPU, memory, latency, request-rate, error-rate, and replica metric must come from actual measurements.
- The workload generator must send real HTTP requests to the benchmark application.
- Scale-out and scale-in must change actual Docker container instances.
- The DQN must produce the actual scaling decisions.
- The backend must verify the outcome of every scaling operation.
- If a metric or service is unavailable, display an explicit unavailable/error state rather than fabricated data.
- Never report a scaling operation as successful before Docker confirms the result and health checks pass.

## 2. Technology stack

Frontend:
- Next.js with App Router
- TypeScript
- Tailwind CSS
- Recharts
- Lucide icons
- WebSocket client for live updates

Backend:
- Python 3.12 where supported
- FastAPI
- Uvicorn
- Pydantic
- HTTPX
- psutil
- NumPy and Pandas

Reinforcement learning:
- PyTorch CPU
- Deep Q-Network
- Experience replay buffer
- Target network
- Epsilon-greedy exploration during controlled training
- Checkpoint saving and loading

Infrastructure:
- Docker Engine
- Docker Compose
- NGINX load balancer
- Prometheus
- prometheus-client

Testing:
- pytest
- Real HTTP integration tests
- Docker lifecycle tests

## 3. Architecture

Implement these components:

1. Next.js dashboard.
2. FastAPI control plane.
3. Cross-platform host monitoring agent.
4. Docker container monitoring.
5. Real benchmark web application.
6. HTTP workload generator.
7. NGINX load balancer.
8. Prometheus metrics collection.
9. Safe Docker scaling controller.
10. DQN agent and training pipeline.
11. Static CPU-threshold baseline.
12. Experiment comparison and CSV/JSON export.

The dashboard must never communicate with the Docker Engine directly. All privileged operations must go through the backend controller.

## 4. Benchmark application

Create a real FastAPI benchmark application with these endpoints:

- GET /health
- GET /work
- GET /metrics

The /work endpoint must perform bounded, configurable CPU-intensive computation and return a real response. Include a request identifier, instance identifier, processing duration, and successful result.

The application must expose genuine request counts, response latency, error counts, and instance identity through Prometheus metrics.

Run multiple instances as Docker containers behind NGINX. Configure NGINX to route requests only to healthy application instances.

Do not use an in-memory application simulator.

## 5. Real workload generator

Implement Start Workload, Trigger Traffic Spike, Reduce Traffic, and Stop Workload controls.

The generator must send actual HTTP requests through NGINX to the benchmark application.

Provide bounded settings for:
- Target requests per second
- Request concurrency
- Spike intensity
- Workload duration

Use asynchronous HTTP requests and collect actual request counts, success/failure counts, throughput, and response latency.

Enforce safe limits to prevent resource exhaustion. Do not generate unlimited traffic.

A traffic button must change the workload generator's real request rate, not directly change the replica count.

## 6. Cross-platform monitoring

Use psutil to measure host CPU utilization, total and available memory, memory utilization, logical CPU count, and host identification.

Support Windows, macOS, and Linux wherever the required OS metrics are available.

Use the Docker Engine API to collect actual container IDs, names, running states, health, CPU usage, and memory usage.

Use Prometheus for application-level metrics.

Clearly distinguish host CPU utilization from per-container CPU utilization.

Use appropriate CPU sampling intervals and handle the first psutil CPU reading correctly.

## 7. DQN agent

Implement a genuine Deep Q-Network with:
- State vector containing current replica count, CPU utilization, memory utilization, request rate, response latency, and error rate.
- Three actions: scale in by one replica, maintain current replicas, and scale out by one replica.
- A neural network with a configurable architecture.
- Experience replay.
- Target network.
- Bellman-target updates.
- Epsilon-greedy exploration during controlled training.
- Model checkpoint saving and loading.
- A documented reward function.

Design a reward function that balances latency violations, resource consumption, errors, and excessive scaling operations.

Normalize inputs, handle unavailable metrics explicitly, and ensure all action decisions obey safety constraints.

Do not claim that an untrained model is intelligent. If a trained checkpoint is unavailable, show that the agent requires training and disable autonomous scaling until the training process has completed validation.

## 8. Safe scaling controller

Implement a Docker scaling controller with:
- Configurable minimum replicas: 1.
- Configurable maximum replicas: 4.
- Cooldown between scaling operations.
- Replica-count validation.
- Container startup timeout.
- Health-check verification.
- Safe removal of an instance.
- Event logging.
- Error handling and rollback or safe recovery where possible.
- Manual emergency stop.
- Explicit distinction between requested, executed, and verified actions.

Scale-out must create a real additional benchmark container and make it available to NGINX only after it becomes healthy.

Scale-in must stop routing new requests to the selected container, allow in-flight requests to finish where feasible, remove the container, and verify the final replica count.

Do not allow the controller to remove the final healthy replica.

Do not expose unrestricted Docker socket access to the frontend or public network.

## 9. FastAPI endpoints

Implement real endpoints for:

- GET /api/health
- GET /api/metrics/host
- GET /api/metrics/containers
- GET /api/metrics/application
- GET /api/containers
- GET /api/agent/status
- POST /api/workload/start
- POST /api/workload/spike
- POST /api/workload/reduce
- POST /api/workload/stop
- POST /api/agent/train
- POST /api/agent/enable
- POST /api/agent/disable
- POST /api/scaling/manual
- GET /api/events
- GET /api/experiments
- GET /api/experiments/export
- WS /ws/metrics

Validate all inputs with Pydantic. Use appropriate error responses and prevent conflicting concurrent scaling operations.

## 10. Next.js dashboard

Build a professional dark cloud-infrastructure dashboard named MARS.

Pages:
- Overview
- Live Monitoring
- Containers
- Workload Control
- DQN Agent
- Experiments
- Settings

Overview:
- Live host CPU utilization.
- Live host memory utilization.
- Application throughput.
- Median and p95 response latency.
- Error rate.
- Actual active container count.
- Current agent status.
- Latest verified scaling event.

Live Monitoring:
- Time-series CPU and memory charts.
- Request throughput and latency charts.
- Container resource table.
- Timestamp of the most recent measurement.

Containers:
- Actual container name and ID.
- Running state and health.
- CPU and memory usage.
- Start time where available.

Workload Control:
- Start Workload.
- Trigger Traffic Spike.
- Reduce Traffic.
- Stop Workload.
- Bounded workload-rate and concurrency settings.
- Current measured request rate.

DQN Agent:
- Loaded model/checkpoint status.
- Training and validation status.
- Current observed state.
- Selected action and action-value estimates.
- Reward and previous verified action outcome.
- Enable/disable controls.

Experiments:
- Compare DQN and static-threshold baseline under identical workload conditions.
- Show actual measured p50/p95 latency, throughput, errors, resource usage, replica count, and scaling operations.
- Export real results as CSV and JSON.
- Clearly identify the workload and experiment configuration.

All charts must use real backend data. Display loading, unavailable, stale, and error states explicitly. Do not populate charts with example values.

## 11. Experiment methodology

Implement a reproducible evaluation workflow.

Run the static-threshold baseline and DQN under the same workload profile and comparable initial conditions.

Record:
- Experiment ID.
- Timestamp.
- Model checkpoint and configuration.
- Workload parameters.
- Metric observations.
- Agent actions.
- Requested and verified scaling outcomes.
- Reward.
- Final performance metrics.

Use controlled training and validation before enabling autonomous scaling.

Do not train through uncontrolled production traffic.

Clearly document the difference between host metrics, container metrics, application metrics, and measured experimental results.

## 12. Project organization

Organize the repository into:
- frontend/
- backend/
- benchmark-app/
- infrastructure/
- models/
- results/
- scripts/
- docs/

Include Dockerfiles, Docker Compose configuration, NGINX configuration, Prometheus configuration, requirements, environment examples, tests, and README instructions.

## 13. Development process

Do not generate the entire project and assume it works.

Work in verified milestones:

Milestone 1: Inspect the environment and verify Docker, Python, Node.js, and npm.

Milestone 2: Build the benchmark application, NGINX, Docker Compose infrastructure, and real HTTP workload generator. Verify actual traffic and container lifecycle changes.

Milestone 3: Implement host/container monitoring and Prometheus metrics. Verify measurements against operating-system and Docker commands.

Milestone 4: Implement the FastAPI control plane and WebSocket streaming.

Milestone 5: Implement safe real Docker scale-out and scale-in. Verify that container counts actually change.

Milestone 6: Implement DQN training, checkpoint validation, and the threshold baseline.

Milestone 7: Build and connect the Next.js dashboard.

Milestone 8: Run integration tests, resolve failures, and document the working system.

After each milestone:
- Run the relevant tests.
- Inspect logs.
- Fix actual errors before proceeding.
- Report which components are genuinely working and which remain incomplete.
- Never claim a test passed unless it was actually executed successfully.

Begin with Milestone 1. Inspect the existing workspace and installed tools before modifying anything. Then implement Milestone 2 and verify real traffic and container operations before building the dashboard.