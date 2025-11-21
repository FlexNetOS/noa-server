/**
 * Chat Export Utilities
 *
 * Export conversations to various formats:
 * - JSON with metadata
 * - Markdown for documentation
 * - Plain text for archival
 * - CSV for analysis
 */

import { chatHistoryDB } from '../stores/chatHistory.js';
import type {
  Conversation,
  Message,
  ExportOptions,
  ExportFormat,
} from '../types/chatHistory.js';

/**
 * Export conversation to specified format
 */
export async function exportConversation(
  conversationId: string,
  options: ExportOptions
): Promise<string> {
  const conversation = await chatHistoryDB.getConversation(conversationId);
  if (!conversation) {
    throw new Error(`Conversation ${conversationId} not found`);
  }

  const messagesResult = await chatHistoryDB.getMessages(conversationId, {
    page: 1,
    pageSize: 10000, // Get all messages
  });
  const messages = messagesResult.items;

  // Filter system messages if needed
  const filteredMessages = options.includeSystemMessages
    ? messages
    : messages.filter((m) => m.role !== 'system');

  switch (options.format) {
    case 'json':
      return exportToJSON(conversation, filteredMessages, options);
    case 'markdown':
      return exportToMarkdown(conversation, filteredMessages, options);
    case 'text':
      return exportToText(conversation, filteredMessages, options);
    case 'csv':
      return exportToCSV(conversation, filteredMessages, options);
    default:
      throw new Error(`Unsupported export format: ${options.format}`);
  }
}

/**
 * Export multiple conversations
 */
export async function exportConversations(
  conversationIds: string[],
  options: ExportOptions
): Promise<string> {
  const exports = await Promise.all(
    conversationIds.map((id) => exportConversation(id, options))
  );

  if (options.format === 'json') {
    return JSON.stringify(
      exports.map((e) => JSON.parse(e)),
      null,
      options.prettyPrint ? 2 : 0
    );
  }

  return exports.join('\n\n---\n\n');
}

/**
 * Export to JSON format
 */
function exportToJSON(
  conversation: Conversation,
  messages: Message[],
  options: ExportOptions
): string {
  const data = {
    conversation: options.includeMetadata
      ? conversation
      : {
          id: conversation.id,
          title: conversation.title,
          created_at: conversation.created_at,
          updated_at: conversation.updated_at,
        },
    messages: messages.map((m) =>
      options.includeMetadata
        ? m
        : {
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
          }
    ),
    exported_at: Date.now(),
  };

  return JSON.stringify(data, null, options.prettyPrint ? 2 : 0);
}

/**
 * Export to Markdown format
 */
function exportToMarkdown(
  conversation: Conversation,
  messages: Message[],
  options: ExportOptions
): string {
  const md: string[] = [];
  const mdOpts = options.markdownOptions || {};

  // Header
  md.push(`# ${conversation.title}\n`);

  // Metadata
  if (mdOpts.includeModelInfo && conversation.model) {
    md.push(`**Model:** ${conversation.model}\n`);
  }

  if (mdOpts.includeTimestamps) {
    md.push(
      `**Created:** ${new Date(conversation.created_at).toLocaleString()}\n`
    );
    md.push(
      `**Updated:** ${new Date(conversation.updated_at).toLocaleString()}\n`
    );
  }

  if (conversation.tags && conversation.tags.length > 0) {
    md.push(`**Tags:** ${conversation.tags.join(', ')}\n`);
  }

  md.push('\n---\n\n');

  // Messages
  for (const msg of messages) {
    const role = msg.role.charAt(0).toUpperCase() + msg.role.slice(1);
    md.push(`## ${role}\n\n`);

    if (mdOpts.includeTimestamps) {
      md.push(`*${new Date(msg.timestamp).toLocaleString()}*\n\n`);
    }

    md.push(`${msg.content}\n\n`);

    if (mdOpts.includeTokenCounts && msg.metadata?.tokens) {
      md.push(`*Tokens: ${msg.metadata.tokens}*\n\n`);
    }

    md.push('---\n\n');
  }

  return md.join('');
}

/**
 * Export to plain text format
 */
function exportToText(
  conversation: Conversation,
  messages: Message[],
  options: ExportOptions
): string {
  const lines: string[] = [];

  // Header
  lines.push(`=== ${conversation.title} ===`);
  lines.push('');

  if (options.includeMetadata) {
    lines.push(
      `Created: ${new Date(conversation.created_at).toLocaleString()}`
    );
    lines.push(
      `Updated: ${new Date(conversation.updated_at).toLocaleString()}`
    );
    if (conversation.model) {
      lines.push(`Model: ${conversation.model}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  // Messages
  for (const msg of messages) {
    const role = msg.role.toUpperCase();
    lines.push(`[${role}]`);

    if (options.includeMetadata) {
      lines.push(`Time: ${new Date(msg.timestamp).toLocaleString()}`);
    }

    lines.push('');
    lines.push(msg.content);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Export to CSV format
 */
function exportToCSV(
  conversation: Conversation,
  messages: Message[],
  options: ExportOptions
): string {
  const rows: string[] = [];

  // Header
  const headers = [
    'conversation_id',
    'conversation_title',
    'message_id',
    'timestamp',
    'role',
    'content',
  ];

  if (options.includeMetadata) {
    headers.push('tokens', 'latency', 'model');
  }

  rows.push(headers.join(','));

  // Data rows
  for (const msg of messages) {
    const row = [
      csvEscape(conversation.id),
      csvEscape(conversation.title),
      csvEscape(msg.id),
      new Date(msg.timestamp).toISOString(),
      msg.role,
      csvEscape(msg.content),
    ];

    if (options.includeMetadata) {
      row.push(
        msg.metadata?.tokens?.toString() || '',
        msg.metadata?.latency?.toString() || '',
        msg.metadata?.model || conversation.model || ''
      );
    }

    rows.push(row.join(','));
  }

  return rows.join('\n');
}

/**
 * Escape CSV value
 */
function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Download exported content as file
 */
export function downloadExport(
  content: string,
  filename: string,
  format: ExportFormat
): void {
  const mimeTypes: Record<ExportFormat, string> = {
    json: 'application/json',
    markdown: 'text/markdown',
    text: 'text/plain',
    csv: 'text/csv',
  };

  const blob = new Blob([content], { type: mimeTypes[format] });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Export conversation with automatic download
 */
export async function exportAndDownload(
  conversationId: string,
  options: ExportOptions
): Promise<void> {
  const content = await exportConversation(conversationId, options);
  const conversation = await chatHistoryDB.getConversation(conversationId);

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sanitizedTitle = conversation.title
    .replace(/[^a-z0-9]/gi, '-')
    .toLowerCase();

  const extensions: Record<ExportFormat, string> = {
    json: 'json',
    markdown: 'md',
    text: 'txt',
    csv: 'csv',
  };

  const filename = `${sanitizedTitle}-${timestamp}.${extensions[options.format]}`;
  downloadExport(content, filename, options.format);
}
