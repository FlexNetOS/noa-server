#!/usr/bin/env python3
"""
POL-0187-0189: Neural Processing Examples
Python examples for llama.cpp neural processing with robust error handling.
"""

import sys
import os
import time
import traceback
from pathlib import Path
from typing import Optional

# ============================================================================
# SETUP
# ============================================================================

# Add package to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'packages'))

# Import with fallback and error handling
NeuralProcessor: Optional[type] = None  # type: ignore

try:
    from llama_cpp.processor import NeuralProcessor as _NeuralProcessor  # type: ignore
    NeuralProcessor = _NeuralProcessor  # type: ignore
except ImportError:
    try:
        from src.processor import NeuralProcessor as _NeuralProcessor  # type: ignore
        NeuralProcessor = _NeuralProcessor  # type: ignore
    except ImportError as e:
        print(f"❌ Fatal Error: Could not import NeuralProcessor")
        print(f"   Details: {e}")
        print(f"   Please ensure the neural processing package is installed.")
        sys.exit(1)


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def ensure_processor_available() -> bool:
    """Ensure NeuralProcessor is available, return True if ok."""
    if NeuralProcessor is None:
        print("❌ Error: NeuralProcessor not available")
        return False
    return True


def safe_get(data: Any, *keys: str, default: Any = None) -> Any:
    """Safely get nested dict values."""
    current: Any = data
    for key in keys:
        if isinstance(current, dict):
            current = current.get(key)  # type: ignore
        else:
            return default
        if current is None:
            return default
    return current  # type: ignore


# ============================================================================
# EXAMPLE FUNCTIONS
# ============================================================================

def example_basic_chat() -> None:
    """POL-0182: Minimal example - Basic chat completion"""
    print("=== Basic Chat Example ===\n")

    if not ensure_processor_available():
        return

    try:
        # Initialize processor
        processor = NeuralProcessor(  # type: ignore
            model_path=os.getenv('NEURAL_MODEL_PATH', './models/llama-2-7b-chat.gguf'),
            context_size=2048,
            gpu_layers=0  # CPU-only for compatibility
        )

        print("✓ Neural processor initialized\n")

        # Simple chat completion
        messages = [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "What is artificial intelligence?"}
        ]

        print("Generating response...")
        response = processor.chat_completion(
            messages=messages,
            max_tokens=200,
            temperature=0.7
        )

        print("\nAI Response:")
        print(safe_get(response, 'choices', '0', 'message', 'content'))
        print("\n✅ Basic chat example complete\n")

    except Exception as e:
        print(f"❌ Error in basic_chat: {e}")
        traceback.print_exc()


def example_streaming() -> None:
    """POL-0183: Streaming responses"""
    print("=== Streaming Example ===\n")

    if not ensure_processor_available():
        return

    try:
        processor = NeuralProcessor(  # type: ignore
            model_path=os.getenv('NEURAL_MODEL_PATH', './models/llama-2-7b-chat.gguf'),
            context_size=2048,
            gpu_layers=0
        )

        messages = [
            {"role": "user", "content": "Explain neural networks in 3 bullet points."}
        ]

        print("Streaming response:")
        print("-" * 50)

        for chunk in processor.stream_chat(messages, max_tokens=300):
            if isinstance(chunk, dict) and 'content' in chunk:
                print(chunk['content'], end='', flush=True)  # type: ignore

        print("\n" + "-" * 50)
        print("\n✅ Streaming example complete\n")

    except Exception as e:
        print(f"❌ Error in streaming: {e}")
        traceback.print_exc()


def example_embeddings() -> None:
    """POL-0184: Generate embeddings"""
    print("=== Embeddings Example ===\n")

    if not ensure_processor_available():
        return

    try:
        processor = NeuralProcessor(  # type: ignore
            model_path=os.getenv('NEURAL_MODEL_PATH', './models/llama-2-7b-chat.gguf'),
            context_size=2048,
            gpu_layers=0
        )

        texts = [
            "Artificial intelligence is transforming technology.",
            "Machine learning models can process vast amounts of data.",
            "Neural networks are inspired by biological neurons."
        ]

        print(f"Generating embeddings for {len(texts)} texts...\n")

        for i, text in enumerate(texts, 1):
            embedding = processor.get_embedding(text)
            if isinstance(embedding, (list, tuple)):
                print(f"  Text {i}: {len(embedding)} dimensions")  # type: ignore
            else:
                print(f"  Text {i}: embedding generated")

        print("\n✅ Embeddings example complete\n")

    except Exception as e:
        print(f"❌ Error in embeddings: {e}")
        traceback.print_exc()


def example_batch_processing() -> None:
    """POL-0186: Batch processing"""
    print("=== Batch Processing Example ===\n")

    if not ensure_processor_available():
        return

    try:
        processor = NeuralProcessor(  # type: ignore
            model_path=os.getenv('NEURAL_MODEL_PATH', './models/llama-2-7b-chat.gguf'),
            context_size=2048,
            gpu_layers=0,
            batch_size=4
        )

        prompts = [
            "Explain REST APIs",
            "What is Docker?",
            "Define microservices",
            "Describe CI/CD"
        ]

        print(f"Processing {len(prompts)} prompts in batch...\n")

        results = processor.batch_completion(
            prompts=prompts,
            max_tokens=100,
            temperature=0.7
        )

        for i, (prompt, result) in enumerate(zip(prompts, results), 1):
            print(f"Prompt {i}: {prompt}")
            result_text = safe_get(result, 'text', default='[No response]')
            print(f"Response: {str(result_text)[:100]}...")
            print()

        print("✅ Batch processing example complete\n")

    except Exception as e:
        print(f"❌ Error in batch_processing: {e}")
        traceback.print_exc()


