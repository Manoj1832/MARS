"""
Unit tests for DQN Agent, ReplayBuffer, QNetwork, and Normalization
"""
import sys
import os
import numpy as np
import pytest
import torch

sys.path.insert(0, "/home/manoj/Documents/MARS")
from backend.rl.model import QNetwork
from backend.rl.replay_buffer import ReplayBuffer
from backend.rl.agent import DQNAgent, normalize_state, compute_reward


def test_qnetwork_forward():
    net = QNetwork(state_dim=6, action_dim=3, hidden_dim=32)
    dummy_input = torch.randn(4, 6)
    out = net(dummy_input)
    assert out.shape == (4, 3)


def test_state_normalization():
    state = normalize_state(
        replica_count=2,
        cpu_percent=60.0,
        memory_percent=40.0,
        throughput_rps=50.0,
        latency_p95_ms=100.0,
        error_rate=0.01,
        min_replicas=1,
        max_replicas=4,
    )
    assert len(state) == 6
    assert np.all(state >= 0.0)
    assert np.all(state <= 1.0)


def test_reward_function():
    r_normal = compute_reward(latency_p95_ms=100.0, replica_count=2, error_rate=0.0, action=1)
    r_bad_lat = compute_reward(latency_p95_ms=500.0, replica_count=2, error_rate=0.0, action=1)
    # Violating latency SLA should result in worse reward
    assert r_bad_lat < r_normal

    r_illegal = compute_reward(latency_p95_ms=100.0, replica_count=4, error_rate=0.0, action=2, illegal_action=True)
    assert r_illegal < r_normal


def test_replay_buffer():
    buf = ReplayBuffer(capacity=100)
    s = np.zeros(6, dtype=np.float32)
    for i in range(10):
        buf.push(s, 1, -0.5, s, False)
    assert len(buf) == 10

    states, actions, rewards, next_states, dones = buf.sample(4)
    assert states.shape == (4, 6)
    assert actions.shape == (4,)
    assert rewards.shape == (4,)


def test_agent_training_step(tmp_path):
    agent = DQNAgent(state_dim=6, action_dim=3, checkpoint_dir=str(tmp_path))
    s = np.random.uniform(0, 1, 6).astype(np.float32)
    # Populate buffer
    for _ in range(70):
        agent.replay_buffer.push(s, 1, -0.2, s, False)

    loss = agent.update(batch_size=32)
    assert loss is not None
    assert loss >= 0.0

    # Save & load checkpoint
    chk_path = agent.save_checkpoint("test_chk.pt")
    assert os.path.exists(chk_path)
    loaded = agent.load_checkpoint("test_chk.pt")
    assert loaded is True
