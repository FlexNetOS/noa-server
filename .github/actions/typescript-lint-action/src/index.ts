import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as path from 'path';

async function run(): Promise<void> {
  try {
    const workingDir = core.getInput('working-directory') || '.';
    const eslintConfig = core.getInput('eslint-config') || '.eslintrc.json';
    const tsconfig = core.getInput('tsconfig') || 'tsconfig.json';
    const files = core.getInput('files') || 'packages/**/*.{ts,tsx} src/**/*.{ts,tsx} scripts/**/*.{ts,tsx}';
    const maxWarnings = core.getInput('max-warnings') || '0';

    core.info(`🔍 Running TypeScript ESLint in ${workingDir}`);
    core.info(`📁 Files: ${files}`);
    core.info(`⚙️  Config: ${eslintConfig}`);
    core.info(`📋 TSConfig: ${tsconfig}`);

    // Change to working directory
    const cwd = path.resolve(workingDir);
    core.info(`📂 Working directory: ${cwd}`);

    // Run ESLint with TypeScript support
    const eslintArgs = [
      files,
      '--ext', '.ts,.tsx',
      '--config', eslintConfig,
      '--max-warnings', maxWarnings,
      '--format', 'compact'
    ];

    // Add project flag if tsconfig exists
    eslintArgs.push('--project', tsconfig);

    const exitCode = await exec.exec('npx', ['eslint', ...eslintArgs], {
      cwd,
      ignoreReturnCode: true
    });

    if (exitCode === 0) {
      core.info('✅ TypeScript linting passed');
    } else if (exitCode === 1) {
      core.setFailed('❌ TypeScript linting failed with errors');
    } else {
      core.warning(`⚠️  TypeScript linting completed with warnings (exit code: ${exitCode})`);
    }

  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`Action failed with error: ${error.message}`);
    } else {
      core.setFailed('Action failed with unknown error');
    }
  }
}

run();