def example_system_info() -> None:
    """POL-0190: Model information and system status"""
    print("=== System Information ===\n")

    if not ensure_processor_available():
        return

    try:
        processor = NeuralProcessor(  # type: ignore
            model_path=os.getenv('NEURAL_MODEL_PATH', './models/llama-2-7b-chat.gguf'),
            context_size=2048,
            gpu_layers=0
        )

        # Get system information
        info = processor.get_system_info()

        print("System Information:")
        print(f"  Model: {safe_get(info, 'model', default='Unknown')}")
        print(f"  Context Size: {safe_get(info, 'context_size', default=0)}")
        print(f"  GPU Layers: {safe_get(info, 'gpu_layers', default=0)}")
        print(f"  Architecture: {safe_get(info, 'architecture', default='Unknown')}")
        print(f"  CUDA Available: {safe_get(info, 'cuda_available', default=False)}")

        # Validate model
        print("\nValidating model...")
        is_valid = processor.validate_model()
        print(f"  Model Valid: {'✓' if is_valid else '✗'}")

        print("\n✅ System info example complete\n")

    except Exception as e:
        print(f"❌ Error in system_info: {e}")
        traceback.print_exc()


def example_benchmark() -> None:
    """POL-0191: Performance benchmarking"""
    print("=== Benchmark Example ===\n")

    if not ensure_processor_available():
        return

    try:
        processor = NeuralProcessor(  # type: ignore
            model_path=os.getenv('NEURAL_MODEL_PATH', './models/llama-2-7b-chat.gguf'),
            context_size=2048,
            gpu_layers=0
        )

        prompt = "Explain the concept of containerization in software development."

        print("Running benchmark...")
        print(f"  Prompt length: {len(prompt)} characters")
        print(f"  Max tokens: 200")

        start_time = time.time()

        response = processor.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
            temperature=0.7
        )

        end_time = time.time()
        duration = end_time - start_time

        content = safe_get(response, 'choices', '0', 'message', 'content', default='')
        tokens_generated = len(str(content).split()) if content else 0

        print(f"\n  Duration: {duration:.2f}s")
        print(f"  Tokens generated: {tokens_generated}")
        if duration > 0:
            print(f"  Tokens/second: {tokens_generated / duration:.2f}")

        # Run benchmark suite
        print("\nRunning benchmark suite...")
        benchmark_results = processor.benchmark_model(
            num_runs=3,
            prompt_length=100,
            max_tokens=100
        )

        print("\nBenchmark Results:")
        print(f"  Average latency: {safe_get(benchmark_results, 'avg_latency', default=0):.2f}s")
        print(f"  Min latency: {safe_get(benchmark_results, 'min_latency', default=0):.2f}s")
        print(f"  Max latency: {safe_get(benchmark_results, 'max_latency', default=0):.2f}s")
        print(f"  Throughput: {safe_get(benchmark_results, 'throughput', default=0):.2f} tokens/s")

        print("\n✅ Benchmark example complete\n")

    except Exception as e:
        print(f"❌ Error in benchmark: {e}")
        traceback.print_exc()


def main() -> None:
    """Main entry point - POL-0189: Verify examples run"""
    print("NOA Server - Neural Processing Examples")
    print("=" * 50)
    print()

    if NeuralProcessor is None:
        print("❌ Fatal Error: NeuralProcessor module not loaded")
        print("Please check the installation and try again.")
        sys.exit(1)

    # Check if model exists
    model_path = os.getenv('NEURAL_MODEL_PATH', './models/llama-2-7b-chat.gguf')
    if not os.path.exists(model_path):
        print(f"⚠️  Warning: Model not found at {model_path}")
        print("Examples will use fallback configuration.")
        print()

    # Run examples based on command line argument
    example = sys.argv[1] if len(sys.argv) > 1 else 'basic'

    examples: Dict[str, Any] = {
        'basic': example_basic_chat,
        'streaming': example_streaming,
        'embeddings': example_embeddings,
        'batch': example_batch_processing,
        'info': example_system_info,
        'benchmark': example_benchmark
    }

    if example == 'all':
        for name, func in examples.items():
            try:
                func()
            except Exception as e:
                print(f"❌ Error in {name} example: {e}\n")
    elif example in examples:
        try:
            examples[example]()
        except Exception as e:
            print(f"❌ Error: {e}")
            traceback.print_exc()
            sys.exit(1)
    else:
        print(f"Unknown example: {example}")
        print("\nAvailable examples:")
        print("  python examples/neural-processing.py basic       - Basic chat")
        print("  python examples/neural-processing.py streaming   - Streaming responses")
        print("  python examples/neural-processing.py embeddings  - Generate embeddings")
        print("  python examples/neural-processing.py batch       - Batch processing")
        print("  python examples/neural-processing.py info        - System information")
        print("  python examples/neural-processing.py benchmark   - Performance benchmark")
        print("  python examples/neural-processing.py all         - Run all examples")
        sys.exit(1)

    print("=" * 50)
    print("✅ All examples completed successfully!")


if __name__ == '__main__':
    main()
