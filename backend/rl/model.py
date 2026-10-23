"""
MARS Deep Q-Network Architecture
PyTorch CPU implementation of the Q-function approximator.
"""
import torch
import torch.nn as nn


class QNetwork(nn.Module):
    """
    Multilayer Perceptron representing action-value function Q(s, a).
    Input: state vector of dimension 6
    Output: Q-values for 3 discrete actions (scale-in, maintain, scale-out)
    """
    def __init__(self, state_dim: int = 6, action_dim: int = 3, hidden_dim: int = 64):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(state_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, action_dim),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)
