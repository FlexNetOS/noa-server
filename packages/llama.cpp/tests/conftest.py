"""
Pytest configuration and shared fixtures for llama.cpp integration tests
"""

import pytest
import sys
import os
from pathlib import Path
from unittest.mock import Mock, MagicMock, patch
import tempfile
import json

# Add package root to path
PACKAGE_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PACKAGE_ROOT))


@pytest.fixture
def mock_llama_cpp_dir(tmp_path):
    """Create a mock llama.cpp directory structure"""
    # Create directory structure
    build_dir = tmp_path / "build"
    bin_dir = build_dir / "bin"
    shims_dir = tmp_path / "shims"
    models_dir = tmp_path / "models"

    bin_dir.mkdir(parents=True)
    shims_dir.mkdir(parents=True)
    models_dir.mkdir(parents=True)

    # Create mock executables
    llama_cli = bin_dir / "llama-cli"
    llama_cli.touch()
    llama_cli.chmod(0o755)

    gguf_loader = shims_dir / "gguf_loader.sh"
    gguf_loader.write_text("""#!/bin/bash
echo "Mock GGUF loader"
echo "Response from llama.cpp"
""")
    gguf_loader.chmod(0o755)

    # Create mock model file
    mock_model = models_dir / "test-model.gguf"
    mock_model.write_bytes(b"GGUF" + b"\x00" * 100)

    return tmp_path


@pytest.fixture
def mock_model_file(tmp_path):
    """Create a mock GGUF model file"""
    model_file = tmp_path / "test-model.gguf"
    # GGUF header followed by some dummy data
    model_file.write_bytes(b"GGUF" + b"\x00" * 1000)
    return str(model_file)


@pytest.fixture
def invalid_model_file(tmp_path):
    """Create an invalid model file"""
    model_file = tmp_path / "invalid-model.gguf"
    model_file.write_bytes(b"INVALID" + b"\x00" * 100)
    return str(model_file)


@pytest.fixture
def sample_prompt():
    """Sample prompt for testing"""
    return "Hello, how are you today?"


@pytest.fixture
def sample_chat_response():
    """Sample chat response for testing"""
    return {
        "response": "I'm doing well, thank you for asking! How can I help you today?",
        "model": "/path/to/model.gguf",
        "usage": {
            "prompt_tokens": 5,
            "completion_tokens": 14,
            "total_tokens": 19
        },
        "timing": {
            "start_time": 1234567890.0,
            "end_time": 1234567892.5,
            "duration": 2.5
        },
        "cuda_enabled": False
    }


@pytest.fixture
def sample_benchmark_result():
    """Sample benchmark result for testing"""
    return {
        "model": "/path/to/model.gguf",
        "prompt": "Hello, how are you?",
        "n_predict": 128,
        "duration_seconds": 5.2,
        "tokens_per_second": 24.6,
        "cuda_enabled": False
    }


@pytest.fixture
def sample_system_info():
    """Sample system info for testing"""
    return {
        "llama_cpp_version": "built-from-source",
        "cuda_enabled": False,
        "model_path": "/path/to/models",
        "cpu_count": 8,
        "system": "linux",
        "python_version": "3.12.0"
    }


@pytest.fixture
def mock_subprocess():
    """Mock subprocess for testing command execution"""
    with patch('subprocess.run') as mock_run, \
         patch('subprocess.Popen') as mock_popen:

        # Setup default successful run
        mock_run.return_value = Mock(
            returncode=0,
            stdout="Response from llama.cpp",
            stderr=""
        )

        # Setup default successful popen
        mock_process = Mock()
        mock_process.returncode = 0
        mock_process.stdout.readline.side_effect = ["Line 1\n", "Line 2\n", ""]
        mock_process.stderr.read.return_value = ""
        mock_process.wait.return_value = 0
        mock_popen.return_value = mock_process

        yield {
            'run': mock_run,
            'popen': mock_popen,
            'process': mock_process
        }


@pytest.fixture
def mock_env_vars():
    """Mock environment variables"""
    with patch.dict(os.environ, {
        'LLM_MODEL_PATH': '/path/to/models',
        'LLAMA_CUDA': 'false'
    }):
        yield


@pytest.fixture
def flask_app_client():
    """Create a Flask test client"""
    try:
        from flask import Flask
        app = Flask(__name__)
        app.config['TESTING'] = True
        return app.test_client()
    except ImportError:
        pytest.skip("Flask not installed")


@pytest.fixture
def mock_mcp_server():
    """Mock MCP server components"""
    mock_server = Mock()
    mock_server.list_tools.return_value = lambda: []
    mock_server.call_tool.return_value = lambda name, args: []
    return mock_server


@pytest.fixture
def mock_asyncio_loop():
    """Mock asyncio event loop"""
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    yield loop
    loop.close()


@pytest.fixture(autouse=True)
def reset_logging():
    """Reset logging configuration between tests"""
    import logging
    logging.getLogger().handlers = []


@pytest.fixture
def capture_logs():
    """Capture log output for testing"""
    import logging
    from io import StringIO

    log_capture = StringIO()
    handler = logging.StreamHandler(log_capture)
    handler.setLevel(logging.INFO)

    logger = logging.getLogger()
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

    yield log_capture

    logger.removeHandler(handler)


# Performance testing helpers
@pytest.fixture
def benchmark_timer():
    """Utility for timing operations in tests"""
    import time

    class Timer:
        def __init__(self):
            self.start_time = None
            self.end_time = None

        def start(self):
            self.start_time = time.time()

        def stop(self):
            self.end_time = time.time()

        @property
        def duration(self):
            if self.start_time and self.end_time:
                return self.end_time - self.start_time
            return None

    return Timer()


# Test data generators
@pytest.fixture
def generate_test_prompts():
    """Generate various test prompts"""
    def _generate(count=5):
        prompts = [
            "Hello, how are you?",
            "What is the capital of France?",
            "Explain quantum computing in simple terms.",
            "Write a haiku about programming.",
            "What are the benefits of exercise?"
        ]
        return prompts[:count]
    return _generate


@pytest.fixture
def generate_streaming_chunks():
    """Generate mock streaming response chunks"""
    def _generate(text="This is a streaming response", chunk_size=5):
        words = text.split()
        for i in range(0, len(words), chunk_size):
            chunk = " ".join(words[i:i+chunk_size])
            yield chunk
    return _generate


# Cleanup helpers
@pytest.fixture(autouse=True)
def cleanup_temp_files():
    """Clean up temporary files after each test"""
    temp_files = []

    def register(filepath):
        temp_files.append(filepath)

    yield register

    # Cleanup
    for filepath in temp_files:
        try:
            if os.path.exists(filepath):
                os.remove(filepath)
        except Exception:
            pass
