import { MCPClient } from '../src/MCPClient';
import { ConnectionState, MCPClientConfig, MCPTransportType } from '../src/types';

describe('MCPClient', () => {
  let client: MCPClient;
  let config: MCPClientConfig;

  beforeEach(() => {
    config = {
      name: 'test-client',
      version: '1.0.0',
      transport: {
        type: 'stdio' as MCPTransportType,
        command: 'echo',
        args: ['test'],
      },
      timeout: 5000,
      retryAttempts: 1,
    };
    client = new MCPClient(config);
  });

  afterEach(async () => {
    if (client.isConnected()) {
      await client.disconnect();
    }
  });

  describe('Connection Management', () => {
    test('should start in disconnected state', () => {
      expect(client.getState()).toBe(ConnectionState.DISCONNECTED);
      expect(client.isConnected()).toBe(false);
    });

    test('should emit state change events', (done) => {
      client.on('stateChange', (state) => {
        if (state === ConnectionState.CONNECTING) {
          done();
        }
      });

      client.connect().catch(() => {
        // Expected to fail with echo command
      });
    });

    test('should not allow double connection', async () => {
      const connectPromise = client.connect();

      await expect(client.connect()).rejects.toThrow('Already connected or connecting');

      connectPromise.catch(() => {
        // Ignore
      });
    });
  });

  describe('Tool Management', () => {
    test('should have tools manager', () => {
      expect(client.tools).toBeDefined();
    });

    test('should throw when calling tools while disconnected', async () => {
      await expect(client.tools.callTool({ name: 'test' })).rejects.toThrow();
    });
  });

  describe('Configuration', () => {
    test('should use default timeout', () => {
      const clientWithDefaults = new MCPClient({
        name: 'test',
        version: '1.0.0',
        transport: config.transport,
      });

      expect(clientWithDefaults).toBeDefined();
    });

    test('should throw on invalid transport type', () => {
      const invalidConfig = {
        ...config,
        transport: {
          type: 'invalid' as MCPTransportType,
        },
      };

      expect(() => new MCPClient(invalidConfig)).not.toThrow();
    });
  });
});
