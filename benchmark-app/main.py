"""
MARS Benchmark Application
A real FastAPI application that performs bounded CPU-intensive work,
exposes Prometheus metrics, and provides health checks.
"""
import hashlib
import os
import time
import uuid

from fastapi import FastAPI, Response
from prometheus_client import (
    Counter,
    Gauge,
    Histogram,
    generate_latest,
    CONTENT_TYPE_LATEST,
)

INSTANCE_ID = os.environ.get("INSTANCE_ID", f"benchmark-{uuid.uuid4().hex[:8]}")
WORK_ITERATIONS = int(os.environ.get("WORK_ITERATIONS", "50000"))

app = FastAPI(title="MARS Benchmark", version="1.0.0")

# ── Prometheus Metrics ────────────────────────────────────────────────
REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status", "instance"],
)
REQUEST_DURATION = Histogram(
    "http_request_duration_seconds",
    "Request latency in seconds",
    ["method", "endpoint", "instance"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0),
)
ACTIVE_REQUESTS = Gauge(
    "http_active_requests",
    "Number of in-flight requests",
    ["instance"],
)
ERROR_COUNT = Counter(
    "http_errors_total",
    "Total HTTP errors (5xx)",
    ["instance"],
)

startup_time = time.time()


# ── Endpoints ─────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    """Health check — returns instance identity and uptime."""
    return {
        "status": "healthy",
        "instance_id": INSTANCE_ID,
        "uptime_seconds": round(time.time() - startup_time, 2),
    }


@app.get("/work")
async def work():
    """
    Perform bounded CPU-intensive computation.
    Hashes a nonce WORK_ITERATIONS times (default 50 000).
    Returns the real request ID, instance ID, processing duration, and result digest.
    """
    request_id = uuid.uuid4().hex
    ACTIVE_REQUESTS.labels(instance=INSTANCE_ID).inc()
    start = time.time()

    try:
        # Bounded CPU work: iterative SHA-256 hashing
        digest = request_id.encode()
        for _ in range(WORK_ITERATIONS):
            digest = hashlib.sha256(digest).digest()

        duration = time.time() - start
        REQUEST_COUNT.labels(
            method="GET", endpoint="/work", status="200", instance=INSTANCE_ID
        ).inc()
        REQUEST_DURATION.labels(
            method="GET", endpoint="/work", instance=INSTANCE_ID
        ).observe(duration)

        return {
            "request_id": request_id,
            "instance_id": INSTANCE_ID,
            "processing_duration_ms": round(duration * 1000, 2),
            "result_digest": digest.hex()[:16],
            "iterations": WORK_ITERATIONS,
        }
    except Exception as exc:
        ERROR_COUNT.labels(instance=INSTANCE_ID).inc()
        REQUEST_COUNT.labels(
            method="GET", endpoint="/work", status="500", instance=INSTANCE_ID
        ).inc()
        raise exc
    finally:
        ACTIVE_REQUESTS.labels(instance=INSTANCE_ID).dec()


@app.get("/metrics")
async def metrics():
    """Expose Prometheus metrics in text format."""
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST,
    )
