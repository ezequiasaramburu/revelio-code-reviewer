export interface DiffChunk {
  filename: string;
  language: string;
  content: string;
  startLine: number;
  endLine: number;
}

const LANG_MAP: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
  py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java',
};

export function chunkDiff(rawDiff: string, maxLines = 400): DiffChunk[] {
  if (!rawDiff.trim()) return [];
  return rawDiff.split(/^diff --git /m).filter(Boolean).flatMap(block => {
    const lines = block.split('\n');
    const filename = lines[0].split(' b/')[1] ?? lines[0];
    const firstHunk = lines.findIndex(l => l.startsWith('@@'));
    const header = lines.slice(0, firstHunk).join('\n');
    const hunks = lines.slice(firstHunk).join('\n').split(/^(?=@@)/m).filter(Boolean);
    const chunks: DiffChunk[] = [];
    let current: string[] = [], lineCount = 0, startLine = 1;

    const flush = () => {
      if (!current.length) return;
      chunks.push({
        filename, language: LANG_MAP[filename.split('.').pop() ?? ''] ?? 'plaintext',
        content: `diff --git a/${filename} b/${filename}\n${header}\n${current.join('\n')}`,
        startLine, endLine: startLine + lineCount,
      });
      startLine += lineCount; current = []; lineCount = 0;
    };

    for (const hunk of hunks) {
      const n = hunk.split('\n').length;
      if (lineCount + n > maxLines) flush();
      current.push(hunk); lineCount += n;
    }
    flush();
    return chunks;
  });
}