"""Loads the demo seed sessions from engine/seeds/*.json."""
import json
from pathlib import Path
from .schemas import SessionInput

SEED_DIR = Path(__file__).parent / "seeds"


def load_seeds() -> list[dict]:
    """Returns [{id, label, description, meta, expected, session: SessionInput}, ...] sorted by id."""
    seeds = []
    for path in sorted(SEED_DIR.glob("*.json")):
        data = json.loads(path.read_text())
        data["session"] = SessionInput.model_validate(data["session"])
        seeds.append(data)
    return seeds