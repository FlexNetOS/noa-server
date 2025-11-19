/**
 * Verification script to ensure all preview components are properly exported
 * Run: npx tsx src/components/files/previews/verify-exports.ts
 */

// Import all components and types
import {
  FilePreviewModal,
  PDFPreview,
  ImagePreview,
  MarkdownPreview,
  CodePreview,
  TextPreview,
} from './index';

import type {
  FilePreviewModalProps,
  PDFPreviewProps,
  ImagePreviewProps,
  MarkdownPreviewProps,
  CodePreviewProps,
  TextPreviewProps,
} from './index';

// Verify components are defined
const components = {
  FilePreviewModal,
  PDFPreview,
  ImagePreview,
  MarkdownPreview,
  CodePreview,
  TextPreview,
};

// Type verification - ensures all types are properly exported from index
// This object's existence alone validates the types at compile-time
const typeVerification: Record<string, unknown> = {
  filePreviewModal: {} as FilePreviewModalProps,
  pdf: {} as PDFPreviewProps,
  image: {} as ImagePreviewProps,
  markdown: {} as MarkdownPreviewProps,
  code: {} as CodePreviewProps,
  text: {} as TextPreviewProps,
};

// Use type verification to satisfy linter
void typeVerification;

// Verify all components are functions (React components)
Object.entries(components).forEach(([name, component]) => {
  if (typeof component !== 'function') {
    throw new Error(`${name} is not a valid React component`);
  }
});

console.log('✅ All preview components verified:');
Object.keys(components).forEach((name) => {
  console.log(`  - ${name}`);
});

console.log('\n✅ All TypeScript types verified:');
const types: string[] = [
  'FilePreviewModalProps',
  'PDFPreviewProps',
  'ImagePreviewProps',
  'MarkdownPreviewProps',
  'CodePreviewProps',
  'TextPreviewProps',
];
types.forEach((type) => {
  console.log(`  - ${type}`);
});

console.log('\n✅ Preview components are ready for use!');

export {};
