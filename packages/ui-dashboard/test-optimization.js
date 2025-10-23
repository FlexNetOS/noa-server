/**
 * Test script to verify prompt optimization integration
 */

import { requestInterceptor } from '../src/services/request-interceptor';

async function testPromptOptimization() {
  console.log('🧪 Testing Prompt Optimization Integration...\n');

  // Test 1: Basic interception
  console.log('Test 1: Basic request interception');
  const testRequest = {
    endpoint: '/api/test',
    method: 'POST',
    body: { prompt: 'Write a hello world program' },
    headers: { 'Content-Type': 'application/json' },
    timestamp: Date.now()
  };

  try {
    const result = await requestInterceptor.intercept(testRequest);
    console.log('✅ Interception successful');
    console.log('Original:', testRequest.body.prompt);
    console.log('Optimized:', result.interceptionResult.optimized);
    console.log('Bypassed:', result.interceptionResult.bypassed);
    console.log('Processing time:', result.interceptionResult.processingTime, 'ms');
  } catch (error) {
    console.log('❌ Interception failed:', error);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: No prompt content
  console.log('Test 2: Request without prompt content');
  const noPromptRequest = {
    endpoint: '/api/status',
    method: 'GET',
    timestamp: Date.now()
  };

  try {
    const result = await requestInterceptor.intercept(noPromptRequest);
    console.log('✅ No-op interception successful');
    console.log('Bypassed:', result.interceptionResult.bypassed);
  } catch (error) {
    console.log('❌ No-op interception failed:', error);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: Statistics
  console.log('Test 3: Statistics check');
  const stats = requestInterceptor.getStats();
  console.log('📊 Current statistics:');
  console.log(JSON.stringify(stats, null, 2));

  console.log('\n🎉 All tests completed!');
}

// Run the test
testPromptOptimization().catch(console.error);
