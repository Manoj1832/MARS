"""
MARS Deep Q-Network Agent
Implements action selection (epsilon-greedy), Bellman updates, target network sync,
state normalization, documented multi-metric reward calculation, and checkpoint persistence.
Strict rule: Autonomous mode is disabled unless a trained checkpoint is verified.
"""
import copy
import json
import os
import random
import time
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim

from .model import QNetwork
from .replay_buffer import ReplayBuffer

ACTION_NAMES = {
    0: "SCALE_IN",
    1: "MAINTAIN",
    2: "SCALE_OUT",
}


def normalize_state(
    replica_count: int,
    cpu_percent: float,
    memory_percent: float,
    throughput_rps: float,
    latency_p95_ms: float,
    error_rate: float,
    min_replicas: int = 1,
    max_replicas: int = 4,
) -> np.ndarray:
    """
    Normalizes raw system metrics into a [0, 1] bounded feature vector.
    Indices:
    0: Normalized replica count [min, max] -> [0, 1]
    1: CPU utilization [0, 100]% -> [0, 1]
    2: Memory utilization [0, 100]% -> [0, 1]
    3: Throughput [0, 200] RPS -> [0, 1]
    4: Latency p95 [0, 1000] ms -> [0, 1]
    5: Error rate [0, 1] -> [0, 1]
    """
    norm_replicas = (replica_count - min_replicas) / max(1, (max_replicas - min_replicas))
    norm_cpu = max(0.0, min(100.0, cpu_percent)) / 100.0
    norm_mem = max(0.0, min(100.0, memory_percent)) / 100.0
    norm_rps = max(0.0, min(200.0, throughput_rps)) / 200.0
    norm_lat = max(0.0, min(1000.0, latency_p95_ms)) / 1000.0
    norm_err = max(0.0, min(1.0, error_rate))

    return np.array([
        norm_replicas,
        norm_cpu,
        norm_mem,
        norm_rps,
        norm_lat,
        norm_err,
    ], dtype=np.float32)


def compute_reward(
    latency_p95_ms: float,
    replica_count: int,
    error_rate: float,
    action: int,
    sla_latency_ms: float = 200.0,
    max_replicas: int = 4,
    illegal_action: bool = False,
) -> float:
    """
    Documented Multi-Metric Reward Function:
    R = - w_lat * max(0, lat - sla) - w_res * (replicas / max_replicas) - w_err * err - w_act * I(action != 1) - P_illegal
    """
    if illegal_action:
        return -2.5

    # Latency violation penalty: normalized penalty for exceeding 200ms
    lat_violation = max(0.0, (latency_p95_ms - sla_latency_ms) / 100.0)
    w_lat = 2.5 * lat_violation

    # Resource overprovisioning cost
    w_res = 0.6 * (replica_count / max_replicas)

    # Error penalty
    w_err = 8.0 * max(0.0, min(1.0, error_rate))

    # Anti-flapping penalty (slight cost for changing replica state)
    w_act = 0.2 if action != 1 else 0.0

    reward = -(w_lat + w_res + w_err + w_act)
    # Scale to reasonable range around [-5, 0]
    return round(float(reward), 4)


