import type { PersonaTone, StrictnessLevel } from "@kaiwa/shared";

import { sendChatCompletion } from "../ai/openaiClient.js";

const personaPrompts: Record<PersonaTone, string> = {
  encouraging: "You are upbeat and supportive. Praise effort before corrections.",
  neutral: "You are professional and concise. Provide balanced feedback.",
  blunt: "You are direct and strict. Provide clear corrections without sugarcoating.",
  humorous: "You are playful and witty. Keep mood light while correcting mistakes."
};

const strictnessPrompts: Record<StrictnessLevel, string> = {
  gentle: "Only correct the most important mistakes and keep feedback brief.",
  standard: "Correct mistakes as they appear with short explanations.",
  strict: "Correct all mistakes with detailed explanations and follow-up questions."
};

export const buildSystemPrompt = ({
  persona,
  strictness,
  language
}: {
  persona: PersonaTone;
  strictness: StrictnessLevel;
  language: string;
}) => `You are Kaiwa, a language partner helping learners practice ${language}.
${personaPrompts[persona]}
${strictnessPrompts[strictness]}
Respond only in ${language} and encourage the learner to keep speaking.`;

export interface ConversationTurn {
  role: "user" | "ai";
  text: string;
}

export const generatePartnerResponse = async (input: {
  persona: PersonaTone;
  strictness: StrictnessLevel;
  language: string;
  turns: ConversationTurn[];
}) => {
  const systemPrompt = buildSystemPrompt(input);
  const messages = input.turns.map((turn) => ({
    role: turn.role === "user" ? "user" : "assistant",
    content: turn.text
  }));

  return sendChatCompletion({
    systemPrompt,
    messages
  });
};
