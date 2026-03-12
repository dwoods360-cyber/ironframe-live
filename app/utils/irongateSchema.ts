import { z } from 'zod';

/**
 * Irongate DMZ — strict validation for threat registration ingress.
 * Prevents XSS and database bloat; loss must be pure integer string (BigInt-safe).
 */
export const threatIngressSchema = z.object({
  title: z.string().trim().min(1, 'title is required').max(100),
  source: z.string().trim().min(1, 'source is required').max(50),
  target: z.string().trim().min(1, 'target is required').max(50),
  loss: z.string().regex(/^\d+$/, 'loss must be a string of pure digits (no decimals or letters)'),
  notes: z.string().trim().max(500).optional(),
});

export type ThreatIngressPayload = z.infer<typeof threatIngressSchema>;

/**
 * Irongate DMZ — validation for analyst work notes (Add Note in drawer).
 * Allows empty submission to be rejected by caller; max length prevents bloat.
 */
export const workNoteSchema = z.object({
  text: z.string().trim().min(1, 'Note text is required').max(2000),
});
export type WorkNotePayload = z.infer<typeof workNoteSchema>;
