/**
 * Example: Using MCP Client with WebSocket Transport
 *
 * This example demonstrates real-time bidirectional communication
 * with an MCP server using WebSocket.
 */

import { createMCPClient, MCPTransportType, ConnectionState } from '../src';

async function main() {
  // Create client with WebSocket transport
  const client = createMCPClient({
    name: 'websocket-example',
    version: '1.0.0',
    transport: {
      type: 'websocket' as MCPTransportType,
      endpoint: 'ws://localhost:3000/mcp',
      headers: {
        Authorization: 'Bearer your-api-key-here',
      },
    },
    timeout: 30000,
  });

  // Set up comprehensive event handling
  client.on('connected', () => {
    console.log('✓ WebSocket connected');
  });

  client.on('disconnected', () => {
    console.log('✓ WebSocket disconnected');
  });

  client.on('error', (error) => {
    console.error('✗ WebSocket error:', error);
  });

  client.on('stateChange', (state: ConnectionState) => {
    console.log(`State: ${state}`);
  });

  // Handle server notifications
  client.on('notification', (notification) => {
    console.log('\n📬 Server notification:');
    console.log(`  Method: ${notification.method}`);
    console.log(`  Params:`, notification.params);
  });

  // Handle dynamic tool changes
  client.on('toolsChanged', async () => {
    console.log('\n🔄 Tools list changed, refreshing...');
    const tools = await client.tools.listTools();
    console.log(`  Updated tools: ${tools.map((t) => t.name).join(', ')}`);
  });

  // Handle resource changes
  client.on('resourcesChanged', () => {
    console.log('\n🔄 Resources list changed');
  });

  // Handle prompt changes
  client.on('promptsChanged', () => {
    console.log('\n🔄 Prompts list changed');
  });

  try {
    console.log('Connecting to WebSocket MCP server...');
    await client.connect();

    // Keep connection open and listen for events
    console.log('\n⏳ Listening for events (press Ctrl+C to exit)...\n');

    // Example: Send periodic requests
    const intervalId = setInterval(async () => {
      try {
        if (client.isConnected()) {
          const tools = await client.tools.listTools();
          console.log(`\n📊 Heartbeat: ${tools.length} tools available`);
        }
      } catch (error) {
        console.error('Heartbeat error:', error);
      }
    }, 10000); // Every 10 seconds

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n\n🛑 Shutting down...');
      clearInterval(intervalId);
      await client.disconnect();
      process.exit(0);
    });

    // Keep process running
    await new Promise(() => {}); // Wait forever
  } catch (error) {
    console.error('Error:', error);
    await client.disconnect();
    process.exit(1);
  }
}

main().catch(console.error);
