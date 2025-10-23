#!/usr/bin/env tsx
/**
 * AI-Powered Commit Message Generator
 * Uses llama.cpp neural processing to generate meaningful commit messages
 * Follows conventional commits format with intelligent analysis
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Types
interface CommitContext {
  taskId: string;
  taskDescription: string;
  agentType: string;
  commitType: string;
  commitScope: string;
  filesChanged: number;
  insertions: number;
  deletions: number;
  breakingChange: boolean;
  changedFiles: string[];
  diffStat: string;
}

interface CommitMessage {
  subject: string;
  body: string;
  footer: string;
}

// Configuration
const LLAMA_CPP_DIR =
  process.env.LLAMA_CPP_DIR || path.join(process.env.HOME!, 'noa-server/packages/llama.cpp');
const MODEL_PATH = process.env.LLM_MODEL_PATH || '';
const USE_NEURAL = process.env.USE_NEURAL_COMMITS !== 'false';

// Constants
const MAX_SUBJECT_LENGTH = 72;
const CONVENTIONAL_TYPES = [
  'feat',
  'fix',
  'docs',
  'style',
  'refactor',
  'perf',
  'test',
  'build',
  'ci',
  'chore',
  'revert',
];

/**
 * Generate commit message using llama.cpp neural processing
 */
async function generateNeuralCommitMessage(context: CommitContext): Promise<string | null> {
  if (!USE_NEURAL) {
    return null;
  }

  try {
    // Construct prompt for neural model
    const prompt = buildNeuralPrompt(context);

    // Call llama.cpp via Python bridge
    const httpBridge = path.join(LLAMA_CPP_DIR, 'shims/http_bridge.py');

    if (!fs.existsSync(httpBridge)) {
      console.error('llama.cpp HTTP bridge not found');
      return null;
    }

    // Prepare request
    const requestData = JSON.stringify({
      prompt,
      max_tokens: 150,
      temperature: 0.7,
      context_size: 2048,
    });

    // Execute neural processing
    const result = execSync(
      `python3 "${httpBridge}" chat --prompt "${prompt.replace(/"/g, '\\"')}" --max-tokens 150`,
      {
        cwd: LLAMA_CPP_DIR,
        encoding: 'utf-8',
        timeout: 30000,
        maxBuffer: 10 * 1024 * 1024,
      }
    );

    // Parse result
    const response = JSON.parse(result);
    const commitMsg = response.response?.trim();

    if (commitMsg && validateCommitMessage(commitMsg)) {
      return commitMsg;
    }

    return null;
  } catch (error) {
    console.error('Neural commit message generation failed:', error);
    return null;
  }
}

/**
 * Build prompt for neural model
 */
function buildNeuralPrompt(context: CommitContext): string {
  const fileList = context.changedFiles.slice(0, 10).join(', ');
  const moreFiles =
    context.changedFiles.length > 10 ? ` and ${context.changedFiles.length - 10} more` : '';

  return `You are a professional software developer writing a git commit message following the Conventional Commits specification.

Task: ${context.taskDescription}
Agent: ${context.agentType}
Type: ${context.commitType}${context.commitScope ? `(${context.commitScope})` : ''}

Changes:
- Files changed: ${context.filesChanged}
- Lines added: +${context.insertions}
- Lines deleted: -${context.deletions}
- Changed files: ${fileList}${moreFiles}
${context.breakingChange ? '- BREAKING CHANGE detected' : ''}

Write a concise, professional commit message in this format:

<type>(<scope>): <subject>

<body>

Format rules:
- Subject: max 72 characters, imperative mood, no period
- Body: explain what and why (not how)
- Use conventional commit type: ${context.commitType}
${context.commitScope ? `- Scope: ${context.commitScope}` : ''}
${context.breakingChange ? '- Include BREAKING CHANGE in body' : ''}

Generate only the commit message, nothing else:`;
}

/**
 * Validate commit message format
 */
function validateCommitMessage(message: string): boolean {
  const lines = message.trim().split('\n');
  if (lines.length === 0) {
    return false;
  }

  const subjectLine = lines[0];

  // Check format: type(scope): subject or type: subject
  const conventionalPattern =
    /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([^)]+\))?: .+$/;

  if (!conventionalPattern.test(subjectLine)) {
    return false;
  }

  // Check length
  if (subjectLine.length > MAX_SUBJECT_LENGTH) {
    return false;
  }

  return true;
}

/**
 * Generate template-based commit message (fallback)
 */
function generateTemplateCommitMessage(context: CommitContext): CommitMessage {
  // Build subject
  const scope = context.commitScope ? `(${context.commitScope})` : '';
  let subject = `${context.commitType}${scope}: ${context.taskDescription}`;

  // Truncate if needed
  if (subject.length > MAX_SUBJECT_LENGTH) {
    subject = subject.substring(0, MAX_SUBJECT_LENGTH - 3) + '...';
  }

  // Build body
  const bodyLines: string[] = [];
  bodyLines.push(`Agent: ${context.agentType}`);
  bodyLines.push(`Task ID: ${context.taskId}`);
  bodyLines.push('');
  bodyLines.push('Changes:');
  bodyLines.push(`- Files changed: ${context.filesChanged}`);
  bodyLines.push(`- Insertions: +${context.insertions}`);
  bodyLines.push(`- Deletions: -${context.deletions}`);

  if (context.breakingChange) {
    bodyLines.push('');
    bodyLines.push('BREAKING CHANGE: Review changes carefully for compatibility');
  }

  if (context.changedFiles.length > 0) {
    bodyLines.push('');
    bodyLines.push('Modified files:');
    context.changedFiles.slice(0, 5).forEach((file) => {
      bodyLines.push(`- ${file}`);
    });
    if (context.changedFiles.length > 5) {
      bodyLines.push(`- ... and ${context.changedFiles.length - 5} more`);
    }
  }

  const body = bodyLines.join('\n');

  // Build footer
  const agentName = context.agentType.charAt(0).toUpperCase() + context.agentType.slice(1);
  const agentEmail = `${context.agentType}@claude-code.anthropic.com`;

  const footer = `
Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: ${agentName} <${agentEmail}>`.trim();

  return { subject, body, footer };
}

/**
 * Main function
 */
async function main() {
  try {
    // Read context from stdin
    let inputData = '';

    // Check if running in pipe mode
    if (!process.stdin.isTTY) {
      // Read from stdin
      const chunks: Buffer[] = [];
      for await (const chunk of process.stdin) {
        chunks.push(chunk);
      }
      inputData = Buffer.concat(chunks).toString('utf-8');
    } else {
      // Read from arguments or environment
      inputData = process.argv[2] || process.env.COMMIT_CONTEXT || '{}';
    }

    const context: CommitContext = JSON.parse(inputData);

    // Try neural generation first
    let commitMessage: string | null = null;

    if (USE_NEURAL) {
      commitMessage = await generateNeuralCommitMessage(context);
    }

    // Fallback to template
    if (!commitMessage) {
      const template = generateTemplateCommitMessage(context);
      commitMessage = `${template.subject}\n\n${template.body}\n\n${template.footer}`;
    }

    // Output commit message
    console.log(commitMessage);
    process.exit(0);
  } catch (error) {
    console.error('Error generating commit message:', error);

    // Output minimal fallback
    console.log(
      'chore: automated commit\n\nGenerated with [Claude Code](https://claude.com/claude-code)'
    );
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { generateNeuralCommitMessage, generateTemplateCommitMessage, CommitContext, CommitMessage };
