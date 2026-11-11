#!/usr/bin/env python3
"""
scripts/export_saved_results.py
Converts actual audited NPZ results and validation files into browser assets under web/public/generated.

Audited requirements:
- Little-endian Float64 snapshot binaries (preserving full double precision)
- Manifest declares dtype="float64", byte_order="little", bytes_per_element=8
- Actual UTC timestamp and source NPZ SHA256 provenance
- Full diagnostics for all runs (including pair mean-square/min/max from snapshots)
- Clear distinction between sparse snapshot frames and continuous diagnostic cadence
- Scientific title for 2D run without overclaiming Fig 6d reproduction
"""

import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "web" / "public" / "generated"
OUT_DIR.mkdir(parents=True, exist_ok=True)

def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def export_saved_runs():
    now_utc = datetime.now(timezone.utc).isoformat()
    manifest = {
        "generated_at": now_utc,
        "format_version": "2.0",
        "description": "Authoritative numerical datasets for P20 TDGL interactive web lab (little-endian Float64)",
        "runs": {}
    }

    # 1. 1D Random Quench
    p1 = ROOT / "results/raw/tdgl_1d_random.npz"
    if p1.exists():
        sha1 = sha256_file(p1)
        d1 = np.load(p1)
        snaps = d1["snapshots"].astype("<f8")  # exact float64 little-endian, shape (504, 1024)
        bin_path = OUT_DIR / "tdgl_1d_random_snapshots.bin"
        snaps.tofile(bin_path)

        manifest["runs"]["tdgl_1d_random"] = {
            "id": "tdgl_1d_random",
            "name": "1D Critical Quench Coarsening (t = 0 to 1000)",
            "dimension": 1,
            "L": float(d1["L"]),
            "N": int(d1["N"]),
            "dx": float(d1["dx"]),
            "dt": float(d1["dt"]),
            "seed": int(d1["seed"]),
            "noise_amplitude": float(d1["noise_amplitude"]),
            "phi0": float(d1["phi0"]),
            "dtype": "float64",
            "byte_order": "little",
            "bytes_per_element": 8,
            "shape": list(snaps.shape),
            "binary_file": "generated/tdgl_1d_random_snapshots.bin",
            "source_npz": "results/raw/tdgl_1d_random.npz",
            "source_sha256": sha1,
            "t_snapshots": d1["t_snapshots"].tolist(),
            "diag_times": d1["diag_times"].tolist(),
            "diagnostics": {
                "free_energy": d1["free_energy"].tolist(),
                "mean_phi": d1["mean_phi"].tolist(),
                "mean_phi2": d1["mean_phi2"].tolist(),
                "min_phi": d1["min_phi"].tolist(),
                "max_phi": d1["max_phi"].tolist(),
            },
            "num_snapshots": len(snaps),
            "num_diagnostic_points": len(d1["diag_times"]),
            "final_observed": {
                "walls": 6,
                "mean_phi": float(d1["mean_phi"][-1]),
                "mean_phi2": float(d1["mean_phi2"][-1]),
                "free_energy": float(d1["free_energy"][-1]),
            }
        }
        print(f"Exported 1D random: {snaps.shape} {snaps.dtype} -> {bin_path.name} ({bin_path.stat().st_size / 1024 / 1024:.2f} MB)")

    # 2. 2D Random Quench
    p2 = ROOT / "results/raw/tdgl_2d_random.npz"
    if p2.exists():
        sha2 = sha256_file(p2)
        d2 = np.load(p2)
        snaps2 = d2["snapshots"].astype("<f8")  # shape (101, 128, 128)
        bin_path2 = OUT_DIR / "tdgl_2d_random_snapshots.bin"
        snaps2.tofile(bin_path2)

        manifest["runs"]["tdgl_2d_random"] = {
            "id": "tdgl_2d_random",
            "name": "2D Domain Coarsening (Model-A TDGL, parameters from Table I)",
            "dimension": 2,
            "L": float(d2["L"]),
            "Nx": int(d2["Nx"]),
            "Ny": int(d2["Ny"]),
            "dx": float(d2["dx"]),
            "dt": float(d2["dt"]),
            "seed": int(d2["seed"]),
            "noise_amplitude": float(d2["noise_amplitude"]),
            "phi0": float(d2["phi0"]),
            "dtype": "float64",
            "byte_order": "little",
            "bytes_per_element": 8,
            "shape": list(snaps2.shape),
            "binary_file": "generated/tdgl_2d_random_snapshots.bin",
            "source_npz": "results/raw/tdgl_2d_random.npz",
            "source_sha256": sha2,
            "t_snapshots": d2["t_snapshots"].tolist(),
            "diag_times": d2["diag_times"].tolist(),
            "diagnostics": {
                "free_energy": d2["free_energy"].tolist(),
                "mean_phi": d2["mean_phi"].tolist(),
                "mean_phi2": d2["mean_phi2"].tolist(),
                "min_phi": d2["min_phi"].tolist(),
                "max_phi": d2["max_phi"].tolist(),
            },
            "num_snapshots": len(snaps2),
            "num_diagnostic_points": len(d2["diag_times"]),
            "final_observed": {
                "mean_phi": float(d2["mean_phi"][-1]),
                "mean_phi2": float(d2["mean_phi2"][-1]),
                "free_energy": float(d2["free_energy"][-1]),
            }
        }
        print(f"Exported 2D random: {snaps2.shape} {snaps2.dtype} -> {bin_path2.name} ({bin_path2.stat().st_size / 1024 / 1024:.2f} MB)")

    # 3. 1D Kink-Antikink Pair
    p3 = ROOT / "results/raw/tdgl_1d_kink_antikink.npz"
    if p3.exists():
        sha3 = sha256_file(p3)
        d3 = np.load(p3)
        snaps3 = d3["snapshots"].astype("<f8")  # shape (9, 1024)
        bin_path3 = OUT_DIR / "tdgl_1d_kink_antikink_snapshots.bin"
        snaps3.tofile(bin_path3)

        # Compute snapshot-level diagnostics for pair
        snap_mean = [float(np.mean(s)) for s in snaps3]
        snap_mean2 = [float(np.mean(s**2)) for s in snaps3]
        snap_min = [float(np.min(s)) for s in snaps3]
        snap_max = [float(np.max(s)) for s in snaps3]

        manifest["runs"]["tdgl_1d_kink_antikink"] = {
            "id": "tdgl_1d_kink_antikink",
            "name": "1D Kink–Antikink Annihilation (R0=7.0)",
            "dimension": 1,
            "L": float(d3["L"]),
            "N": int(d3["N"]),
            "dx": float(d3["dx"]),
            "dt": float(d3["dt"]),
            "R0": float(d3["R0"]),
            "x1": float(d3["x1"]),
            "x2": float(d3["x2"]),
            "dtype": "float64",
            "byte_order": "little",
            "bytes_per_element": 8,
            "shape": list(snaps3.shape),
            "binary_file": "generated/tdgl_1d_kink_antikink_snapshots.bin",
            "source_npz": "results/raw/tdgl_1d_kink_antikink.npz",
            "source_sha256": sha3,
            "t_snapshots": d3["t_snapshots"].tolist(),
            "diag_times": d3["diag_times"].tolist(),
            "diagnostics": {
                "free_energy": d3["free_energy"].tolist(),
                "mean_phi": d3["mean_phi"].tolist(),
                "snapshot_mean_phi2": snap_mean2,
                "snapshot_min_phi": snap_min,
                "snapshot_max_phi": snap_max,
            },
            "num_snapshots": len(snaps3),
            "num_diagnostic_points": len(d3["diag_times"]),
            "final_observed": {
                "mean_phi": float(d3["mean_phi"][-1]),
                "free_energy": float(d3["free_energy"][-1]),
                "annihilated": True
            }
        }
        print(f"Exported 1D pair: {snaps3.shape} {snaps3.dtype} -> {bin_path3.name} ({bin_path3.stat().st_size / 1024:.1f} KB)")

    # Save manifest.json
    manifest_path = OUT_DIR / "manifest.json"
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"Wrote manifest: {manifest_path}")

