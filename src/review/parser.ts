import { z } from 'zod';

const CommentSchema = z.object({
  filename: z.string(),
  line: z.number().int().positive(),
  category: z.enum(['bug', 'security', 'logic', 'architecture']),
  severity: z.enum(['high', 'medium', 'low']),
  title: z.string(),
  body: z.string(),
});

export type ReviewComment = z.infer<typeof CommentSchema>;

const RANK = { high: 3, medium: 2, low: 1 } as const;
type SeverityKey = keyof typeof RANK;

export function parseReviewResponse(raw: string, minSeverity: SeverityKey = 'medium'): ReviewComment[] {
  try {
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];
    const minRank = RANK[minSeverity];
    return parsed
      .map(item => CommentSchema.safeParse(item))
      .filter((r): r is { success: true; data: ReviewComment } => r.success)
      .map(r => r.data)
      .filter(c => RANK[c.severity] >= minRank);
  } catch {
    return [];
  }
}