import { MCPToolManager, MCPToolUtils } from '../src/tools';
import { MCPTool, MCPToolCall, MCPToolResult, MCPTextContent, MCPImageContent } from '../src/types';

describe('MCPToolManager', () => {
  let toolManager: MCPToolManager;
  let mockSendRequest: jest.Mock;

  beforeEach(() => {
    mockSendRequest = jest.fn();
    toolManager = new MCPToolManager(mockSendRequest);
  });

  describe('Tool Discovery', () => {
    test('should list tools', async () => {
      const mockTools: MCPTool[] = [
        {
          name: 'test_tool',
          description: 'A test tool',
          inputSchema: {
            type: 'object',
            properties: {
              param: { type: 'string' },
            },
            required: ['param'],
          },
        },
      ];

      mockSendRequest.mockResolvedValue({ tools: mockTools });

      const tools = await toolManager.listTools();

      expect(tools).toEqual(mockTools);
      expect(mockSendRequest).toHaveBeenCalledWith('tools/list');
    });

    test('should cache tools', async () => {
      const mockTools: MCPTool[] = [
        {
          name: 'tool1',
          inputSchema: { type: 'object' },
        },
      ];

      mockSendRequest.mockResolvedValue({ tools: mockTools });

      await toolManager.listTools();

      expect(toolManager.hasTool('tool1')).toBe(true);
      expect(toolManager.getTool('tool1')).toEqual(mockTools[0]);
    });
  });

  describe('Tool Invocation', () => {
    beforeEach(() => {
      const mockTools: MCPTool[] = [
        {
          name: 'test_tool',
          inputSchema: {
            type: 'object',
            properties: {
              param: { type: 'string' },
            },
            required: ['param'],
          },
        },
      ];

      mockSendRequest.mockImplementation((method) => {
        if (method === 'tools/list') {
          return Promise.resolve({ tools: mockTools });
        }
        return Promise.resolve({
          content: [{ type: 'text', text: 'result' }],
        });
      });
    });

    test('should call tool with arguments', async () => {
      await toolManager.listTools();

      const call: MCPToolCall = {
        name: 'test_tool',
        arguments: { param: 'value' },
      };

      const result = await toolManager.callTool(call);

      expect(result.content).toHaveLength(1);
      expect(mockSendRequest).toHaveBeenCalledWith('tools/call', {
        name: 'test_tool',
        arguments: { param: 'value' },
      });
    });

    test('should validate required arguments', async () => {
      await toolManager.listTools();

      const call: MCPToolCall = {
        name: 'test_tool',
        arguments: {},
      };

      await expect(toolManager.callTool(call)).rejects.toThrow('Missing required argument');
    });

    test('should call multiple tools in sequence', async () => {
      await toolManager.listTools();

      const calls: MCPToolCall[] = [
        { name: 'test_tool', arguments: { param: 'value1' } },
        { name: 'test_tool', arguments: { param: 'value2' } },
      ];

      const results = await toolManager.callToolsSequence(calls);

      expect(results).toHaveLength(2);
    });
  });
});

describe('MCPToolUtils', () => {
  describe('Content Extraction', () => {
    test('should extract text content', () => {
      const result: MCPToolResult = {
        content: [
          { type: 'text', text: 'Hello' } as MCPTextContent,
          { type: 'text', text: 'World' } as MCPTextContent,
        ],
      };

      const texts = MCPToolUtils.extractTextContent(result);

      expect(texts).toEqual(['Hello', 'World']);
    });

    test('should extract image content', () => {
      const result: MCPToolResult = {
        content: [
          {
            type: 'image',
            data: 'base64data',
            mimeType: 'image/png',
          } as MCPImageContent,
        ],
      };

      const images = MCPToolUtils.extractImageContent(result);

      expect(images).toHaveLength(1);
      expect(images[0].mimeType).toBe('image/png');
    });

    test('should format result as string', () => {
      const result: MCPToolResult = {
        content: [{ type: 'text', text: 'Result text' } as MCPTextContent],
      };

      const formatted = MCPToolUtils.formatResult(result);

      expect(formatted).toBe('Result text');
    });

    test('should detect errors', () => {
      const errorResult: MCPToolResult = {
        content: [],
        isError: true,
      };

      expect(MCPToolUtils.hasError(errorResult)).toBe(true);
    });
  });

  describe('Tool Call Creation', () => {
    test('should create tool call', () => {
      const call = MCPToolUtils.createToolCall('my_tool', { arg: 'value' });

      expect(call.name).toBe('my_tool');
      expect(call.arguments).toEqual({ arg: 'value' });
    });
  });
});
