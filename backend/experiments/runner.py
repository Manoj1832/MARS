"""
MARS Experiment Evaluation Engine
Executes controlled benchmark runs comparing DQN vs. Static Baseline
under identical synthetic workload profiles.
Exports reproducible results to CSV and JSON.
"""
import asyncio
import csv
import json
import os
import time
import uuid
from typing import Dict, Any, List, Optional
import pandas as pd


class ExperimentRunner:
    def __init__(self, results_dir: str = "/home/manoj/Documents/MARS/results"):
        self.results_dir = results_dir
        os.makedirs(results_dir, exist_ok=True)
        self.active_experiment: Optional[Dict[str, Any]] = None
        self.completed_experiments: List[Dict[str, Any]] = []

    def get_experiments(self) -> List[Dict[str, Any]]:
        """List summary of all completed experiments."""
        return self.completed_experiments

    def export_experiment(self, experiment_id: str, format: str = "json") -> Optional[str]:
        """Export experiment data as JSON or CSV file path."""
        for exp in self.completed_experiments:
            if exp["id"] == experiment_id:
                if format == "json":
                    path = os.path.join(self.results_dir, f"{experiment_id}.json")
                    with open(path, "w") as f:
                        json.dump(exp, f, indent=2)
                    return path
                elif format == "csv":
                    path = os.path.join(self.results_dir, f"{experiment_id}.csv")
                    records = exp.get("telemetry_log", [])
                    if records:
                        df = pd.DataFrame(records)
                        df.to_csv(path, index=False)
                        return path
        return None

    def record_completed(self, experiment_data: Dict[str, Any]):
        """Save completed run and dump JSON."""
        self.completed_experiments.append(experiment_data)
        path = os.path.join(self.results_dir, f"{experiment_data['id']}.json")
        with open(path, "w") as f:
            json.dump(experiment_data, f, indent=2)


experiment_runner = ExperimentRunner()