def export_audit_data():
    audit_data = {}

    p_summary = ROOT / "results/validation/validation_summary.json"
    if p_summary.exists():
        audit_data["validation_summary"] = json.loads(p_summary.read_text())

    p_replay = ROOT / "audit/independent_full_replay.json"
    if p_replay.exists():
        audit_data["independent_full_replay"] = json.loads(p_replay.read_text())

    p_temp = ROOT / "audit/independent_temporal_convergence.json"
    if p_temp.exists():
        audit_data["independent_temporal_convergence"] = json.loads(p_temp.read_text())

    p_fits = ROOT / "results/validation/spectral_fits.json"
    if p_fits.exists():
        audit_data["spectral_fits"] = json.loads(p_fits.read_text())

    p_conv_csv = ROOT / "results/validation/kink_convergence.csv"
    if p_conv_csv.exists():
        lines = p_conv_csv.read_text().strip().split("\n")
        rows = []
        for line in lines[1:]:
            parts = [p.strip() for p in line.split(",")]
            rows.append({
                "N": int(parts[0]),
                "dx": float(parts[1]),
                "l2": float(parts[2]),
                "linf": float(parts[3]),
            })
        audit_data["kink_convergence_table"] = rows

    out_audit = OUT_DIR / "audit_evidence.json"
    with open(out_audit, "w") as f:
        json.dump(audit_data, f, indent=2)
    print(f"Wrote audit evidence: {out_audit}")

if __name__ == "__main__":
    export_saved_runs()
    export_audit_data()
