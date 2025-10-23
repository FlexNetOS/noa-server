// Test script to verify dashboard API integration with message queue
import { api } from './src/services/api';

async function testAPIIntegration() {
  console.log('Testing API integration with message queue server...');

  try {
    console.log('Fetching telemetry data...');
    const telemetry = await api.getTelemetry();
    console.log('✅ Telemetry received:', {
      swarmMetrics: telemetry.swarmMetrics,
      systemHealth: telemetry.systemHealth,
      agentsCount: telemetry.agents.length,
      tasksCount: telemetry.taskQueue.length
    });

    console.log('Fetching agents...');
    const agents = await api.getAgents();
    console.log('✅ Agents received:', agents.length, 'agents');

    console.log('Fetching task queue...');
    const tasks = await api.getTaskQueue();
    console.log('✅ Tasks received:', tasks.length, 'tasks');

    console.log('🎉 API integration test completed successfully!');
  } catch (error) {
    console.error('❌ API integration test failed:', error);
  }
}

testAPIIntegration();
