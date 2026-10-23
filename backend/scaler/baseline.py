"""
MARS Static CPU-Threshold Baseline Scaler
Standard industrial threshold rule:
- Scale Out if average CPU > upper_threshold (default 75%) for 2 consecutive intervals.
- Scale In if average CPU < lower_threshold (default 30%) for 3 consecutive intervals.
Respects identical min/max boundaries and cooldowns for fair comparison against DQN.
"""
from typing import Dict, Any, List


class StaticThresholdScaler:
    def __init__(
        self,
        upper_threshold: float = 75.0,
        lower_threshold: float = 30.0,
        scale_out_consecutive: int = 2,
        scale_in_consecutive: int = 3,
    ):
        self.upper_threshold = upper_threshold
        self.lower_threshold = lower_threshold
        self.scale_out_consecutive = scale_out_consecutive
        self.scale_in_consecutive = scale_in_consecutive

        self.high_cpu_count = 0
        self.low_cpu_count = 0

    def evaluate(self, cpu_percent: float, current_replicas: int, min_replicas: int = 1, max_replicas: int = 4) -> int:
        """
        Returns action:
        0: Scale In
        1: Maintain
        2: Scale Out
        """
        if cpu_percent >= self.upper_threshold:
            self.high_cpu_count += 1
            self.low_cpu_count = 0
            if self.high_cpu_count >= self.scale_out_consecutive:
                self.high_cpu_count = 0
                if current_replicas < max_replicas:
                    return 2  # Scale Out
        elif cpu_percent <= self.lower_threshold:
            self.low_cpu_count += 1
            self.high_cpu_count = 0
            if self.low_cpu_count >= self.scale_in_consecutive:
                self.low_cpu_count = 0
                if current_replicas > min_replicas:
                    return 0  # Scale In
        else:
            self.high_cpu_count = 0
            self.low_cpu_count = 0

        return 1  # Maintain


baseline_scaler = StaticThresholdScaler()
