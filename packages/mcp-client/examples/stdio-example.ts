/**
 * Example: Using MCP Client with Stdio Transport
 *
 * This example demonstrates connecting to a local MCP server
 * using the stdio transport (spawns a process).
 */

import { createMCPClient, MCPTransportType, MCPToolUtils } from '../src';

async function main() {
  // Create client with stdio transport
  const client = createMCPClient({
    name: 'stdio-example',
    version: '1.0.0',
    transport: {
      type: 'stdio' as MCPTransportType,
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
    },
    timeout: 30000,
    debug: true,
  });

  // Set up event listeners
  client.on('connected', () => {
    console.log('✓ Connected to MCP server');
  });

  client.on('disconnected', () => {
    console.log('✓ Disconnected from MCP server');
  });

  client.on('error', (error) => {
    console.error('✗ Error:', error.message);
  });

  client.on('stateChange', (state) => {
    console.log(`State changed to: ${state}`);
  });

  try {
    // Connect to server
    console.log('Connecting to MCP server...');
    const serverInfo = await client.connect();

    console.log('\nServer Information:');
    console.log(`  Name: ${serverInfo.name}`);
    console.log(`  Version: ${serverInfo.version}`);
    console.log(`  Protocol: ${serverInfo.protocolVersion}`);
    console.log(`  Capabilities:`, serverInfo.capabilities);

    // List available tools
    console.log('\nListing available tools...');
    const tools = await client.tools.listTools();

    console.log(`\nFound ${tools.length} tools:`);
    tools.forEach((tool, index) => {
      console.log(`\n${index + 1}. ${tool.name}`);
      if (tool.description) {
        console.log(`   Description: ${tool.description}`);
      }
      console.log(`   Input Schema:`, JSON.stringify(tool.inputSchema, null, 2));
    });

    // Example: Call a tool if available
    if (tools.length > 0) {
      const firstTool = tools[0];
      console.log(`\nCalling tool: ${firstTool.name}`);

      try {
        const result = await client.tools.callTool({
          name: firstTool.name,
          arguments: {}, // Adjust based on actual tool requirements
        });

        console.log('\nTool Result:');
        const formatted = MCPToolUtils.formatResult(result);
        console.log(formatted);

        if (MCPToolUtils.hasError(result)) {
          console.log('⚠️  Tool execution returned an error');
        }
      } catch (error) {
        console.error('✗ Failed to call tool:', error);
      }
    }

    // List resources
    console.log('\nListing available resources...');
    const resources = await client.listResources();

    console.log(`\nFound ${resources.length} resources:`);
    resources.forEach((resource, index) => {
      console.log(`\n${index + 1}. ${resource.name}`);
      console.log(`   URI: ${resource.uri}`);
      if (resource.description) {
        console.log(`   Description: ${resource.description}`);
      }
      if (resource.mimeType) {
        console.log(`   MIME Type: ${resource.mimeType}`);
      }
    });

  } catch (error) {
    console.error('✗ Error:', error);
  } finally {
    // Disconnect
    console.log('\nDisconnecting...');
    await client.disconnect();
    console.log('Done!');
  }
}

// Run the example
main().catch(console.error);
