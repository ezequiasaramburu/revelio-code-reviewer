import { DiffChunk } from '../diff/chunker';

export function buildUserPrompt(chunk: DiffChunk, categories: string[], minSeverity: string): string {
  const activeCategories = categories.join(', ');

  return `You are reviewing a single diff chunk from a pull request.

Active categories: ${activeCategories || 'bug, security, logic, architecture'}
Minimum severity to report: ${minSeverity}

File: ${chunk.filename}
Language: ${chunk.language}

Diff to review (unified diff format):
"""diff
${chunk.content}
"""`;
}
