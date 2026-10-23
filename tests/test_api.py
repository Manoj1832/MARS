"""
Tests for Host Monitoring and Control Plane API
"""
import sys
import os
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, "/home/manoj/Documents/MARS")
from backend.monitoring.host import get_host_metrics
from backend.main import app


def test_host_metrics():
    metrics = get_host_metrics()
    assert "cpu" in metrics
    assert "memory" in metrics
    assert "os" in metrics
    assert metrics["cpu"]["logical_cores"] >= 1
    assert 0.0 <= metrics["cpu"]["utilization_percent"] <= 100.0
    assert metrics["memory"]["total_gb"] > 0.0


@pytest.fixture
def api_client():
    return TestClient(app)


def test_api_health(api_client):
    resp = api_client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"


def test_api_metrics_host(api_client):
    resp = api_client.get("/api/metrics/host")
    assert resp.status_code == 200
    assert "cpu" in resp.json()


def test_api_agent_status(api_client):
    resp = api_client.get("/api/agent/status")
    assert resp.status_code == 200
    data = resp.json()
    assert "is_trained" in data
    assert "last_q_values" in data


def test_api_workload_controls(api_client):
    start_resp = api_client.post("/api/workload/start", json={"target_rps": 10.0, "concurrency": 4, "duration_seconds": 10})
    assert start_resp.status_code == 200

    stop_resp = api_client.post("/api/workload/stop")
    assert stop_resp.status_code == 200
    assert stop_resp.json()["stats"]["status"] == "STOPPED"
