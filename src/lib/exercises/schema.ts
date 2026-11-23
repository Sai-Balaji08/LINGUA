import { z } from "zod";

/** Zod schema for a learner's response. Every Server Action that accepts answers parses them with this first. */
export const responseSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("choice"), optionId: z.guid() }),
  z.object({ kind: z.literal("text"), text: z.string().max(1500) }),
  z.object({ kind: z.literal("order"), tokens: z.array(z.string().max(80)).max(40) }),
  z.object({ kind: z.literal("pairs"), pairs: z.record(z.string().max(200), z.string().max(200)).refine((p) => Object.keys(p).length <= 12, "Too many pairs.") }),
  z.object({ kind: z.literal("speech"), mode: z.literal("recognized"), transcript: z.string().max(400) }),
  z.object({ kind: z.literal("speech"), mode: z.literal("self"), rating: z.union([z.literal(1), z.literal(2), z.literal(3)]) }),
]);

export const answerSchema = z.object({
  exerciseId: z.guid(),
  response: responseSchema.nullable(),
  timeMs: z.number().int().min(0).max(30 * 60 * 1000).default(0),
});
export type AnswerInput = z.infer<typeof answerSchema>;
