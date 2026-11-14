#!/usr/bin/env python3
"""Compatibility entry point: build the canonical detailed report, then synchronize copies."""
from pathlib import Path
import runpy
R=Path(__file__).resolve().parents[1]
runpy.run_path(str(R/'docs/build_audited_report.py'),run_name='__main__')
runpy.run_path(str(R/'scripts/sync_release.py'),run_name='__main__')
