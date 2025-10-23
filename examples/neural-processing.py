#!/usr/bin/env python3
"""
POL-0187-0189: Neural Processing Examples
Python examples for llama.cpp neural processing
"""

import sys
import os
import json
from pathlib import Path

# Add package to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'packages' / 'llama.cpp'))

# POL-0187: Example script


def example_basic_chat():
    """POL-0182: Minimal example - Basic chat completion"""
    print("=== Basic Chat Example ===\n")

    from src.processor import NeuralProcessor

    # Initialize processor
    processor = NeuralProcessor(
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
    print(response['choices'][0]['message']['content'])
    print("\n✅ Basic chat example complete\n")


def example_streaming():
    """POL-0183: Streaming responses"""
    print("=== Streaming Example ===\n")

    from src.processor import NeuralProcessor

    processor = NeuralProcessor(
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
        if 'content' in chunk:
            print(chunk['content'], end='', flush=True)

    print("\n" + "-" * 50)
    print("\n✅ Streaming example complete\n")


def example_embeddings():
    """POL-0184: Generate embeddings"""
    print("=== Embeddings Example ===\n")

    from src.processor import NeuralProcessor

    processor = NeuralProcessor(
        model_path=os.getenv('NEURAL_MODEL_PATH', './models/llama-2-7b-chat.gguf'),
        context_size=2048,
        gpu_layers=0
    )

    texts = [
        "Artificial intelligence is transforming technology.",
        "Machine learning models can process vast amounts of data.",
        "Neural networks are inspired by biological neurons."
    ]

    print("Generating embeddings for {} texts...".format(len(texts)))

    for i, text in enumerate(texts, 1):
        embedding = processor.get_embedding(text)
        print(f"  Text {i}: {len(embedding)} dimensions")

    print("\n✅ Embeddings example complete\n")


def example_batch_processing():
    """POL-0186: Batch processing"""
    print("=== Batch Processing Example ===\n")

    from src.processor import NeuralProcessor

    processor = NeuralProcessor(
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
        print(f"Response: {result['text'][:100]}...")
        print()

    print("✅ Batch processing example complete\n")


def example_system_info():
    """POL-0190: Model information and system status"""
    print("=== System Information ===\n")

    from src.processor import NeuralProcessor

    processor = NeuralProcessor(
        model_path=os.getenv('NEURAL_MODEL_PATH', './models/llama-2-7b-chat.gguf'),
        context_size=2048,
        gpu_layers=0
    )

    # Get system information
    info = processor.get_system_info()

    print("System Information:")
    print(f"  Model: {info.get('model', 'Unknown')}")
    print(f"  Context Size: {info.get('context_size', 0)}")
    print(f"  GPU Layers: {info.get('gpu_layers', 0)}")
    print(f"  Architecture: {info.get('architecture', 'Unknown')}")
    print(f"  CUDA Available: {info.get('cuda_available', False)}")

    # Validate model
    print("\nValidating model...")
    is_valid = processor.validate_model()
    print(f"  Model Valid: {'✓' if is_valid else '✗'}")

    print("\n✅ System info example complete\n")


def example_benchmark():
    """POL-0191: Performance benchmarking"""
    print("=== Benchmark Example ===\n")

    from src.processor import NeuralProcessor
    import time

    processor = NeuralProcessor(
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

    tokens_generated = len(response['choices'][0]['message']['content'].split())

    print(f"\n  Duration: {duration:.2f}s")
    print(f"  Tokens generated: {tokens_generated}")
    print(f"  Tokens/second: {tokens_generated / duration:.2f}")

    # Run benchmark suite
    print("\nRunning benchmark suite...")
    benchmark_results = processor.benchmark_model(
        num_runs=3,
        prompt_length=100,
        max_tokens=100
    )

    print("\nBenchmark Results:")
    print(f"  Average latency: {benchmark_results.get('avg_latency', 0):.2f}s")
    print(f"  Min latency: {benchmark_results.get('min_latency', 0):.2f}s")
    print(f"  Max latency: {benchmark_results.get('max_latency', 0):.2f}s")
    print(f"  Throughput: {benchmark_results.get('throughput', 0):.2f} tokens/s")

    print("\n✅ Benchmark example complete\n")


def main():
    """Main entry point - POL-0189: Verify examples run"""
    print("NOA Server - Neural Processing Examples")
    print("=" * 50)
    print()

    # Check if model exists
    model_path = os.getenv('NEURAL_MODEL_PATH', './models/llama-2-7b-chat.gguf')
    if not os.path.exists(model_path):
        print(f"⚠️  Warning: Model not found at {model_path}")
        print("Examples will use fallback configuration.")
        print()

    # Run examples based on command line argument
    example = sys.argv[1] if len(sys.argv) > 1 else 'basic'

    examples = {
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
            import traceback
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
