import type { MistakeType } from "@kaiwa/shared";

import { sendChatCompletion } from "../ai/openaiClient.js";

interface MistakeResult {
  type: MistakeType;
  severity: "low" | "medium" | "high";
  message: string;
  correction: string;
}

export const analyzeMistakes = async (userText: string, language: string): Promise<MistakeResult[]> => {
  const prompt = `You are a language tutor analyzing a learner's latest message in ${language}.
Return up to 3 mistakes as JSON array with keys: type (grammar|pronunciation|vocabulary), severity (low|medium|high), message, correction.
If no mistakes, return an empty array. JSON ONLY.`;

  const response = await sendChatCompletion({
    systemPrompt: prompt,
    messages: [
      {
        role: "user",
        content: userText
      }
    ],
    temperature: 0.2
  });

  try {
    const parsed = JSON.parse(response) as MistakeResult[];
    if (Array.isArray(parsed)) {
      return parsed.slice(0, 3);
    }
    return [];
  } catch {
    return [];
  }
};
