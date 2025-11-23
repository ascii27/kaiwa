import type { MistakeType } from "@kaiwa/shared";

import { sendChatCompletion } from "../ai/openaiClient.js";

interface MistakeResult {
  type: MistakeType;
  severity: "low" | "medium" | "high";
  message: string;
  correction: string;
  // Phase 2 optional enrichments
  subcategory?: string;
  severityScore?: number; // 0-1
  recommendedDrills?: string[];
}

export const analyzeMistakes = async (
  userText: string,
  language: string,
): Promise<MistakeResult[]> => {
  const prompt = `You are a language tutor analyzing a learner's latest message in ${language}.
Return up to 3 mistakes as a JSON array. Each item must include:
- type: one of grammar|pronunciation|vocabulary
- subcategory: a short tag such as particles, tense, word-choice, pitch-accent (optional when unclear)
- severity: low|medium|high
- severityScore: number between 0 and 1 (0.1 minor nit, 0.9 major)
- message: concise explanation of the mistake
- correction: corrected phrasing
- recommendedDrills: array of 1-2 short drill ideas
Only output JSON, no prose.`;

  const response = await sendChatCompletion({
    systemPrompt: prompt,
    messages: [
      {
        role: "user",
        content: userText,
      },
    ],
    temperature: 0.2,
  });

  try {
    const parsed = JSON.parse(response) as MistakeResult[];
    if (Array.isArray(parsed)) {
      // ensure shape
      return parsed
        .filter((m) => m && typeof m.message === "string" && typeof m.correction === "string")
        .slice(0, 3);
    }
    return [];
  } catch {
    return [];
  }
};
