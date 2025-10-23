# llama.cpp Integration Test Suite

Comprehensive test suite for llama.cpp neural processing integration with MCP (Model Context Protocol) and HTTP API.

## Overview

This test suite provides thorough testing coverage for:
- **LlamaBridge**: Core llama.cpp integration layer
- **LlamaHTTPBridge**: Flask-based REST API
- **LlamaMCPServer**: MCP server for Claude Code integration

## Test Structure

```
tests/
├── unit/                           # Unit tests for individual components
│   ├── test_llama_bridge.py       # LlamaBridge class tests
│   ├── test_http_bridge_api.py    # HTTP API endpoint tests
│   └── test_mcp_server.py         # MCP server tests
├── integration/                    # Integration tests
│   └── test_http_integration.py   # HTTP workflow tests
├── e2e/                           # End-to-end tests
│   └── test_mcp_workflow.py       # Complete MCP workflows
├── fixtures/                      # Test data generators
│   └── data_generators.py        # Mock data factories
├── helpers/                       # Test utilities
│   └── test_utils.py             # Helper functions
├── conftest.py                   # Pytest configuration and fixtures
├── pytest.ini                    # Pytest settings
└── requirements-test.txt         # Test dependencies
```

## Test Categories

### Unit Tests (200+ tests)
- **LlamaBridge** (70+ tests):
  - Initialization and validation
  - Chat completion
  - Streaming chat
  - Model benchmarking
  - Model validation
  - System information

- **LlamaHTTPBridge** (60+ tests):
  - Endpoint initialization
  - Health checks
  - Chat API
  - Streaming API
  - Benchmark API
  - Validation API
  - System info API

- **LlamaMCPServer** (70+ tests):
  - MCP server initialization
  - Tool definitions
  - Chat completion via MCP
  - Streaming via MCP
  - Benchmark via MCP
  - Model validation via MCP
  - System info via MCP

### Integration Tests (20+ tests)
- Complete HTTP workflows
- Multi-step operations
- Error recovery
- Concurrent requests
- Performance testing

### End-to-End Tests (15+ tests)
- Complete MCP workflows
- Multi-model scenarios
- Streaming workflows
- Error handling flows
- Performance benchmarks

## Running Tests

### Install Dependencies

```bash
cd /home/deflex/noa-server/packages/llama.cpp
pip install -r tests/requirements-test.txt
```

### Run All Tests

```bash
pytest tests/
```

### Run Specific Test Categories

```bash
# Unit tests only
pytest tests/unit/

# Integration tests only
pytest tests/integration/

# E2E tests only
pytest tests/e2e/

# Specific test file
pytest tests/unit/test_llama_bridge.py

# Specific test class
pytest tests/unit/test_llama_bridge.py::TestLlamaBridgeChat

# Specific test
pytest tests/unit/test_llama_bridge.py::TestLlamaBridgeChat::test_chat_basic_success
```

### Run Tests by Marker

```bash
# Fast tests only (excludes slow tests)
pytest -m "not slow"

# Tests requiring Flask
pytest -m requires_flask

# Tests requiring MCP
pytest -m requires_mcp

# Async tests only
pytest -m async

# Multiple markers
pytest -m "unit and not slow"
```

### Run with Coverage

```bash
# Generate coverage report
pytest --cov=shims --cov=registry --cov-report=html

# View coverage in browser
open tests/coverage_html/index.html

# Generate terminal coverage report
pytest --cov=shims --cov-report=term-missing
```

### Parallel Execution

```bash
# Run tests in parallel (4 workers)
pytest -n 4

# Auto-detect number of CPUs
pytest -n auto
```

## Test Markers

- `unit`: Unit tests for individual functions
- `integration`: Integration tests for component interactions
- `e2e`: End-to-end tests for complete workflows
- `slow`: Tests that take significant time
- `requires_model`: Tests requiring GGUF model file
- `requires_cuda`: Tests requiring CUDA GPU
- `requires_flask`: Tests requiring Flask library
- `requires_mcp`: Tests requiring MCP server libraries
- `network`: Tests requiring network access
- `async`: Tests using async/await

## Fixtures

### Standard Fixtures (from conftest.py)

- `mock_llama_cpp_dir`: Mock llama.cpp directory structure
- `mock_model_file`: Mock GGUF model file
- `invalid_model_file`: Invalid model file for error testing
- `sample_prompt`: Sample prompt for testing
- `sample_chat_response`: Sample chat response
- `sample_benchmark_result`: Sample benchmark result
- `sample_system_info`: Sample system information
- `mock_subprocess`: Mocked subprocess for command execution
- `mock_env_vars`: Mocked environment variables
- `flask_app_client`: Flask test client
- `mock_mcp_server`: Mocked MCP server
- `benchmark_timer`: Performance timing utility

### Data Generators (from fixtures/data_generators.py)

