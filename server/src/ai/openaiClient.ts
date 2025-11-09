import OpenAI from "openai";

import { env } from "../env.js";
import { logger } from "../logger.js";

export class OpenAIUnavailableError extends Error {
  constructor() {
    super("OpenAI unavailable");
  }
}

const client = new OpenAI({
  apiKey: env.OPENAI_API_KEY
});

export interface ChatPromptPayload {
  systemPrompt: string;
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
  temperature?: number;
}

export const sendChatCompletion = async (payload: ChatPromptPayload) => {
  try {
    const response = await client.chat.completions.create(
      {
        model: env.OPENAI_MODEL,
        temperature: payload.temperature ?? 0.4,
        messages: [
          {
            role: "system",
            content: payload.systemPrompt
          },
          ...payload.messages
        ]
      },
      {
        timeout: env.OPENAI_TIMEOUT_MS
      }
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI returned empty response");
    }

    return content;
  } catch (error) {
    logger.error({ error }, "OpenAI request failed");
    throw new OpenAIUnavailableError();
  }
};
