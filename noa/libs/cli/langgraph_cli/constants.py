import os

DEFAULT_CONFIG = "langgraph.json"
DEFAULT_PORT = 8123

# analytics
# Note: These values must NOT be hardcoded. Read from environment and fall back to
# safe placeholders that make it obvious configuration is required.
SUPABASE_PUBLIC_API_KEY = os.getenv("SUPABASE_PUBLIC_API_KEY", "SUPABASE_PUBLIC_API_KEY_PLACEHOLDER")
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://YOUR-PROJECT.supabase.co")
