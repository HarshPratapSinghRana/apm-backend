import yaml
from pathlib import Path
from typing import Any, Dict

def load_prompts(file_name: str) -> Dict[str, Any]:
    """Load prompts from a YAML file."""
    prompt_path = Path(__file__).parent.parent.parent.parent / "data" / "prompts" / file_name
    with open(prompt_path, "r") as file:
        return yaml.safe_load(file)

CLASSIFICATION_PROMPTS = load_prompts("classification_prompts.yaml")
CONVERSATION_PROMPTS = load_prompts("conversation_prompts.yaml")
EXTRACTION_PROMPTS = load_prompts("extraction_prompts.yaml")
