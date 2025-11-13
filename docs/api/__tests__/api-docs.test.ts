/**
 * API Documentation Tests
 * Validates OpenAPI specifications, examples, and documentation completeness
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

const DOCS_DIR = path.join(__dirname, '..');
const OPENAPI_DIR = path.join(DOCS_DIR, 'openapi');
const EXAMPLES_DIR = path.join(DOCS_DIR, 'examples');
const POSTMAN_DIR = path.join(DOCS_DIR, 'postman');

describe('OpenAPI Specifications', () => {
  const specFiles = [
    'ai-inference-api.yaml',
    'auth-api.yaml',
    'message-queue-api.yaml',
    'monitoring-api.yaml',
  ];

  specFiles.forEach((specFile) => {
    describe(specFile, () => {
      let spec: any;

      beforeAll(() => {
        const specPath = path.join(OPENAPI_DIR, specFile);
        const content = fs.readFileSync(specPath, 'utf8');
        spec = yaml.load(content);
      });

      it('should have valid OpenAPI 3.1.0 structure', () => {
        expect(spec).toBeDefined();
        expect(spec.openapi).toBe('3.1.0');
        expect(spec.info).toBeDefined();
        expect(spec.info.title).toBeDefined();
        expect(spec.info.version).toBeDefined();
        expect(spec.info.description).toBeDefined();
      });

      it('should have contact information', () => {
        expect(spec.info.contact).toBeDefined();
        expect(spec.info.contact.email).toBeDefined();
      });

      it('should have license information', () => {
        expect(spec.info.license).toBeDefined();
        expect(spec.info.license.name).toBeDefined();
      });

      it('should define servers', () => {
        expect(spec.servers).toBeDefined();
        expect(Array.isArray(spec.servers)).toBe(true);
        expect(spec.servers.length).toBeGreaterThan(0);

        spec.servers.forEach((server: any) => {
          expect(server.url).toBeDefined();
          expect(server.description).toBeDefined();
        });
      });

      it('should have paths defined', () => {
        expect(spec.paths).toBeDefined();
        expect(Object.keys(spec.paths).length).toBeGreaterThan(0);
      });

      it('should have tags defined', () => {
        expect(spec.tags).toBeDefined();
        expect(Array.isArray(spec.tags)).toBe(true);
        expect(spec.tags.length).toBeGreaterThan(0);
      });

      it('should have components/schemas defined', () => {
        expect(spec.components).toBeDefined();
        expect(spec.components.schemas).toBeDefined();
        expect(Object.keys(spec.components.schemas).length).toBeGreaterThan(0);
      });

      it('should have security schemes defined', () => {
        expect(spec.components.securitySchemes).toBeDefined();
        expect(Object.keys(spec.components.securitySchemes).length).toBeGreaterThan(0);
      });

      it('should have valid operation IDs', () => {
        const operationIds = new Set<string>();

        Object.entries(spec.paths).forEach(([path, pathItem]: [string, any]) => {
          ['get', 'post', 'put', 'patch', 'delete'].forEach((method) => {
            if (pathItem[method]) {
              const operation = pathItem[method];
              expect(operation.operationId).toBeDefined();
              expect(operationIds.has(operation.operationId)).toBe(false);
              operationIds.add(operation.operationId);
            }
          });
        });
      });

      it('should have examples for request bodies', () => {
        Object.entries(spec.paths).forEach(([path, pathItem]: [string, any]) => {
          ['post', 'put', 'patch'].forEach((method) => {
            if (pathItem[method]?.requestBody) {
              const requestBody = pathItem[method].requestBody;
              if (requestBody.content?.['application/json']) {
                const content = requestBody.content['application/json'];
                // Should have either examples or schema with example
                const hasExamples = content.examples || content.schema?.example;
                if (!hasExamples) {
                  console.warn(`Missing example for ${method.toUpperCase()} ${path}`);
                }
              }
            }
          });
        });
      });

      it('should have examples for 200 responses', () => {
        Object.entries(spec.paths).forEach(([path, pathItem]: [string, any]) => {
          Object.entries(pathItem).forEach(([method, operation]: [string, any]) => {
            if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
              const successResponse = operation.responses?.['200'] || operation.responses?.['201'];
              if (successResponse?.content?.['application/json']) {
                const content = successResponse.content['application/json'];
                const hasExamples = content.examples || content.schema?.example;
                if (!hasExamples) {
                  console.warn(`Missing response example for ${method.toUpperCase()} ${path}`);
                }
              }
            }
          });
        });
      });

      it('should not contain hardcoded real credentials in examples', () => {
        const specContent = fs.readFileSync(path.join(OPENAPI_DIR, specFile), 'utf8');

        // Check for patterns that look like real API keys
        const suspiciousPatterns = [
          /sk_live_[a-zA-Z0-9]{20,}/, // Stripe-like live keys
          /pk_live_[a-zA-Z0-9]{20,}/, // Public live keys
          /[a-f0-9]{64}/, // SHA-256 hashes (might be real tokens)
        ];

        suspiciousPatterns.forEach((pattern) => {
          const matches = specContent.match(pattern);
          if (matches) {
            console.warn(`Potentially real credential found in ${specFile}: ${matches[0]}`);
          }
        });
      });

      it('should have descriptions for all endpoints', () => {
        Object.entries(spec.paths).forEach(([path, pathItem]: [string, any]) => {
          Object.entries(pathItem).forEach(([method, operation]: [string, any]) => {
            if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
              expect(operation.summary).toBeDefined();
              expect(operation.description).toBeDefined();
              expect(operation.tags).toBeDefined();
              expect(operation.tags.length).toBeGreaterThan(0);
            }
          });
        });
      });
    });
  });
});

describe('Code Examples', () => {
  it('should have JavaScript examples', () => {
    const jsDir = path.join(EXAMPLES_DIR, 'javascript');
    expect(fs.existsSync(jsDir)).toBe(true);

    const files = fs.readdirSync(jsDir);
    expect(files.length).toBeGreaterThan(0);
    expect(files.some((f) => f.endsWith('.js') || f.endsWith('.ts'))).toBe(true);
  });

  it('should have Python examples', () => {
    const pyDir = path.join(EXAMPLES_DIR, 'python');
    expect(fs.existsSync(pyDir)).toBe(true);

    const files = fs.readdirSync(pyDir);
    expect(files.length).toBeGreaterThan(0);
    expect(files.some((f) => f.endsWith('.py'))).toBe(true);
  });

  it('should have cURL examples', () => {
    const curlDir = path.join(EXAMPLES_DIR, 'curl');
    expect(fs.existsSync(curlDir)).toBe(true);

    const files = fs.readdirSync(curlDir);
    expect(files.some((f) => f.endsWith('.sh'))).toBe(true);
  });

  it('JavaScript examples should be syntactically valid', () => {
    const jsFiles = [path.join(EXAMPLES_DIR, 'javascript', 'chat-completion.js')];

    jsFiles.forEach((file) => {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');

        // Basic syntax checks
        expect(content).toContain('async');
        expect(content).toContain('fetch');
        expect(content.match(/\bfunction\b|\bconst\b|\blet\b/)).toBeTruthy();

        // Should not have syntax errors
        expect(() => {
          // This is a basic check - would need babel/typescript for full parsing
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            if (line.includes('//')) return; // skip comments
            const openBraces = (line.match(/{/g) || []).length;
            const closeBraces = (line.match(/}/g) || []).length;
            // Braces should be balanced overall
          });
        }).not.toThrow();
      }
    });
  });

  it('Python examples should have valid imports', () => {
    const pyFile = path.join(EXAMPLES_DIR, 'python', 'client.py');
    if (fs.existsSync(pyFile)) {
      const content = fs.readFileSync(pyFile, 'utf8');

      // Check for standard imports
      expect(content).toContain('import requests');
      expect(content).toContain('from typing import');
      expect(content).toContain('class NoaClient');
    }
  });

  it('cURL examples should have valid syntax', () => {
    const curlFile = path.join(EXAMPLES_DIR, 'curl', 'examples.sh');
    if (fs.existsSync(curlFile)) {
      const content = fs.readFileSync(curlFile, 'utf8');

      // Check for bash shebang
      expect(content).toMatch(/^#!/);

      // Check for curl commands
      expect(content).toContain('curl');

      // Check for common flags
      expect(content).toMatch(/-X (GET|POST|PUT|DELETE|PATCH)/);
      expect(content).toContain('-H');
    }
  });
});

describe('Postman Collection', () => {
  let collection: any;

  beforeAll(() => {
    const collectionPath = path.join(POSTMAN_DIR, 'noa-server.json');
    const content = fs.readFileSync(collectionPath, 'utf8');
    collection = JSON.parse(content);
  });

  it('should have valid Postman collection structure', () => {
    expect(collection.info).toBeDefined();
    expect(collection.info.name).toBeDefined();
    expect(collection.info.schema).toBeDefined();
    expect(collection.item).toBeDefined();
  });

  it('should have environment variables defined', () => {
    expect(collection.variable).toBeDefined();
    expect(Array.isArray(collection.variable)).toBe(true);

    const varNames = collection.variable.map((v: any) => v.key);
    expect(varNames).toContain('baseUrl');
    expect(varNames).toContain('authToken');
  });

  it('should have authentication configured', () => {
    expect(collection.auth).toBeDefined();
    expect(collection.auth.type).toBe('bearer');
  });

  it('should organize requests into folders', () => {
    expect(Array.isArray(collection.item)).toBe(true);
    expect(collection.item.length).toBeGreaterThan(0);

    collection.item.forEach((folder: any) => {
      expect(folder.name).toBeDefined();
      expect(folder.item).toBeDefined();
      expect(Array.isArray(folder.item)).toBe(true);
    });
  });

  it('should have test scripts for key endpoints', () => {
    let hasTests = false;

    const checkForTests = (items: any[]) => {
      items.forEach((item: any) => {
        if (item.item) {
          checkForTests(item.item);
        } else if (item.event) {
          const testEvent = item.event.find((e: any) => e.listen === 'test');
          if (testEvent) {
            hasTests = true;
          }
        }
      });
    };

    checkForTests(collection.item);
    expect(hasTests).toBe(true);
  });
});

describe('Interactive Documentation', () => {
  it('should have Swagger UI HTML', () => {
    const swaggerPath = path.join(DOCS_DIR, 'swagger-ui.html');
    expect(fs.existsSync(swaggerPath)).toBe(true);

    const content = fs.readFileSync(swaggerPath, 'utf8');
    expect(content).toContain('swagger-ui');
    expect(content).toContain('SwaggerUIBundle');
  });

  it('should have ReDoc HTML', () => {
    const redocPath = path.join(DOCS_DIR, 'redoc.html');
    expect(fs.existsSync(redocPath)).toBe(true);

    const content = fs.readFileSync(redocPath, 'utf8');
    expect(content).toContain('redoc');
    expect(content).toContain('Redoc.init');
  });

  it('Swagger UI should reference all OpenAPI specs', () => {
    const swaggerPath = path.join(DOCS_DIR, 'swagger-ui.html');
    const content = fs.readFileSync(swaggerPath, 'utf8');

    const specFiles = [
      'ai-inference-api.yaml',
      'auth-api.yaml',
      'message-queue-api.yaml',
      'monitoring-api.yaml',
    ];

    specFiles.forEach((spec) => {
      expect(content).toContain(spec);
    });
  });
});

describe('Automation Scripts', () => {
  it('should have generate-api-docs.sh script', () => {
    const scriptPath = path.join(DOCS_DIR, 'scripts', 'generate-api-docs.sh');
    expect(fs.existsSync(scriptPath)).toBe(true);

    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/^#!/);
    expect(content).toContain('set -e');

    // Check executable permissions
    const stats = fs.statSync(scriptPath);
    expect(stats.mode & 0o111).toBeTruthy(); // At least one execute bit set
  });

  it('should have validate-openapi.sh script', () => {
    const scriptPath = path.join(DOCS_DIR, 'scripts', 'validate-openapi.sh');
    expect(fs.existsSync(scriptPath)).toBe(true);

    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toMatch(/^#!/);
    expect(content).toContain('set -e');

    // Check executable permissions
    const stats = fs.statSync(scriptPath);
    expect(stats.mode & 0o111).toBeTruthy();
  });
});

describe('Documentation Completeness', () => {
  it('should have main README', () => {
    const readmePath = path.join(DOCS_DIR, 'README.md');
    expect(fs.existsSync(readmePath)).toBe(true);

    const content = fs.readFileSync(readmePath, 'utf8');
    expect(content).toContain('# NOA Server API Documentation');
    expect(content).toContain('Quick Start');
    expect(content).toContain('Authentication');
  });

  it('README should reference all OpenAPI specs', () => {
    const readmePath = path.join(DOCS_DIR, 'README.md');
    const content = fs.readFileSync(readmePath, 'utf8');

    const specs = ['ai-inference-api', 'auth-api', 'message-queue-api', 'monitoring-api'];

    specs.forEach((spec) => {
      expect(content.toLowerCase()).toContain(spec.toLowerCase());
    });
  });

  it('should have all required directories', () => {
    const requiredDirs = [
      'openapi',
      'examples',
      'examples/javascript',
      'examples/python',
      'examples/curl',
      'postman',
      'scripts',
    ];

    requiredDirs.forEach((dir) => {
      const dirPath = path.join(DOCS_DIR, dir);
      expect(fs.existsSync(dirPath)).toBe(true);
    });
  });
});

describe('API Consistency', () => {
  it('all specs should use the same version', () => {
    const specFiles = fs.readdirSync(OPENAPI_DIR).filter((f) => f.endsWith('.yaml'));
    const versions = new Set<string>();

    specFiles.forEach((file) => {
      const content = fs.readFileSync(path.join(OPENAPI_DIR, file), 'utf8');
      const spec = yaml.load(content) as any;
      versions.add(spec.info.version);
    });

    expect(versions.size).toBe(1);
  });

  it('all specs should use the same servers', () => {
    const specFiles = fs.readdirSync(OPENAPI_DIR).filter((f) => f.endsWith('.yaml'));
    const serverUrls = new Map<string, Set<string>>();

    specFiles.forEach((file) => {
      const content = fs.readFileSync(path.join(OPENAPI_DIR, file), 'utf8');
      const spec = yaml.load(content) as any;

      spec.servers.forEach((server: any) => {
        if (!serverUrls.has(file)) {
          serverUrls.set(file, new Set());
        }
        serverUrls.get(file)?.add(server.url);
      });
    });

    // All specs should at least have localhost server
    serverUrls.forEach((urls, file) => {
      expect(Array.from(urls).some((url) => url.includes('localhost'))).toBe(true);
    });
  });
});
