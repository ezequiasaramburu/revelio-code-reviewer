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

const RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };

export function parseReviewResponse(raw: string, minSeverity = 'medium'): ReviewComment[] {
  try {
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(item => CommentSchema.safeParse(item))
      .filter(r => r.success)
      .map(r => (r as { success: true; data: ReviewComment }).data)
      .filter(c => RANK[c.severity] >= RANK[minSeverity]);
  } catch {
    return [];
  }
}