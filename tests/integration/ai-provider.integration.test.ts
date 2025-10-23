import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProviderFactory } from '../../packages/ai-provider/src/utils/factory';
import { ConfigurationManager, createDefaultConfig } from '../../packages/ai-provider/src/utils/config';
import { ProviderType, type ModelInfo, type StreamingChunk } from '../../packages/ai-provider/src/types';

const mockLlamaPost = vi.fn(async (url: string, body: any) => {
  if (body?.stream) {
    return {
      data: (async function* () {
        yield Buffer.from('data: {"content":"Partial"}\n');
        yield Buffer.from('data: {"stop":true}\n');
      })(),
    };
  }

  if (url === '/completion') {
    return {
      data: {
        content: 'Llama says hi',
        id_slot: 0,
        stop: true,
        tokens_cached: 0,
        tokens_predicted: 5,
      },
    };
  }

  return { data: [] };
});

const mockLlamaGet = vi.fn(async () => ({ data: [] }));

const llamaModel: ModelInfo = {
  id: 'llama-3.1',
  name: 'Llama 3.1',
  provider: ProviderType.LLAMA_CPP,
  contextWindow: 4096,
  maxTokens: 2048,
  capabilities: [],
  metadata: {},
};

beforeEach(() => {
  vi.clearAllMocks();
  ConfigurationManager.getInstance().reset();
  Reflect.set(ProviderFactory as unknown as Record<string, unknown>, 'instance', undefined);
});

describe('AI Provider integration', () => {
  it('loads configuration and exercises llama.cpp provider stream', async () => {
    const configManager = ConfigurationManager.getInstance();
    const defaultConfig = createDefaultConfig();

    configManager.setConfig({
      ...defaultConfig,
      providers: [
        {
          type: ProviderType.LLAMA_CPP,
          baseURL: 'http://localhost:8000',
        },
      ],
      defaultProvider: ProviderType.LLAMA_CPP,
    });

    const providerConfig = configManager.getDefaultProviderConfig();
    expect(providerConfig?.type).toBe(ProviderType.LLAMA_CPP);

    const factory = ProviderFactory.getInstance({ defaultTimeout: 1000 });
    const llamaProvider = factory.createProvider({
      type: ProviderType.LLAMA_CPP,
      baseURL: 'http://localhost:8000',
      defaultModel: llamaModel.id,
    });

    Reflect.set(llamaProvider as unknown as Record<string, unknown>, 'client', {
      post: mockLlamaPost,
      get: mockLlamaGet,
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    });
    Reflect.set(llamaProvider as unknown as Record<string, unknown>, 'availableModels', [
      { id: llamaModel.id, name: llamaModel.name, contextWindow: llamaModel.contextWindow, maxTokens: llamaModel.maxTokens },
    ]);
    Reflect.set(llamaProvider as unknown as Record<string, unknown>, 'models', [llamaModel]);

    const completion = await llamaProvider.createChatCompletion({
      model: llamaModel.id,
      messages: [{ role: 'user', content: 'Give me a quick answer.' }],
    });
    expect(completion).toBeDefined();

    const stream = llamaProvider.createChatCompletionStream({
      model: llamaModel.id,
      messages: [{ role: 'user', content: 'Stream please' }],
    });

    const collected: string[] = [];
    for await (const chunk of stream) {
      collected.push((chunk as StreamingChunk).choices[0].delta.content ?? '');
    }
    expect(collected.join('')).toContain('Partial');

    expect(mockLlamaPost).toHaveBeenCalled();
  });
});
