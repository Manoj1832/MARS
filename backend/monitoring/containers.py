"""
MARS Container Monitoring Engine
Queries Docker Engine API for active benchmark-app containers.
Computes real CPU% and Memory from container stats.
Includes non-blocking cache with auto-reconnection and zero mock fallbacks.
"""
import time
from typing import Dict, Any, List, Optional
import docker
from docker.errors import DockerException

_docker_client: Optional[docker.DockerClient] = None
_cached_metrics: Optional[Dict[str, Any]] = None
_last_cache_time: float = 0.0
_cache_ttl: float = 1.0  # Cache for 1 second to avoid hammering Docker Engine API


def get_docker_client() -> Optional[docker.DockerClient]:
    """Returns cached Docker client or attempts to initialize one."""
    global _docker_client
    if _docker_client is None:
        try:
            _docker_client = docker.from_env(timeout=5)
            _docker_client.ping()
        except Exception:
            _docker_client = None
    return _docker_client


def _calculate_cpu_percent(stats: dict) -> float:
    """
    Computes genuine container CPU% from Docker container stats dictionary.
    Formula: (cpu_delta / system_delta) * online_cpus * 100.0
    """
    try:
        cpu_stats = stats.get("cpu_stats", {})
        precpu_stats = stats.get("precpu_stats", {})

        cpu_usage = cpu_stats.get("cpu_usage", {}).get("total_usage", 0)
        precpu_usage = precpu_stats.get("cpu_usage", {}).get("total_usage", 0)
        cpu_delta = cpu_usage - precpu_usage

        system_cpu = cpu_stats.get("system_cpu_usage", 0)
        system_precpu = precpu_stats.get("system_cpu_usage", 0)
        system_delta = system_cpu - system_precpu

        online_cpus = cpu_stats.get("online_cpus")
        if not online_cpus:
            percpu = cpu_stats.get("cpu_usage", {}).get("percpu_usage")
            online_cpus = len(percpu) if percpu else 1

        if system_delta > 0 and cpu_delta > 0:
            return round((cpu_delta / system_delta) * online_cpus * 100.0, 2)
        return 0.0
    except Exception:
        return 0.0


def get_container_metrics(
    label_filter: str = "mars.service=benchmark-app",
    force_refresh: bool = False
) -> Dict[str, Any]:
    """
    Returns actual telemetry for all benchmark containers.
    Utilizes a 1-second cache to prevent socket congestion on frequent WebSocket ticks.
    Auto-reconnects if Docker socket is briefly disrupted.
    """
    global _docker_client, _cached_metrics, _last_cache_time
    now = time.time()

    if not force_refresh and _cached_metrics is not None and (now - _last_cache_time) < _cache_ttl:
        return _cached_metrics

    client = get_docker_client()
    if client is None:
        _cached_metrics = {
            "available": False,
            "error": "Docker daemon is unreachable. Verify Docker service is running.",
            "containers": [],
            "total_count": 0,
            "healthy_count": 0,
            "timestamp": now,
        }
        return _cached_metrics

    try:
        # Check daemon responsiveness
        try:
            client.ping()
        except Exception:
            _docker_client = None
            client = get_docker_client()
            if client is None:
                raise DockerException("Docker daemon ping failed")

        # Query managed containers
        containers = client.containers.list(
            all=True,
            filters={"label": label_filter}
        )

        results: List[Dict[str, Any]] = []
        healthy_count = 0

        for c in containers:
            status = c.status  # running, exited, etc.
            health_status = "none"
            if "Health" in c.attrs.get("State", {}):
                health_status = c.attrs["State"]["Health"].get("Status", "unknown")
                if health_status == "healthy":
                    healthy_count += 1
            elif status == "running":
                health_status = "running"
                healthy_count += 1

            cpu_pct = 0.0
            mem_used_bytes = 0
            mem_limit_bytes = 0
            mem_pct = 0.0

            if status == "running":
                try:
                    stats = c.stats(stream=False)
                    cpu_pct = _calculate_cpu_percent(stats)
                    mem_stats = stats.get("memory_stats", {})
                    mem_used_bytes = mem_stats.get("usage", 0) - mem_stats.get("stats", {}).get("cache", 0)
                    mem_limit_bytes = mem_stats.get("limit", 1)
                    if mem_limit_bytes > 0:
                        mem_pct = round((mem_used_bytes / mem_limit_bytes) * 100.0, 2)
                except Exception:
                    # Keep container in list with 0% CPU if stats timed out, rather than crashing the whole call
                    pass

            results.append({
                "id": c.short_id,
                "full_id": c.id,
                "name": c.name,
                "status": status,
                "health": health_status,
                "created": c.attrs.get("Created"),
                "cpu_percent": cpu_pct,
                "memory_used_bytes": mem_used_bytes,
                "memory_used_mb": round(mem_used_bytes / (1024**2), 2),
                "memory_limit_mb": round(mem_limit_bytes / (1024**2), 2),
                "memory_percent": mem_pct,
                "ip_address": c.attrs.get("NetworkSettings", {}).get("Networks", {}).get("infrastructure_mars-net", {}).get("IPAddress", ""),
            })

        _cached_metrics = {
            "available": True,
            "error": None,
            "containers": results,
            "total_count": len(results),
            "running_count": sum(1 for c in results if c["status"] == "running"),
            "healthy_count": healthy_count,
            "timestamp": now,
        }
        _last_cache_time = now
        return _cached_metrics

    except Exception as exc:
        _docker_client = None  # Reset client so next call reconnects cleanly
        _cached_metrics = {
            "available": False,
            "error": f"Failed querying Docker containers: {str(exc)}",
            "containers": [],
            "total_count": 0,
            "healthy_count": 0,
            "timestamp": now,
        }
        return _cached_metrics
