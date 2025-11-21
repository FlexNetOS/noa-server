import axios from 'axios';
import { Readable } from 'stream';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LlamaCppProvider } from '../src/providers/llama-cpp';
import { ProviderType } from '../src/types';

function makeReadable(lines: string[]): Readable {
  const r = new Readable({
    read() {
      /* no-op */
    },
  });
  for (const l of lines) r.push(l + '\n');
  r.push(null);
  return r;
}

function makeReadableAsync(lines: string[]): Readable {
  const r = new Readable({
    read() {
      /* no-op */
    },
  });
  // Schedule pushes on next ticks to simulate chunks arriving over time
  lines.forEach((l, i) => {
    setTimeout(() => r.push(l + '\n'), i * 1);
  });
  setTimeout(() => r.push(null), lines.length * 1 + 2);
  return r;
}

function makeFakeClient(stream: Readable) {
  return {
    post: vi.fn(async (_url: string, _body: any, _opts: any) => ({ data: stream })),
    get: vi.fn(async (url: string) => {
      if (url === '/slots') return { data: [{ model: 'llama-2-7b' }] };
      return { data: {} };
    }),
    interceptors: {
      request: { use: (_f: any, _e?: any) => {} },
      response: { use: (_s: any, _e?: any) => {} },
    },
  } as any;
}

describe('LlamaCppProvider streaming', () => {
  const originalCreate = axios.create;

  afterEach(() => {
    (axios.create as any) = originalCreate;
    vi.restoreAllMocks();
  });

  it('handles SSE data: lines with stop flag', async () => {
    const stream = makeReadable([
      'data: {"content":"Hel","stop": false}',
      'data: {"content":"lo","stop": false}',
      'data: {"stop": true}',
    ]);
    const fake = makeFakeClient(stream);
    (axios.create as any) = vi.fn(() => fake);

    const provider = new LlamaCppProvider({
      baseURL: 'http://localhost:8080',
      timeout: 1000,
      type: ProviderType.LLAMA_CPP,
    });

    const req = {
      model: 'llama-2-7b',
      messages: [{ role: 'user' as const, content: 'Say hi' }],
      stream: true,
    };
    let text = '';
    let gotStop = false;
    for await (const chunk of provider.createChatCompletionStream(req)) {
      const part = chunk.choices[0];
      if (part.delta?.content) text += part.delta.content;
      if (part.finish_reason === 'stop') gotStop = true;
    }

    expect(text).toBe('Hello');
    expect(gotStop).toBe(true);
  });

  it('handles NDJSON lines', async () => {
    const stream = makeReadableAsync([
      '{"content":"Hel","stop": false}',
      '{"content":"lo","stop": false}',
      '{"stop": true}',
    ]);
    const fake = makeFakeClient(stream);
    (axios.create as any) = vi.fn(() => fake);

    const provider = new LlamaCppProvider({
      baseURL: 'http://localhost:8080',
      timeout: 1000,
      type: ProviderType.LLAMA_CPP,
    });

    const req = {
      model: 'llama-2-7b',
      messages: [{ role: 'user' as const, content: 'Say hi' }],
      stream: true,
    };
    let text = '';
    let gotStop = false;
    for await (const chunk of provider.createChatCompletionStream(req)) {
      const part = chunk.choices[0];
      if (part.delta?.content) text += part.delta.content;
      if (part.finish_reason === 'stop') gotStop = true;
    }

    expect(text).toBe('Hello');
    expect(gotStop).toBe(true);
  });
});
