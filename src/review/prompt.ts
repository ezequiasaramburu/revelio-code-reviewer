import { DiffChunk } from '../diff/chunker';

export const SYSTEM_PROMPT = `You are an expert code reviewer. Find real problems only.

REVIEW: bugs, security vulnerabilities, logic errors, architectural concerns.
IGNORE: formatting, naming, style, missing comments, minor refactors, nitpicks.
RULE: If you wouldn't block a PR merge for it, don't comment on it.

Respond ONLY with a valid JSON array — no prose, no markdown fences.

Schema:
[{ "filename": string, "line": number, "category": "bug"|"security"|"logic"|"architecture",
   "severity": "high"|"medium"|"low", "title": string, "body": string }]

If no issues found, respond with: []`;

export function buildUserPrompt(chunk: DiffChunk, categories: string[], minSeverity: string): string {
  return `Review this diff. Categories: ${categories.join(', ')}. Min severity: ${minSeverity}.

File: ${chunk.filename} (${chunk.language})

\`\`\`diff
${chunk.content}
\`\`\``;
}