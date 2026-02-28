import { sendChatCompletion } from "../ai/openaiClient.js";
import { logger } from "../logger.js";
import type { ConversationTurn } from "./conversationService.js";

const SYSTEM_PROMPT = `You are a language proficiency evaluator.
You will be given a transcript of a conversation between a language learner and an AI partner.
Evaluate the learner's messages only (role: "user") and assess their proficiency level.
Return a single JSON object with no prose or markdown, exactly like:
{"suggestedLevel":"beginner"|"intermediate"|"advanced","rationale":"<one sentence explanation>"}
If the learner's proficiency clearly matches a different level than their current one, suggest the new level.
If the current level seems appropriate, return the current level.`;

export const assessProficiency = async (
  turns: ConversationTurn[],
  currentLevel: string,
  language: string,
): Promise<{ suggestedLevel: string; rationale: string } | null> => {
  const userTurns = turns.filter((t) => t.role === "user");
  if (userTurns.length < 5) return null;

  const transcript = turns
    .map((t) => `${t.role === "user" ? "Learner" : "Partner"}: ${t.text}`)
    .join("\n");

  try {
    const raw = await sendChatCompletion({
      systemPrompt: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Language: ${language}\nCurrent level: ${currentLevel}\n\nTranscript:\n${transcript}`,
        },
      ],
      temperature: 0.2,
    });

    const trimmed = raw.trim();
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    const json = start !== -1 && end > start ? trimmed.slice(start, end + 1) : trimmed;
    const result = JSON.parse(json);

    if (
      typeof result?.suggestedLevel !== "string" ||
      !["beginner", "intermediate", "advanced"].includes(result.suggestedLevel)
    ) {
      return null;
    }

    if (result.suggestedLevel === currentLevel) return null;

    logger.info({ currentLevel, suggestedLevel: result.suggestedLevel }, "level_assessment");
    return { suggestedLevel: result.suggestedLevel, rationale: result.rationale ?? "" };
  } catch (err) {
    logger.warn({ err }, "level_assessment_failed");
    return null;
  }
};
