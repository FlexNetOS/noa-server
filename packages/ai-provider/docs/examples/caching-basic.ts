/**
 * AI Response Caching - Basic Usage Example
 *
 * Demonstrates how to integrate AI caching with OpenAI provider
 * to reduce API costs by 60-80%.
 */

import {
  OpenAIProvider,
  createMemoryCacheManager,
  ProviderType,
  Message
} from '@noa/ai-provider';

async function main() {
  // 1. Create cache manager (10,000 entries, 2-hour TTL)
  const cache = createMemoryCacheManager(10000, 7200);

  // 2. Create AI provider
  const provider = new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
    type: ProviderType.OPENAI
  });

  // 3. Helper function to get cached responses
  async function getCachedCompletion(
    messages: Message[],
    model: string = 'gpt-3.5-turbo',
    forceFresh: boolean = false
  ) {
    // Check cache first
    const cacheResult = await cache.get(
      messages,
      model,
      ProviderType.OPENAI,
      undefined,
      forceFresh
    );

    if (cacheResult.hit && !forceFresh) {
      console.log(`✓ Cache hit in ${cacheResult.latency}ms`);
      return cacheResult.data!;
    }

    // Cache miss - call API
    console.log(`✗ Cache miss - calling AI API`);
    const startTime = Date.now();

    const response = await provider.createChatCompletion({
      messages,
      model
    });

    const apiLatency = Date.now() - startTime;
    console.log(`  API latency: ${apiLatency}ms`);

    // Cache the response
    await cache.set(messages, model, ProviderType.OPENAI, response);

    return response;
  }

  // 4. Example usage
  console.log('=== AI Caching Demo ===\n');

  // First call - cache miss
  const messages: Message[] = [
    { role: 'user', content: 'What is the capital of France?' }
  ];

  console.log('1. First call (cache miss):');
  const response1 = await getCachedCompletion(messages);
  console.log('   Response:', response1.choices[0].message.content);
  console.log();

  // Second call - cache hit
  console.log('2. Second call (cache hit):');
  const response2 = await getCachedCompletion(messages);
  console.log('   Response:', response2.choices[0].message.content);
  console.log();

  // Force fresh response
  console.log('3. Force fresh (bypass cache):');
  const response3 = await getCachedCompletion(messages, 'gpt-3.5-turbo', true);
  console.log('   Response:', response3.choices[0].message.content);
  console.log();

  // 5. Cache statistics
  console.log('=== Cache Statistics ===');
  const stats = cache.getStats();
  console.log('Hits:', stats.hits);
  console.log('Misses:', stats.misses);
  console.log('Hit Rate:', (stats.hitRate * 100).toFixed(2) + '%');
  console.log('Avg Hit Latency:', stats.avgHitLatency.toFixed(2) + 'ms');
  console.log('Entries:', stats.entries);
  console.log('Size:', (stats.sizeBytes / 1024).toFixed(2) + 'KB');
  console.log();

  // 6. Cleanup
  await cache.close();
  console.log('Cache closed');
}

// Run example
main().catch(console.error);
