import { CompressionCoordinator } from './.hive-mind/integrations/compression-coordinator';

async function test() {
  console.log('Testing basic compression coordinator...');
  
  const coordinator = new CompressionCoordinator({
    aiNaming: false, // Disable AI to avoid dependencies
    autoCompress: false,
  });
  
  console.log('Coordinator created successfully');
  
  // Test basic functionality
  const stats = await coordinator.getCompressionStats();
  console.log('Stats retrieved:', stats.totalArchives);
  
  console.log('Basic test passed!');
}

test().catch(console.error);
