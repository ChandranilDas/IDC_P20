"""
experiments/run_all.py
Master execution script for Project P20:
Simulating 1D and 2D Time-Dependent Ginzburg-Landau (TDGL) Equations.

Runs:
    1. experiments/run_1d_random.py
    2. experiments/run_1d_kink.py
    3. experiments/run_1d_kink_antikink.py
    4. experiments/run_2d_random.py
    5. experiments/run_validation.py
"""

import os
import sys
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from experiments.run_1d_random import run as run_1d_random
from experiments.run_1d_kink import run as run_1d_kink
from experiments.run_1d_kink_antikink import run as run_1d_kink_antikink
from experiments.run_2d_random import run as run_2d_random
from experiments.run_validation import run as run_validation


def main():
    t_start = time.time()
    print("=" * 70)
    print("  PROJECT P20 — 1D & 2D TDGL SIMULATION PIPELINE")
    print("  Authoritative Reference: Verma et al. (2023) & Yadav et al. (2024)")
    print("=" * 70)

    # 1. 1D Random Quench
    t0 = time.time()
    run_1d_random()
    print(f"--> Step 1 (1D Random) finished in {time.time() - t0:.2f} s\n")

    # 2. 1D Single Kink
    t0 = time.time()
    run_1d_kink()
    print(f"--> Step 2 (1D Kink) finished in {time.time() - t0:.2f} s\n")

    # 3. 1D Kink-Antikink Pair
    t0 = time.time()
    run_1d_kink_antikink()
    print(f"--> Step 3 (1D Kink-Antikink) finished in {time.time() - t0:.2f} s\n")

    # 4. 2D Random Quench
    t0 = time.time()
    run_2d_random()
    print(f"--> Step 4 (2D Random) finished in {time.time() - t0:.2f} s\n")

    # 5. Scientific Validation Suite
    t0 = time.time()
    run_validation()
    print(f"--> Step 5 (Validation Suite) finished in {time.time() - t0:.2f} s\n")

    total_time = time.time() - t_start
    print("=" * 70)
    print(f"  ALL P20 SIMULATIONS AND VALIDATIONS COMPLETED SUCCESSFULLY in {total_time:.2f} s")
    print("=" * 70)


if __name__ == "__main__":
    main()

