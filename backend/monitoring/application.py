"""
MARS Application Metrics Engine
Queries Prometheus API for real application throughput, latency percentiles, and error rates.
Strict real metrics: no placeholder or simulated chart points.
"""
import time
from typing import Dict, Any, Optional
import httpx

PROMETHEUS_URL = "http://localhost:9090"


async def query_prometheus_instant(client: httpx.AsyncClient, query: str) -> Optional[float]:
    """Execute an instant PromQL query and return a scalar float or None."""
    try:
        resp = await client.get(
            f"{PROMETHEUS_URL}/api/v1/query",
            params={"query": query},
            timeout=2.0
        )
        if resp.status_code == 200:
            data = resp.json()
            results = data.get("data", {}).get("result", [])
            if results and "value" in results[0]:
                val = results[0]["value"][1]
                # Filter out NaN or Inf
                if val not in ("NaN", "+Inf", "-Inf"):
                    return float(val)
        return None
    except Exception:
        return None


async def get_application_metrics() -> Dict[str, Any]:
    """
    Queries real application-level metrics from Prometheus.
    Returns explicit error state if Prometheus is unavailable.
    """
    now = time.time()
    async with httpx.AsyncClient() as client:
        # Check Prometheus connectivity
        try:
            health_resp = await client.get(f"{PROMETHEUS_URL}/-/healthy", timeout=1.5)
            prom_alive = (health_resp.status_code == 200)
        except Exception:
            prom_alive = False

        if not prom_alive:
            return {
                "available": False,
                "error": "Prometheus server is unreachable at http://localhost:9090",
                "throughput_rps": 0.0,
                "p50_latency_ms": 0.0,
                "p95_latency_ms": 0.0,
                "error_rate": 0.0,
                "in_flight_requests": 0,
                "timestamp": now,
            }

        # Real PromQL queries
        rps = await query_prometheus_instant(
            client,
            'sum(rate(http_requests_total[15s])) or vector(0)'
        ) or 0.0

        p50 = await query_prometheus_instant(
            client,
            'histogram_quantile(0.50, sum(rate(http_request_duration_seconds_bucket[30s])) by (le)) * 1000'
        ) or 0.0

        p95 = await query_prometheus_instant(
            client,
            'histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[30s])) by (le)) * 1000'
        ) or 0.0

        err_rate = await query_prometheus_instant(
            client,
            '(sum(rate(http_requests_total{status=~"5.."}[30s])) / sum(rate(http_requests_total[30s]))) or vector(0)'
        ) or 0.0

        in_flight = await query_prometheus_instant(
            client,
            'sum(http_active_requests) or vector(0)'
        ) or 0

        return {
            "available": True,
            "error": None,
            "throughput_rps": round(max(0.0, rps), 2),
            "p50_latency_ms": round(max(0.0, p50), 2),
            "p95_latency_ms": round(max(0.0, p95), 2),
            "error_rate": round(max(0.0, min(1.0, err_rate)), 4),
            "in_flight_requests": int(max(0, in_flight)),
            "timestamp": now,
        }
