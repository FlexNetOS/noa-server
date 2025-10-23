/**
 * AI Provider Mock Server
 *
 * Lightweight HTTP server that mimics OpenAI and Claude APIs
 * for testing purposes. Supports:
 * - Chat completions (sync and streaming)
 * - Embeddings
 * - Configurable latency and failure rates
 * - Request logging and metrics
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { parse } from 'url';

interface MockConfig {
  latencyMs: number;
  failureRate: number;
  port: number;
}

interface ChatCompletionRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

interface EmbeddingRequest {
  model: string;
  input: string | string[];
}

export class AIProviderMock {
  private config: MockConfig;
  private server: ReturnType<typeof createServer> | null = null;
  private requestCount = 0;

  constructor(config: Partial<MockConfig> = {}) {
    this.config = {
      latencyMs: config.latencyMs ?? 100,
      failureRate: config.failureRate ?? 0,
      port: config.port ?? 8080,
    };
  }

  /**
   * Start the mock server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = createServer((req, res) => this.handleRequest(req, res));

      this.server.listen(this.config.port, () => {
        console.log(`Mock AI Provider running on port ${this.config.port}`);
        resolve();
      });

      this.server.on('error', reject);
    });
  }

  /**
   * Stop the mock server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('Mock AI Provider stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Handle incoming HTTP requests
   */
  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const parsedUrl = parse(req.url || '', true);
    const pathname = parsedUrl.pathname || '';

    // Health check endpoint
    if (pathname === '/health') {
      this.sendJson(res, 200, { status: 'healthy' });
      return;
    }

    // Metrics endpoint
    if (pathname === '/metrics') {
      this.sendJson(res, 200, { requestCount: this.requestCount });
      return;
    }

    // Chat completions endpoint
    if (pathname === '/v1/chat/completions') {
      await this.handleChatCompletion(req, res);
      return;
    }

    // Embeddings endpoint
    if (pathname === '/v1/embeddings') {
      await this.handleEmbeddings(req, res);
      return;
    }

    // Claude API endpoints
    if (pathname === '/v1/messages') {
      await this.handleClaudeMessages(req, res);
      return;
    }

    // 404 for unknown endpoints
    this.sendJson(res, 404, { error: 'Not found' });
  }

  /**
   * Handle chat completion requests
   */
  private async handleChatCompletion(req: IncomingMessage, res: ServerResponse): Promise<void> {
    this.requestCount++;

    // Simulate random failures
    if (Math.random() < this.config.failureRate) {
      this.sendJson(res, 500, { error: 'Simulated failure' });
      return;
    }

    // Parse request body
    const body = await this.readBody<ChatCompletionRequest>(req);

    // Simulate latency
    await this.sleep(this.config.latencyMs);

    // Handle streaming
    if (body.stream) {
      await this.sendStreamingResponse(res, body);
    } else {
      this.sendChatCompletionResponse(res, body);
    }
  }

  /**
   * Handle embeddings requests
   */
  private async handleEmbeddings(req: IncomingMessage, res: ServerResponse): Promise<void> {
    this.requestCount++;

    if (Math.random() < this.config.failureRate) {
      this.sendJson(res, 500, { error: 'Simulated failure' });
      return;
    }

    const body = await this.readBody<EmbeddingRequest>(req);
    await this.sleep(this.config.latencyMs);

    const inputs = Array.isArray(body.input) ? body.input : [body.input];
    const embeddings = inputs.map(() => this.generateMockEmbedding());

    this.sendJson(res, 200, {
      object: 'list',
      data: embeddings.map((embedding, index) => ({
        object: 'embedding',
        embedding,
        index,
      })),
      model: body.model,
      usage: {
        prompt_tokens: inputs.join(' ').split(' ').length,
        total_tokens: inputs.join(' ').split(' ').length,
      },
    });
  }

  /**
   * Handle Claude API messages endpoint
   */
  private async handleClaudeMessages(req: IncomingMessage, res: ServerResponse): Promise<void> {
    this.requestCount++;

    if (Math.random() < this.config.failureRate) {
      this.sendJson(res, 500, { error: 'Simulated failure' });
      return;
    }

    const body = await this.readBody<any>(req);
    await this.sleep(this.config.latencyMs);

    const lastMessage = body.messages[body.messages.length - 1];
    const responseContent = `Mock Claude response to: ${lastMessage.content}`;

    this.sendJson(res, 200, {
      id: `msg_${this.randomId()}`,
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: responseContent,
        },
      ],
      model: body.model,
      stop_reason: 'end_turn',
      usage: {
        input_tokens: 10,
        output_tokens: responseContent.split(' ').length,
      },
    });
  }

  /**
   * Send chat completion response
   */
  private sendChatCompletionResponse(res: ServerResponse, request: ChatCompletionRequest): void {
    const lastMessage = request.messages[request.messages.length - 1];
    const responseContent = `Mock response to: ${lastMessage.content}`;

    this.sendJson(res, 200, {
      id: `chatcmpl-${this.randomId()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: request.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: responseContent,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: responseContent.split(' ').length,
        total_tokens: 10 + responseContent.split(' ').length,
      },
    });
  }

  /**
   * Send streaming response
   */
  private async sendStreamingResponse(res: ServerResponse, request: ChatCompletionRequest): Promise<void> {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const lastMessage = request.messages[request.messages.length - 1];
    const responseContent = `Mock streaming response to: ${lastMessage.content}`;
    const words = responseContent.split(' ');
    const id = `chatcmpl-${this.randomId()}`;

    for (let i = 0; i < words.length; i++) {
      const chunk = {
        id,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: request.model,
        choices: [
          {
            index: 0,
            delta: {
              content: words[i] + (i < words.length - 1 ? ' ' : ''),
            },
            finish_reason: i === words.length - 1 ? 'stop' : null,
          },
        ],
      };

      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      await this.sleep(50); // Simulate streaming delay
    }

    res.write('data: [DONE]\n\n');
    res.end();
  }

  /**
   * Generate mock embedding vector
   */
  private generateMockEmbedding(): number[] {
    const dimension = 1536; // OpenAI ada-002 dimension
    return Array.from({ length: dimension }, () => Math.random() * 2 - 1);
  }

  /**
   * Read request body
   */
  private async readBody<T>(req: IncomingMessage): Promise<T> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
      req.on('error', reject);
    });
  }

  /**
   * Send JSON response
   */
  private sendJson(res: ServerResponse, status: number, data: any): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate random ID
   */
  private randomId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}

// Start mock server if run directly
if (require.main === module) {
  const port = parseInt(process.env.PORT || '8080');
  const latencyMs = parseInt(process.env.MOCK_LATENCY_MS || '100');
  const failureRate = parseFloat(process.env.MOCK_FAILURE_RATE || '0.0');

  const mock = new AIProviderMock({ port, latencyMs, failureRate });
  mock.start().catch(console.error);

  process.on('SIGINT', async () => {
    await mock.stop();
    process.exit(0);
  });
}
