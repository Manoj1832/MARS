"""
MARS Real HTTP Workload Generator
Sends actual asynchronous HTTP requests through NGINX to the benchmark application.
Collects real request counts, success/failure counts, throughput, and response latency.
Zero mock data: all stats come from genuine HTTP responses.
"""
import asyncio
import time
from collections import deque
from typing import Dict, Any, List, Optional
import httpx


class WorkloadGenerator:
    """
    Asynchronous workload generator with bounded concurrency and request rate.
    """
    def __init__(self, target_url: str = "http://localhost:8080/work"):
        self.target_url = target_url
        self.status = "STOPPED"  # STOPPED, RUNNING, SPIKE
        self.target_rps = 20.0
        self.concurrency = 8
        self.duration_seconds = 120
        self.base_rps = 20.0

        # Safety boundaries
        self.MIN_RPS = 1.0
        self.MAX_RPS = 250.0
        self.MIN_CONCURRENCY = 1
        self.MAX_CONCURRENCY = 40

        # Live telemetry counters
        self.start_time: Optional[float] = None
        self.total_requests = 0
        self.successful_requests = 0
        self.failed_requests = 0
        self.timeout_requests = 0

        # Rolling window for instantaneous RPS and latency (last 10 seconds)
        self._recent_events: deque = deque(maxlen=2000)
        self._task: Optional[asyncio.Task] = None
        self._stop_event = asyncio.Event()

    def get_stats(self) -> Dict[str, Any]:
        """Returns measured real-time telemetry from actual HTTP traffic."""
        now = time.time()
        # Clean rolling events older than 10 seconds
        cutoff = now - 10.0
        while self._recent_events and self._recent_events[0][0] < cutoff:
            self._recent_events.popleft()

        window_count = len(self._recent_events)
        measured_rps = round(window_count / 10.0, 1) if self.status != "STOPPED" else 0.0

        latencies = [ev[1] for ev in self._recent_events if ev[2] == 200]
        latencies.sort()

        p50 = 0.0
        p95 = 0.0
        if latencies:
            p50 = round(latencies[int(len(latencies) * 0.50)] * 1000, 2)
            p95 = round(latencies[int(len(latencies) * 0.95)] * 1000, 2)

        elapsed = round(now - self.start_time, 1) if self.start_time else 0.0

        return {
            "status": self.status,
            "target_rps": self.target_rps,
            "concurrency": self.concurrency,
            "measured_rps": measured_rps,
            "p50_latency_ms": p50,
            "p95_latency_ms": p95,
            "total_requests": self.total_requests,
            "successful_requests": self.successful_requests,
            "failed_requests": self.failed_requests,
            "timeout_requests": self.timeout_requests,
            "elapsed_seconds": elapsed,
            "duration_seconds": self.duration_seconds,
            "target_url": self.target_url,
        }

    async def _worker(self, client: httpx.AsyncClient, interval: float):
        """Worker loop sending requests at paced interval."""
        while not self._stop_event.is_set():
            req_start = time.time()
            status_code = 0
            latency = 0.0
            try:
                self.total_requests += 1
                resp = await client.get(self.target_url, timeout=4.0)
                status_code = resp.status_code
                latency = time.time() - req_start
                if status_code == 200:
                    self.successful_requests += 1
                else:
                    self.failed_requests += 1
            except httpx.TimeoutException:
                latency = time.time() - req_start
                self.timeout_requests += 1
                self.failed_requests += 1
                status_code = 504
            except Exception:
                latency = time.time() - req_start
                self.failed_requests += 1
                status_code = 500

            self._recent_events.append((time.time(), latency, status_code))

            # Sleep to match paced rate
            sleep_time = interval - (time.time() - req_start)
            if sleep_time > 0:
                await asyncio.sleep(sleep_time)
            else:
                await asyncio.sleep(0.005)

    async def _run_loop(self):
        """Main coordinator orchestrating concurrent workers."""
        try:
            limits = httpx.Limits(max_keepalive_connections=50, max_connections=100)
            async with httpx.AsyncClient(limits=limits) as client:
                workers = []
                # Pacing interval per worker: concurrency / target_rps
                interval = max(0.01, self.concurrency / self.target_rps)
                for _ in range(self.concurrency):
                    w = asyncio.create_task(self._worker(client, interval))
                    workers.append(w)

                # Wait until stopped or duration expires
                end_time = time.time() + self.duration_seconds
                while not self._stop_event.is_set() and time.time() < end_time:
                    await asyncio.sleep(0.5)

                self._stop_event.set()
                for w in workers:
                    w.cancel()
                await asyncio.gather(*workers, return_exceptions=True)
        finally:
            self.status = "STOPPED"

    def start(self, target_rps: float = 20.0, concurrency: int = 8, duration_seconds: int = 120):
        """Start sending genuine HTTP workload."""
        if self.status != "STOPPED":
            self.stop()

        self.target_rps = max(self.MIN_RPS, min(self.MAX_RPS, target_rps))
        self.concurrency = max(self.MIN_CONCURRENCY, min(self.MAX_CONCURRENCY, concurrency))
        self.duration_seconds = max(5, min(1800, duration_seconds))
        self.base_rps = self.target_rps

        self.total_requests = 0
        self.successful_requests = 0
        self.failed_requests = 0
        self.timeout_requests = 0
        self._recent_events.clear()

        self.start_time = time.time()
        self.status = "RUNNING"
        self._stop_event.clear()
        self._task = asyncio.create_task(self._run_loop())
        return self.get_stats()

    def spike(self, multiplier: float = 2.5):
        """Trigger an instantaneous traffic spike on the generator."""
        if self.status == "STOPPED":
            return self.start(target_rps=50.0, concurrency=16)

        new_rps = min(self.MAX_RPS, self.target_rps * multiplier)
        self.target_rps = new_rps
        self.concurrency = min(self.MAX_CONCURRENCY, int(self.concurrency * 1.8))
        self.status = "SPIKE"
        # Restart loop with new pacing
        self._stop_event.set()
        if self._task and not self._task.done():
            self._task.cancel()
        self._stop_event = asyncio.Event()
        self._task = asyncio.create_task(self._run_loop())
        return self.get_stats()

    def reduce(self, factor: float = 0.5):
        """Reduce traffic intensity."""
        if self.status == "STOPPED":
            return self.get_stats()

        new_rps = max(self.MIN_RPS, self.target_rps * factor)
        self.target_rps = new_rps
        self.concurrency = max(self.MIN_CONCURRENCY, int(self.concurrency * factor))
        self.status = "RUNNING"
        self._stop_event.set()
        if self._task and not self._task.done():
            self._task.cancel()
        self._stop_event = asyncio.Event()
        self._task = asyncio.create_task(self._run_loop())
        return self.get_stats()

    def stop(self):
        """Stop sending traffic."""
        self._stop_event.set()
        if self._task and not self._task.done():
            self._task.cancel()
        self.status = "STOPPED"
        return self.get_stats()


# Global instance
generator = WorkloadGenerator()
