import type { CharacterStyle, PersonaTone, StrictnessLevel } from "@kaiwa/shared";

import { sendChatCompletion } from "../ai/openaiClient.js";
import { logger } from "../logger.js";

const personaPrompts: Record<PersonaTone, string> = {
  encouraging: "You are upbeat and supportive. Praise effort before corrections.",
  neutral: "You are professional and concise. Provide balanced feedback.",
  blunt: "You are direct and strict. Provide clear corrections without sugarcoating.",
  humorous: "You are playful and witty. Keep mood light while correcting mistakes.",
};

const strictnessPrompts: Record<StrictnessLevel, string> = {
  gentle: "Only correct the most important mistakes and keep feedback brief.",
  standard: "Correct mistakes as they appear with short explanations.",
  strict: "Correct all mistakes with detailed explanations and follow-up questions.",
};

const characterPrompts: Record<CharacterStyle, string> = {
  kanji: "Respond using natural Japanese with kanji and kana as a native speaker would.",
  hiragana: "Respond using only hiragana (no kanji).",
  romaji: "Respond using romaji (latin characters) only.",
};

export const buildSystemPrompt = ({
  persona,
  strictness,
  language,
  characterStyle,
}: {
  persona: PersonaTone;
  strictness: StrictnessLevel;
  language: string;
  characterStyle: CharacterStyle;
}) => `You are Kaiwa, a language partner helping learners practice ${language}.
${personaPrompts[persona]}
${strictnessPrompts[strictness]}
${characterPrompts[characterStyle]}
Respond only in ${language} and encourage the learner to keep speaking.
Return a single JSON object (no prose, markdown, or explanation) exactly like:
{"reply":"<response in requested script>","translation":"<English translation>"}`;

export interface ConversationTurn {
  role: "user" | "ai";
  text: string;
}

export interface PartnerResponse {
  reply: string;
  translation?: string;
}

export const generatePartnerResponse = async (input: {
  persona: PersonaTone;
  strictness: StrictnessLevel;
  language: string;
  characterStyle: CharacterStyle;
  turns: ConversationTurn[];
}): Promise<PartnerResponse> => {
  const systemPrompt = buildSystemPrompt(input);
  const messages = input.turns.map((turn) => ({
    role: turn.role === "user" ? "user" : "assistant",
    content: turn.text,
  }));

  const raw = await sendChatCompletion({
    systemPrompt,
    messages,
  });

  logger.debug(
    {
      context: "conversationService.generatePartnerResponse",
      persona: input.persona,
      strictness: input.strictness,
      characterStyle: input.characterStyle,
      raw,
    },
    "OpenAI response",
  );

  return parsePartnerResponse(raw);
};

const parsePartnerResponse = (raw: string): PartnerResponse => {
  const tryParse = (input: string | null | undefined) => {
    if (!input) return null;
    try {
      const data = JSON.parse(input);
      if (typeof data === "object" && data !== null && typeof data.reply === "string") {
        return {
          reply: data.reply.trim(),
          translation:
            typeof data.translation === "string" && data.translation.length
              ? data.translation.trim()
              : undefined,
        };
      }
    } catch {
      return null;
    }
    return null;
  };

  const trimmed = raw.trim();
  const exact = tryParse(trimmed);
  if (exact) return exact;

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    const sliced = trimmed.slice(start, end + 1);
    const slicedResult = tryParse(sliced);
    if (slicedResult) return slicedResult;
  }

  return { reply: trimmed, translation: undefined };
};
