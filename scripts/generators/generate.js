#!/usr/bin/env node
/**
 * Noa Server Code Generator
 *
 * Usage:
 *   pnpm generate:package <name>
 *   pnpm generate:mcp-server <name>
 *   pnpm generate:api-route <path>
 *   pnpm generate:component <name>
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✓ ${message}`, 'green');
}

function error(message) {
  log(`✗ ${message}`, 'red');
  process.exit(1);
}

function info(message) {
  log(`ℹ ${message}`, 'blue');
}

function warning(message) {
  log(`⚠ ${message}`, 'yellow');
}

// Template utilities
function renderTemplate(templatePath, variables) {
  let content = fs.readFileSync(templatePath, 'utf-8');

  // Replace variables in format {{variableName}}
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    content = content.replace(regex, value);
  }

  return content;
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    success(`Created directory: ${dirPath}`);
  }
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content);
  success(`Created file: ${filePath}`);
}

function toPascalCase(str) {
  return str
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

function toCamelCase(str) {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toKebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

// Generators
const generators = {
  package: function (name) {
    info(`Generating new package: ${name}`);

    const packagePath = path.join(process.cwd(), 'packages', name);
    const pascalName = toPascalCase(name);
    const kebabName = toKebabCase(name);

    // Create package structure
    ensureDir(packagePath);
    ensureDir(path.join(packagePath, 'src'));
    ensureDir(path.join(packagePath, 'tests'));
    ensureDir(path.join(packagePath, 'dist'));

    // package.json
    writeFile(
      path.join(packagePath, 'package.json'),
      JSON.stringify(
        {
          name: `@noa-server/${kebabName}`,
          version: '0.1.0',
          description: `${pascalName} package for Noa Server`,
          main: './dist/index.js',
          types: './dist/index.d.ts',
          scripts: {
            build: 'tsc',
            dev: 'tsc --watch',
            test: 'vitest',
            lint: 'eslint src',
            typecheck: 'tsc --noEmit',
          },
          keywords: ['noa-server', kebabName],
          author: 'Noa Server Team',
          license: 'MIT',
        },
        null,
        2
      )
    );

    // tsconfig.json
    writeFile(
      path.join(packagePath, 'tsconfig.json'),
      JSON.stringify(
        {
          extends: '../../tsconfig.base.json',
          compilerOptions: {
            outDir: './dist',
            rootDir: './src',
          },
          include: ['src/**/*'],
          exclude: ['node_modules', 'dist', 'tests'],
        },
        null,
        2
      )
    );

    // src/index.ts
    writeFile(
      path.join(packagePath, 'src', 'index.ts'),
      `/**
 * ${pascalName} Package
 *
 * Main entry point for @noa-server/${kebabName}
 */

export * from './types';
export * from './${kebabName}';
`
    );

    // src/types.ts
    writeFile(
      path.join(packagePath, 'src', 'types.ts'),
      `/**
 * Type definitions for ${pascalName}
 */

export interface ${pascalName}Config {
  // Add configuration options here
}

export interface ${pascalName}Options {
  // Add options here
}
`
    );

    // src/${kebabName}.ts
    writeFile(
      path.join(packagePath, 'src', `${kebabName}.ts`),
      `import { ${pascalName}Config, ${pascalName}Options } from './types';

/**
 * ${pascalName} class
 */
export class ${pascalName} {
  private config: ${pascalName}Config;

  constructor(config: ${pascalName}Config) {
    this.config = config;
  }

  /**
   * Initialize ${pascalName}
   */
  async initialize(options?: ${pascalName}Options): Promise<void> {
    // Implementation here
  }
}
`
    );

    // tests/${kebabName}.test.ts
    writeFile(
      path.join(packagePath, 'tests', `${kebabName}.test.ts`),
      `import { describe, it, expect } from 'vitest';
import { ${pascalName} } from '../src/${kebabName}';

describe('${pascalName}', () => {
  it('should initialize correctly', async () => {
    const instance = new ${pascalName}({});
    await instance.initialize();
    expect(instance).toBeDefined();
  });
});
`
    );

    // README.md
    writeFile(
      path.join(packagePath, 'README.md'),
      `# @noa-server/${kebabName}

${pascalName} package for Noa Server.

## Installation

\`\`\`bash
pnpm add @noa-server/${kebabName}
\`\`\`

## Usage

\`\`\`typescript
import { ${pascalName} } from '@noa-server/${kebabName}';

const instance = new ${pascalName}({
  // configuration
});

await instance.initialize();
\`\`\`

## API

### \`${pascalName}\`

Main class for ${kebabName} functionality.

## License

MIT
`
    );

    success(`Package '${name}' generated successfully at ${packagePath}`);
    info('Next steps:');
    info(`  1. cd packages/${name}`);
    info('  2. pnpm install');
    info('  3. pnpm build');
  },

  'mcp-server': function (name) {
    info(`Generating new MCP server: ${name}`);

    const serverPath = path.join(process.cwd(), 'mcp', 'servers', name);
    const pascalName = toPascalCase(name);

    ensureDir(serverPath);
    ensureDir(path.join(serverPath, 'tests'));

    // __init__.py
    writeFile(
      path.join(serverPath, '__init__.py'),
      `"""${pascalName} MCP Server"""
from .server import main

__version__ = "0.1.0"
__all__ = ["main"]
`
    );

    // server.py
    writeFile(
      path.join(serverPath, 'server.py'),
      `#!/usr/bin/env python3
"""
${pascalName} MCP Server

Provides MCP tools for ${name} functionality.
"""

import asyncio
import logging
from typing import Any

from mcp.server import Server
from mcp.server.stdio import stdio_server
from .tools import ${pascalName}Tools

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def main():
    """Main entry point for ${pascalName} MCP server."""
    server = Server("${name}")
    tools = ${pascalName}Tools()

    @server.list_tools()
    async def list_tools() -> list[dict[str, Any]]:
        """List available tools."""
        return await tools.list_tools()

    @server.call_tool()
    async def call_tool(name: str, arguments: dict[str, Any]) -> list[Any]:
        """Execute a tool."""
        return await tools.call_tool(name, arguments)

    logger.info(f"Starting ${pascalName} MCP server")
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream)


if __name__ == "__main__":
    asyncio.run(main())
`
    );

    // tools.py
    writeFile(
      path.join(serverPath, 'tools.py'),
      `"""
${pascalName} MCP Tools

Tool implementations for ${name} server.
"""

from typing import Any, List, Dict
import logging

logger = logging.getLogger(__name__)


class ${pascalName}Tools:
    """${pascalName} tool implementations."""

    def __init__(self):
        """Initialize ${pascalName} tools."""
        logger.info("Initializing ${pascalName} tools")

    async def list_tools(self) -> List[Dict[str, Any]]:
        """List available tools."""
        return [
            {
                "name": "example_tool",
                "description": "Example tool for ${name}",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "param": {
                            "type": "string",
                            "description": "Example parameter"
                        }
                    },
                    "required": ["param"]
                }
            }
        ]

    async def call_tool(self, name: str, arguments: Dict[str, Any]) -> List[Any]:
        """Execute a tool."""
        if name == "example_tool":
            return await self._example_tool(arguments)
        else:
            raise ValueError(f"Unknown tool: {name}")

    async def _example_tool(self, args: Dict[str, Any]) -> List[Any]:
        """Example tool implementation."""
        param = args.get("param")
        logger.info(f"Example tool called with param: {param}")

        return [{
            "type": "text",
            "text": f"Processed: {param}"
        }]
`
    );

    // tests/test_${name}.py
    writeFile(
      path.join(serverPath, 'tests', `test_${name}.py`),
      `"""
Tests for ${pascalName} MCP server
"""

import pytest
from ..tools import ${pascalName}Tools


@pytest.mark.asyncio
async def test_list_tools():
    """Test listing available tools."""
    tools = ${pascalName}Tools()
    tool_list = await tools.list_tools()

    assert len(tool_list) > 0
    assert tool_list[0]["name"] == "example_tool"


@pytest.mark.asyncio
async def test_example_tool():
    """Test example tool."""
    tools = ${pascalName}Tools()
    result = await tools.call_tool("example_tool", {"param": "test"})

    assert len(result) > 0
    assert "test" in result[0]["text"]
`
    );

    // README.md
    writeFile(
      path.join(serverPath, 'README.md'),
      `# ${pascalName} MCP Server

MCP server for ${name} functionality.

## Installation

\`\`\`bash
cd mcp/servers/${name}
pip install -r requirements.txt
\`\`\`

## Usage

\`\`\`bash
python -m mcp.servers.${name}.server
\`\`\`

## Tools

### \`example_tool\`

Example tool for ${name}.

**Parameters:**
- \`param\` (string, required): Example parameter

## Testing

\`\`\`bash
pytest tests/
\`\`\`
`
    );

    success(`MCP server '${name}' generated successfully at ${serverPath}`);
    info('Next steps:');
    info(`  1. cd mcp/servers/${name}`);
    info('  2. Implement your tools in tools.py');
    info('  3. Add tests in tests/');
    info('  4. Update mcp-servers-config.json');
  },

  'api-route': function (routePath) {
    info(`Generating new API route: ${routePath}`);

    const routeName = routePath.split('/').pop();
    const pascalName = toPascalCase(routeName);
    const kebabName = toKebabCase(routeName);

    const apiPath = path.join(process.cwd(), 'packages', 'noa-server', 'src', 'routes', kebabName);

    ensureDir(apiPath);

    // index.ts
    writeFile(
      path.join(apiPath, 'index.ts'),
      `import { Router } from 'express';
import { ${toCamelCase(routeName)}Controller } from './controller';
import { validate${pascalName} } from './validation';

const router = Router();

/**
 * @route GET /api${routePath}
 * @description Get all ${routeName}
 */
router.get('/', ${toCamelCase(routeName)}Controller.getAll);

/**
 * @route GET /api${routePath}/:id
 * @description Get ${routeName} by ID
 */
router.get('/:id', ${toCamelCase(routeName)}Controller.getById);

/**
 * @route POST /api${routePath}
 * @description Create new ${routeName}
 */
router.post('/', validate${pascalName}, ${toCamelCase(routeName)}Controller.create);

/**
 * @route PUT /api${routePath}/:id
 * @description Update ${routeName}
 */
router.put('/:id', validate${pascalName}, ${toCamelCase(routeName)}Controller.update);

/**
 * @route DELETE /api${routePath}/:id
 * @description Delete ${routeName}
 */
router.delete('/:id', ${toCamelCase(routeName)}Controller.delete);

export default router;
`
    );

    // controller.ts
    writeFile(
      path.join(apiPath, 'controller.ts'),
      `import { Request, Response, NextFunction } from 'express';
import { ${pascalName}Service } from './service';

class ${pascalName}Controller {
  private service: ${pascalName}Service;

  constructor() {
    this.service = new ${pascalName}Service();
  }

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const items = await this.service.findAll();
      res.json({ success: true, data: items });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const item = await this.service.findById(id);

      if (!item) {
        return res.status(404).json({ success: false, error: '${pascalName} not found' });
      }

      res.json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await this.service.create(req.body);
      res.status(201).json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const item = await this.service.update(id, req.body);

      if (!item) {
        return res.status(404).json({ success: false, error: '${pascalName} not found' });
      }

      res.json({ success: true, data: item });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.service.delete(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}

export const ${toCamelCase(routeName)}Controller = new ${pascalName}Controller();
`
    );

    // service.ts
    writeFile(
      path.join(apiPath, 'service.ts'),
      `import { ${pascalName} } from './types';

export class ${pascalName}Service {
  async findAll(): Promise<${pascalName}[]> {
    // TODO: Implement database query
    return [];
  }

  async findById(id: string): Promise<${pascalName} | null> {
    // TODO: Implement database query
    return null;
  }

  async create(data: Partial<${pascalName}>): Promise<${pascalName}> {
    // TODO: Implement database insert
    throw new Error('Not implemented');
  }

  async update(id: string, data: Partial<${pascalName}>): Promise<${pascalName} | null> {
    // TODO: Implement database update
    return null;
  }

  async delete(id: string): Promise<void> {
    // TODO: Implement database delete
  }
}
`
    );

    // types.ts
    writeFile(
      path.join(apiPath, 'types.ts'),
      `export interface ${pascalName} {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  // Add your fields here
}

export interface Create${pascalName}Input {
  // Add required fields
}

export interface Update${pascalName}Input {
  // Add optional fields
}
`
    );

    // validation.ts
    writeFile(
      path.join(apiPath, 'validation.ts'),
      `import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

const ${toCamelCase(routeName)}Schema = Joi.object({
  // Add validation rules
});

export function validate${pascalName}(req: Request, res: Response, next: NextFunction) {
  const { error } = ${toCamelCase(routeName)}Schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  next();
}
`
    );

    success(`API route '${routePath}' generated successfully`);
    info('Next steps:');
    info(`  1. Implement the service methods`);
    info(`  2. Add validation rules`);
    info(`  3. Register route in main app`);
    info(`  4. Add tests`);
  },

  component: function (name) {
    info(`Generating new React component: ${name}`);

    const pascalName = toPascalCase(name);
    const kebabName = toKebabCase(name);

    const componentPath = path.join(
      process.cwd(),
      'packages',
      'ui-dashboard',
      'src',
      'components',
      pascalName
    );

    ensureDir(componentPath);

    // index.tsx
    writeFile(
      path.join(componentPath, 'index.tsx'),
      `export { ${pascalName} } from './${pascalName}';
export type { ${pascalName}Props } from './${pascalName}';
`
    );

    // ${pascalName}.tsx
    writeFile(
      path.join(componentPath, `${pascalName}.tsx`),
      `import React from 'react';
import './${pascalName}.css';

export interface ${pascalName}Props {
  // Add props here
}

export const ${pascalName}: React.FC<${pascalName}Props> = (props) => {
  return (
    <div className="${kebabName}">
      <h2>${pascalName}</h2>
      {/* Component content */}
    </div>
  );
};
`
    );

    // ${pascalName}.css
    writeFile(
      path.join(componentPath, `${pascalName}.css`),
      `.${kebabName} {
  /* Add styles here */
}
`
    );

    // ${pascalName}.test.tsx
    writeFile(
      path.join(componentPath, `${pascalName}.test.tsx`),
      `import { render, screen } from '@testing-library/react';
import { ${pascalName} } from './${pascalName}';

describe('${pascalName}', () => {
  it('renders without crashing', () => {
    render(<${pascalName} />);
    expect(screen.getByText('${pascalName}')).toBeInTheDocument();
  });
});
`
    );

    success(`Component '${name}' generated successfully`);
    info('Next steps:');
    info(`  1. Implement component logic`);
    info(`  2. Add styles`);
    info(`  3. Write tests`);
    info(`  4. Export from index.ts if needed`);
  },
};

// CLI
const [, , command, ...args] = process.argv;

if (!command || !generators[command]) {
  error(`Unknown generator: ${command}`);
  console.log('\nAvailable generators:');
  Object.keys(generators).forEach((gen) => {
    console.log(`  - ${gen}`);
  });
  process.exit(1);
}

if (args.length === 0) {
  error(`Missing required argument for '${command}' generator`);
  process.exit(1);
}

try {
  generators[command](args[0]);
  log('\n✨ Generation complete!\n', 'bright');
} catch (err) {
  error(`Generation failed: ${err.message}`);
}
