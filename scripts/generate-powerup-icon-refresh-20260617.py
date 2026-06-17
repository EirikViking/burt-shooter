from __future__ import annotations

import runpy
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
NORMALIZER = ROOT / "scripts" / "normalize-powerup-imagegen-icons-20260617.py"


if __name__ == "__main__":
    runpy.run_path(str(NORMALIZER), run_name="__main__")
