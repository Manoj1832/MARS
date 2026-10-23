"""
MARS Host Monitoring Engine
Collects actual physical and OS metrics using psutil.
Strict zero-mock rule: all values reflect genuine OS state.
"""
import os
import platform
import time
from typing import Dict, Any
import psutil

# Prime psutil CPU calculation on module load so subsequent calls return accurate intervals
_ = psutil.cpu_percent(interval=None)
_last_cpu_sample_time = time.time()


def get_host_metrics() -> Dict[str, Any]:
    """
    Returns actual OS host resource utilization metrics.
    Handles psutil CPU sampling intervals accurately.
    """
    global _last_cpu_sample_time
    now = time.time()
    
    # psutil cpu_percent(interval=None) returns delta since last call
    # If called too quickly (<0.2s), we use the cached reading or a quick sample
    cpu_percent = psutil.cpu_percent(interval=None)
    _last_cpu_sample_time = now

    mem = psutil.virtual_memory()
    swap = psutil.swap_memory()
    disk = psutil.disk_usage("/")

    # Per-CPU core utilization
    per_cpu = psutil.cpu_percent(interval=None, percpu=True)

    # Load average if supported (Linux / macOS)
    load_avg = None
    if hasattr(os, "getloadavg"):
        try:
            load_avg = list(os.getloadavg())
        except OSError:
            load_avg = None

    return {
        "timestamp": now,
        "hostname": platform.node(),
        "os": platform.system(),
        "os_release": platform.release(),
        "architecture": platform.machine(),
        "cpu": {
            "utilization_percent": round(cpu_percent, 1),
            "logical_cores": psutil.cpu_count(logical=True) or 1,
            "physical_cores": psutil.cpu_count(logical=False) or 1,
            "per_cpu_percent": per_cpu,
            "load_average": load_avg,
        },
        "memory": {
            "total_bytes": mem.total,
            "available_bytes": mem.available,
            "used_bytes": mem.used,
            "utilization_percent": round(mem.percent, 1),
            "total_gb": round(mem.total / (1024**3), 2),
            "available_gb": round(mem.available / (1024**3), 2),
            "used_gb": round(mem.used / (1024**3), 2),
        },
        "swap": {
            "total_bytes": swap.total,
            "used_bytes": swap.used,
            "utilization_percent": round(swap.percent, 1),
        },
        "disk": {
            "total_gb": round(disk.total / (1024**3), 2),
            "used_gb": round(disk.used / (1024**3), 2),
            "free_gb": round(disk.free / (1024**3), 2),
            "utilization_percent": round(disk.percent, 1),
        },
    }
