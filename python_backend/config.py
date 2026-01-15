import os
import json
from dotenv import load_dotenv, set_key
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT_DIR / ".env"

load_dotenv(ENV_PATH)

def get_config():
    """Read config from .env file, specifically the API_CONFIGS key."""
    config_str = os.getenv("API_CONFIGS")
    if not config_str:
        return []
    try:
        return json.loads(config_str)
    except json.JSONDecodeError:
        return []

def save_config(configs: list):
    """存储API配置"""
    config_str = json.dumps(configs)
    
    if not ENV_PATH.exists():
        ENV_PATH.touch()

    set_key(ENV_PATH, "API_CONFIGS", config_str, quote_mode="always")
    
    os.environ["API_CONFIGS"] = config_str
    return True

def delete_config(config_id: str):
    """根据ID删除配置"""
    configs = get_config()
    new_configs = [c for c in configs if c.get("id") != config_id]
    
    if len(new_configs) == len(configs):
        return False
        
    return save_config(new_configs)
