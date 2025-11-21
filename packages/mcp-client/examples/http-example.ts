/**
 * Example: Using MCP Client with HTTP Transport
 *
 * This example demonstrates connecting to a remote MCP server
 * using HTTP POST requests.
 */

import { createMCPClient, MCPTransportType, MCPToolCall } from '../src';

async function main() {
  // Create client with HTTP transport
  const client = createMCPClient({
    name: 'http-example',
    version: '1.0.0',
    transport: {
      type: 'http' as MCPTransportType,
      endpoint: 'http://localhost:3000/mcp',
      headers: {
        Authorization: 'Bearer your-api-key-here',
        'X-Client-ID': 'example-client',
      },
    },
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
  });

  try {
    console.log('Connecting to HTTP MCP server...');
    const serverInfo = await client.connect();

    console.log(`✓ Connected to ${serverInfo.name} v${serverInfo.version}`);

    // List and call tools
    const tools = await client.tools.listTools();
    console.log(`\nAvailable tools: ${tools.map((t) => t.name).join(', ')}`);

    // Example: Call weather tool
    if (client.tools.hasTool('get_weather')) {
      console.log('\nGetting weather information...');

      const result = await client.tools.callTool({
        name: 'get_weather',
        arguments: {
          city: 'San Francisco',
          units: 'celsius',
        },
      });

      console.log('Weather:', result);
    }

    // Example: Call multiple tools in parallel
    console.log('\nCalling multiple tools in parallel...');

    const calls: MCPToolCall[] = [
      { name: 'tool1', arguments: { param: 'value1' } },
      { name: 'tool2', arguments: { param: 'value2' } },
      { name: 'tool3', arguments: { param: 'value3' } },
    ];

    const results = await client.tools.callToolsParallel(calls);

    results.forEach((result, index) => {
      console.log(`\nResult ${index + 1}:`, result);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.disconnect();
  }
}

main().catch(console.error);
