import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs/promises';
import path from 'path';

import { ProviderType } from '../src/types';
import {
  ConfigurationManager,
  createDefaultConfig,
  createProviderConfig,
  getModelManagerConfig,
} from '../src/utils/config';

const ORIGINAL_ENV = { ...process.env };

describe('ConfigurationManager core behaviours', () => {
  beforeEach(() => {
    ConfigurationManager.getInstance().reset();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(async () => {
    ConfigurationManager.getInstance().reset();
    process.env = { ...ORIGINAL_ENV };
  });

  it('tracks loaded state and supports direct set/get operations', () => {
    const manager = ConfigurationManager.getInstance();

    expect(manager.isLoaded()).toBe(false);

    const config = createDefaultConfig();
    config.providers = [
      createProviderConfig(ProviderType.OPENAI, {
        apiKey: 'key',
        defaultModel: 'gpt-test',
      }),
    ];
    config.defaultProvider = ProviderType.OPENAI;

    manager.setConfig(config);

    expect(manager.isLoaded()).toBe(true);
    const loaded = manager.getConfig();
    expect(loaded.providers).toHaveLength(1);
    expect(loaded.defaultProvider).toBe(ProviderType.OPENAI);

    const providerCfg = manager.getProviderConfig(ProviderType.OPENAI)!;
    expect(providerCfg.defaultModel).toBe('gpt-test');

    const defaultProviderCfg = manager.getDefaultProviderConfig()!;
    expect(defaultProviderCfg.type).toBe(ProviderType.OPENAI);
  });

  it('can add and remove provider configurations', () => {
    const manager = ConfigurationManager.getInstance();
    const base = createDefaultConfig();
    base.providers = [
      createProviderConfig(ProviderType.OPENAI, { apiKey: 'one' }),
    ];
    manager.setConfig(base);

    const claudeConfig = createProviderConfig(ProviderType.CLAUDE, { apiKey: 'two' });
    manager.addProviderConfig(claudeConfig);

    expect(manager.getProviderConfig(ProviderType.CLAUDE)).toBeDefined();

    const removed = manager.removeProviderConfig(ProviderType.OPENAI);
    expect(removed).toBe(true);
    expect(manager.getProviderConfig(ProviderType.OPENAI)).toBeUndefined();
  });

  it('exposes model manager configuration when present', () => {
    const manager = ConfigurationManager.getInstance();
    const base = createDefaultConfig();
    base.providers = [
      createProviderConfig(ProviderType.CLAUDE, { apiKey: 'key' }),
    ];
    base.modelManager = {
      defaultProvider: ProviderType.CLAUDE,
      autoLoadDefault: false,
      maxLoadedModels: 5,
    };

    manager.setConfig(base);

    const mm = getModelManagerConfig();
    expect(mm).toEqual({
      defaultProvider: ProviderType.CLAUDE,
      autoLoadDefault: false,
      maxLoadedModels: 5,
    });
  });

  it('reset clears configuration and causes getConfig to throw', () => {
    const manager = ConfigurationManager.getInstance();
    manager.setConfig(createDefaultConfig());
    expect(manager.isLoaded()).toBe(true);

    manager.reset();
    expect(manager.isLoaded()).toBe(false);
    expect(() => manager.getConfig()).toThrow(
      'Configuration not loaded. Call loadFromFile() or loadFromEnvironment() first.'
    );
  });

  it('wraps invalid configuration errors from validateAndSetConfig', () => {
    const manager = ConfigurationManager.getInstance();
    expect(() => manager.setConfig({} as any)).toThrow(/Invalid configuration:/);
  });

  it('loadFromFile reads and validates configuration from disk', async () => {
    const tmpPath = path.join(process.cwd(), 'tmp-ai-provider-config.json');

    const fileConfig = createDefaultConfig();
    fileConfig.providers = [
      createProviderConfig(ProviderType.OPENAI, {
        apiKey: 'file-key',
        defaultModel: 'gpt-file',
      }),
    ];
    fileConfig.defaultProvider = ProviderType.OPENAI;

    await fs.writeFile(tmpPath, JSON.stringify(fileConfig), 'utf-8');

    const manager = ConfigurationManager.getInstance();
    await manager.loadFromFile(tmpPath);

    const loaded = manager.getConfig();
    expect(loaded.providers[0].type).toBe(ProviderType.OPENAI);
    expect(loaded.defaultProvider).toBe(ProviderType.OPENAI);

    await fs.rm(tmpPath, { force: true });
  });

  it('loadFromFile surfaces path information when the file is missing', async () => {
    const manager = ConfigurationManager.getInstance();

    await expect(
      manager.loadFromFile('/tmp/ai-provider/non-existent-config.json')
    ).rejects.toThrow(/Failed to load configuration from .*non-existent-config.json/);
  });

  it('saveToFile persists current configuration to disk', async () => {
    const tmpPath = path.join(process.cwd(), 'tmp-ai-provider-saved.json');

    const manager = ConfigurationManager.getInstance();
    const cfg = createDefaultConfig();
    cfg.providers = [
      createProviderConfig(ProviderType.OPENAI, { apiKey: 'save-key' }),
    ];
    cfg.defaultProvider = ProviderType.OPENAI;
    manager.setConfig(cfg);

    await manager.saveToFile(tmpPath);

    const raw = await fs.readFile(tmpPath, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.providers[0].type).toBe('openai');

    await fs.rm(tmpPath, { force: true });
  });

  it('createProviderConfig merges overrides with provider defaults', () => {
    const cfg = createProviderConfig(ProviderType.LLAMA_CPP, {
      baseURL: 'http://example:1234',
      timeout: 1234,
    });

    expect(cfg.type).toBe(ProviderType.LLAMA_CPP);
    expect(cfg.baseURL).toBe('http://example:1234');
    expect(cfg.timeout).toBe(1234);
    expect(cfg.maxRetries).toBeDefined();
  });
});
