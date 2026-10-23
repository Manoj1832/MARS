"""
Unit tests for MARS Benchmark Application
"""
import sys
import os
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, "/home/manoj/Documents/MARS/benchmark-app")
from main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_benchmark_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert "instance_id" in data
    assert "uptime_seconds" in data


def test_benchmark_work(client):
    resp = client.get("/work")
    assert resp.status_code == 200
    data = resp.json()
    assert "request_id" in data
    assert "instance_id" in data
    assert "processing_duration_ms" in data
    assert "result_digest" in data
    assert data["processing_duration_ms"] >= 0.0


def test_benchmark_metrics(client):
    resp = client.get("/metrics")
    assert resp.status_code == 200
    assert "http_requests_total" in resp.text