```python
from tests.fixtures.data_generators import TestDataFactory

# Generate test prompts
prompt = TestDataFactory.prompt.simple_question()
coding_prompt = TestDataFactory.prompt.coding_prompt()
prompts = TestDataFactory.prompt.batch_prompts(count=10)

# Generate responses
response = TestDataFactory.response.simple_response()
code = TestDataFactory.response.code_response("python")

# Generate model data
model_info = TestDataFactory.model.model_info()
model_list = TestDataFactory.model.model_list(count=5)

# Generate benchmark data
benchmark = TestDataFactory.benchmark.benchmark_result()

# Generate system info
sys_info = TestDataFactory.system.system_info(cuda=True)

# Generate complete scenarios
scenario = TestDataFactory.complete_test_scenario()
```

### Test Utilities (from helpers/test_utils.py)

```python
from tests.helpers.test_utils import (
    AssertionHelper,
    FileHelper,
    EnvironmentHelper,
    PerformanceHelper
)

# Custom assertions
AssertionHelper.assert_valid_chat_response(response)
AssertionHelper.assert_valid_benchmark_result(benchmark)

# File operations
FileHelper.create_mock_model(path, size_mb=2.0)
FileHelper.create_mock_executable(path)

# Environment management
with EnvironmentHelper.cuda_enabled():
    # Tests with CUDA enabled
    pass

# Performance testing
with PerformanceHelper.measure_time() as get_duration:
    # Operation to measure
    pass
duration = get_duration()
```

## Coverage Goals

- **Overall Coverage**: >90%
- **Unit Test Coverage**: >95%
- **Integration Test Coverage**: >85%
- **Critical Paths**: 100%

### Current Coverage Breakdown

| Module | Coverage | Lines | Missing |
|--------|----------|-------|---------|
| shims/http_bridge.py | 95%+ | 760 | <40 |
| LlamaBridge | 98% | 310 | <7 |
| LlamaHTTPBridge | 93% | 195 | <14 |
| LlamaMCPServer | 92% | 255 | <20 |

## Test Data

### Mock Models

Tests use lightweight mock GGUF files with valid headers:
- Size: 1-2 MB (configurable)
- Header: Valid GGUF format
- Content: Zero-filled data

### Mock Responses

Realistic mock responses for various scenarios:
- Simple questions and answers
- Code examples in multiple languages
- Long-form explanations
- Streaming chunks

## Performance Benchmarks

### Expected Performance

- **Unit Tests**: <0.1s per test
- **Integration Tests**: <1s per test
- **E2E Tests**: <5s per test
- **Full Suite**: <60s total (parallel execution)

### Performance Testing

```bash
# Run with performance profiling
pytest --durations=10

# Run with memory profiling
pytest --memprof

# Benchmark specific tests
pytest tests/unit/test_llama_bridge.py::TestLlamaBridgePerformance
```

## Continuous Integration

### GitHub Actions

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
        with:
          python-version: '3.12'
      - run: pip install -r tests/requirements-test.txt
      - run: pytest --cov --cov-report=xml
      - uses: codecov/codecov-action@v2
```

## Debugging Tests

### Verbose Output

```bash
# Verbose mode
pytest -v

# Extra verbose
pytest -vv

# Show print statements
pytest -s

# Show local variables on failure
pytest -l
```

### Debug Specific Test

```bash
# Drop into debugger on failure
pytest --pdb

# Drop into debugger at start
pytest --trace
```

### Logging

```bash
# Show log output
pytest --log-cli-level=DEBUG

# Capture logs to file
pytest --log-file=test_logs.txt
```

## Best Practices

1. **Isolate Tests**: Each test should be independent
2. **Use Fixtures**: Reuse common setup with fixtures
3. **Mock External Calls**: Don't make real subprocess calls
4. **Test Edge Cases**: Include error scenarios
5. **Descriptive Names**: Test names should describe what they test
6. **AAA Pattern**: Arrange, Act, Assert
7. **One Assertion**: Focus on one behavior per test
8. **Fast Tests**: Keep tests fast with mocking
9. **Clean Up**: Use fixtures for cleanup
10. **Document**: Add docstrings to complex tests

## Troubleshooting

### Flask Not Found

```bash
pip install flask
```

### MCP Not Found

```bash
pip install mcp
```

### Import Errors

Ensure package root is in path:
```python
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
```

### Slow Tests

Run fast tests only:
```bash
pytest -m "not slow"
```

## Contributing

When adding new tests:

1. Place in appropriate directory (unit/integration/e2e)
2. Add appropriate markers
3. Use existing fixtures when possible
4. Follow naming conventions
5. Update this README if adding new categories
6. Ensure >90% coverage for new code
7. Run full suite before committing

## Test Reports

### Generate HTML Report

```bash
pytest --html=test_report.html --self-contained-html
```

### Generate JUnit XML

```bash
pytest --junitxml=junit.xml
```

### Generate Coverage JSON

```bash
pytest --cov --cov-report=json
```

## License

Tests are part of the llama.cpp integration and follow the same license as the parent project.
