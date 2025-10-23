import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ProviderType } from '../types';
import { ConfigurationManager, loadConfigFromEnvironment } from '../utils/config';

const ORIGINAL_ENV = { ...process.env };

describe('ConfigurationManager env var sanitation', () => {
  beforeEach(() => {
    // Reset configuration and env
    ConfigurationManager.getInstance().reset();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.AI_LLAMA_CPP_API_KEY;
    delete process.env.AI_LLAMA_CPP_BASE_URL;
    delete process.env.AI_LLAMA_CPP_DEFAULT_MODEL;
    delete process.env.AI_DEFAULT_PROVIDER;
  });

  afterEach(() => {
    ConfigurationManager.getInstance().reset();
    process.env = { ...ORIGINAL_ENV };
  });

  it('maps provider type "llama.cpp" to env prefix LLAMA_CPP', () => {
    process.env.AI_LLAMA_CPP_BASE_URL = 'http://example:8080';
    process.env.AI_LLAMA_CPP_DEFAULT_MODEL = 'llama-2-7b';
    process.env.AI_DEFAULT_PROVIDER = 'llama.cpp';

    loadConfigFromEnvironment('AI_');
    const cfg = ConfigurationManager.getInstance().getConfig();

    // There should be a provider config for llama.cpp with the baseURL and model we set
    const llama = cfg.providers.find(p => p.type === ProviderType.LLAMA_CPP);
    expect(llama).toBeTruthy();
    expect(llama!.baseURL).toBe('http://example:8080');
    expect(llama!.defaultModel).toBe('llama-2-7b');
    expect(cfg.defaultProvider).toBe('llama.cpp');
  });
});