class DQNAgent:
    """
    Deep Q-Network Agent for intelligent application autoscaling.
    """
    def __init__(
        self,
        state_dim: int = 6,
        action_dim: int = 3,
        lr: float = 1e-3,
        gamma: float = 0.95,
        epsilon_start: float = 1.0,
        epsilon_end: float = 0.05,
        epsilon_decay: float = 0.995,
        target_update_freq: int = 50,
        checkpoint_dir: str = "/home/manoj/Documents/MARS/models/checkpoints",
    ):
        self.state_dim = state_dim
        self.action_dim = action_dim
        self.gamma = gamma
        self.epsilon = epsilon_start
        self.epsilon_start = epsilon_start
        self.epsilon_end = epsilon_end
        self.epsilon_decay = epsilon_decay
        self.target_update_freq = target_update_freq
        self.checkpoint_dir = checkpoint_dir
        os.makedirs(checkpoint_dir, exist_ok=True)

        # PyTorch CPU networks
        self.q_net = QNetwork(state_dim, action_dim)
        self.target_net = copy.deepcopy(self.q_net)
        self.target_net.eval()

        self.optimizer = optim.Adam(self.q_net.parameters(), lr=lr)
        self.criterion = nn.SmoothL1Loss()  # Huber loss
        self.replay_buffer = ReplayBuffer(capacity=10000)

        # Operational status
        self.is_trained: bool = False
        self.autonomous_enabled: bool = False
        self.train_step_count: int = 0
        self.last_loss: float = 0.0
        self.last_q_values: List[float] = [0.0, 0.0, 0.0]
        self.last_action: int = 1
        self.last_reward: float = 0.0
        self.last_state: Optional[np.ndarray] = None
        self.training_history: List[Dict[str, Any]] = []

    def get_status(self) -> Dict[str, Any]:
        """Returns agent operational status, metrics, and Q-values."""
        return {
            "is_trained": self.is_trained,
            "autonomous_enabled": self.autonomous_enabled,
            "epsilon": round(self.epsilon, 4),
            "train_steps": self.train_step_count,
            "buffer_size": len(self.replay_buffer),
            "last_loss": round(self.last_loss, 4),
            "last_q_values": [round(q, 3) for q in self.last_q_values],
            "last_action": self.last_action,
            "last_action_name": ACTION_NAMES.get(self.last_action, "UNKNOWN"),
            "last_reward": self.last_reward,
            "last_state": [round(float(s), 3) for s in self.last_state] if self.last_state is not None else [],
        }

    def select_action(self, state: np.ndarray, evaluate: bool = False) -> Tuple[int, List[float]]:
        """
        Choose action using epsilon-greedy policy (training) or greedy (evaluation).
        """
        state_tensor = torch.FloatTensor(state).unsqueeze(0)
        with torch.no_grad():
            q_values = self.q_net(state_tensor).squeeze(0).tolist()

        self.last_q_values = q_values

        # Exploration vs exploitation
        if not evaluate and random.random() < self.epsilon:
            action = random.randint(0, self.action_dim - 1)
        else:
            action = int(np.argmax(q_values))

        self.last_action = action
        return action, q_values

    def update(self, batch_size: int = 32) -> Optional[float]:
        """Sample batch from replay buffer and perform Bellman gradient update."""
        if len(self.replay_buffer) < max(batch_size, 64):
            return None

        states, actions, rewards, next_states, dones = self.replay_buffer.sample(batch_size)

        # Current Q-values: Q(s, a)
        q_vals = self.q_net(states).gather(1, actions.unsqueeze(1)).squeeze(1)

        # Target Q-values: r + gamma * max_a' Q_target(s', a') * (1 - done)
        with torch.no_grad():
            next_q_vals = self.target_net(next_states).max(1)[0]
            targets = rewards + (self.gamma * next_q_vals * (1.0 - dones))

        loss = self.criterion(q_vals, targets)

        self.optimizer.zero_grad()
        loss.backward()
        nn.utils.clip_grad_norm_(self.q_net.parameters(), max_norm=10.0)
        self.optimizer.step()

        self.train_step_count += 1
        self.last_loss = float(loss.item())

        # Update target network periodically
        if self.train_step_count % self.target_update_freq == 0:
            self.target_net.load_state_dict(self.q_net.state_dict())

        # Epsilon decay
        if self.epsilon > self.epsilon_end:
            self.epsilon = max(self.epsilon_end, self.epsilon * self.epsilon_decay)

        return self.last_loss

    def save_checkpoint(self, filename: str = "mars_dqn_latest.pt") -> str:
        """Save PyTorch model weights and training metadata."""
        filepath = os.path.join(self.checkpoint_dir, filename)
        torch.save({
            "q_net_state": self.q_net.state_dict(),
            "target_net_state": self.target_net.state_dict(),
            "optimizer_state": self.optimizer.state_dict(),
            "train_steps": self.train_step_count,
            "epsilon": self.epsilon,
            "is_trained": self.is_trained,
            "timestamp": time.time(),
        }, filepath)

        # Accompanying metadata JSON
        meta_path = filepath.replace(".pt", ".json")
        with open(meta_path, "w") as f:
            json.dump({
                "filename": filename,
                "train_steps": self.train_step_count,
                "is_trained": self.is_trained,
                "epsilon": self.epsilon,
                "timestamp": time.time(),
            }, f, indent=2)

        return filepath

    def load_checkpoint(self, filename: str = "mars_dqn_latest.pt") -> bool:
        """Load model weights from checkpoint."""
        filepath = os.path.join(self.checkpoint_dir, filename)
        if not os.path.isfile(filepath):
            return False

        checkpoint = torch.load(filepath, map_location="cpu")
        self.q_net.load_state_dict(checkpoint["q_net_state"])
        self.target_net.load_state_dict(checkpoint["target_net_state"])
        self.optimizer.load_state_dict(checkpoint["optimizer_state"])
        self.train_step_count = checkpoint.get("train_steps", 0)
        self.epsilon = checkpoint.get("epsilon", self.epsilon_end)
        self.is_trained = checkpoint.get("is_trained", True)
        return True


# Global agent instance
agent = DQNAgent()
