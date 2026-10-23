"""
MARS Experience Replay Buffer
Stores transition tuples (state, action, reward, next_state, done)
for stable off-policy DQN training.
"""
import random
from collections import deque
from typing import Tuple, List
import numpy as np
import torch


class ReplayBuffer:
    """
    Fixed-capacity circular replay buffer.
    """
    def __init__(self, capacity: int = 10000):
        self.buffer = deque(maxlen=capacity)

    def push(
        self,
        state: np.ndarray,
        action: int,
        reward: float,
        next_state: np.ndarray,
        done: bool,
    ):
        """Append experience transition."""
        self.buffer.append((
            np.array(state, dtype=np.float32),
            int(action),
            float(reward),
            np.array(next_state, dtype=np.float32),
            bool(done),
        ))

    def sample(self, batch_size: int) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor]:
        """Uniformly sample a random batch of transitions."""
        batch = random.sample(self.buffer, batch_size)
        states, actions, rewards, next_states, dones = zip(*batch)

        return (
            torch.FloatTensor(np.array(states)),
            torch.LongTensor(actions),
            torch.FloatTensor(rewards),
            torch.FloatTensor(np.array(next_states)),
            torch.FloatTensor(dones),
        )

    def __len__(self) -> int:
        return len(self.buffer)
