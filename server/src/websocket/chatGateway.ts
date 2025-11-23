import type { Server } from "http";
import { WebSocketServer } from "ws";
import type { WebSocket } from "ws";
import jwt from "jsonwebtoken";

import type { CharacterStyle, PersonaTone, StrictnessLevel } from "@kaiwa/shared";

import { env } from "../env.js";
import { logger } from "../logger.js";
import {
  type MistakeInput,
  getRecentTurns,
  saveMistakes,
  saveTurn,
  saveVocabulary,
} from "../services/sessionService.js";
import { analyzeMistakes } from "../services/mistakeService.js";
import { generatePartnerResponse } from "../services/conversationService.js";
import { prisma } from "../db/prisma.js";
import { OpenAIUnavailableError } from "../ai/openaiClient.js";

interface WsMessage {
  type: "user_message" | "add_vocab" | "session_prompt";
  payload: any;
}

export const registerChatGateway = (server: Server) => {
  const wss = new WebSocketServer({ server, path: "/ws/chat" });

  wss.on("connection", async (socket, request) => {
    const url = new URL(request.url ?? "", "http://localhost");
    const token = url.searchParams.get("token");
    const sessionId = url.searchParams.get("sessionId");

    if (!token || !sessionId) {
      socket.close(4401, "Missing auth context");
      return;
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
      const session = await prisma.session.findFirst({
        where: { id: sessionId, userId: decoded.userId },
      });
      if (!session || session.status !== "ACTIVE") {
        socket.close(4401, "Session not found");
        return;
      }

      socket.on("message", async (raw) => {
        try {
          const message = JSON.parse(raw.toString()) as WsMessage;
          if (message.type === "user_message") {
            await handleUserMessage({
              socket,
              text: message.payload.text,
              sessionId,
              language: session.language,
              persona: toPersona(session.persona),
              strictness: toStrictness(session.strictness),
              characterStyle: toCharacterStyle(session.characterStyle),
            });
          } else if (message.type === "session_prompt") {
            await handleUserMessage(
              {
                socket,
                text: message.payload.text,
                sessionId,
                language: session.language,
                persona: toPersona(session.persona),
                strictness: toStrictness(session.strictness),
                characterStyle: toCharacterStyle(session.characterStyle),
              },
              { skipMistakes: true },
            );
          } else if (message.type === "add_vocab") {
            const vocab = await saveVocabulary([
              {
                sessionId,
                phrase: message.payload.phrase,
                translation: message.payload.translation,
                context: message.payload.context,
              },
            ]);
            socket.send(JSON.stringify({ type: "vocab_update", payload: vocab }));
          }
        } catch (error) {
          logger.error({ error }, "WS processing error");
          socket.send(JSON.stringify({ type: "error", payload: { message: "Invalid payload" } }));
        }
      });
    } catch (error) {
      logger.error({ error }, "WS auth failed");
      socket.close(4401, "Invalid token");
    }
  });
};

const toPersona = (value: string): PersonaTone => {
  return value.toLowerCase() as PersonaTone;
};

const toStrictness = (value: string): StrictnessLevel => {
  return value.toLowerCase() as StrictnessLevel;
};

const toCharacterStyle = (value: string): CharacterStyle => value.toLowerCase() as CharacterStyle;

const handleUserMessage = async (
  {
    socket,
    text,
    sessionId,
    language,
    persona,
    strictness,
    characterStyle,
  }: {
    socket: WebSocket;
    text: string;
    sessionId: string;
    language: string;
    persona: PersonaTone;
    strictness: StrictnessLevel;
    characterStyle: CharacterStyle;
  },
  options?: { skipMistakes?: boolean },
) => {
  const userTurn = await saveTurn(sessionId, "user", text);
  try {
    const turns = await getRecentTurns(sessionId);
    const response = await generatePartnerResponse({
      persona,
      strictness,
      language,
      characterStyle,
      turns: turns.map((turn) => ({
        role: turn.role === "user" ? "user" : "ai",
        text: turn.text,
        translation: turn.translation,
      })),
    });

    const aiTurn = await saveTurn(sessionId, "ai", response.reply, response.translation);
    socket.send(
      JSON.stringify({
        type: "chat_message",
        payload: {
          role: "ai",
          text: response.reply,
          turnId: aiTurn.id,
          translation: response.translation,
        },
      }),
    );

    if (!options?.skipMistakes) {
      const mistakes = await buildMistakes(sessionId, userTurn.id, text, language);
      if (mistakes.length) {
        socket.send(JSON.stringify({ type: "mistakes_update", payload: mistakes }));
      }
    }
  } catch (error) {
    if (error instanceof OpenAIUnavailableError) {
      socket.send(
        JSON.stringify({
          type: "openai_error",
          payload: { message: "OpenAI unavailable. Please try again later." },
        }),
      );
      return;
    }
    socket.send(
      JSON.stringify({
        type: "error",
        payload: { message: "Failed to process message." },
      }),
    );
  }
};

const buildMistakes = async (sessionId: string, turnId: string, text: string, language: string) => {
  const findings = await analyzeMistakes(text, language);
  const inputs: MistakeInput[] = findings.map((finding) => ({
    sessionId,
    turnId,
    type: (finding.type ?? "grammar") as MistakeInput["type"],
    severity: finding.severity,
    message: finding.message,
    correction: finding.correction,
  }));
  return saveMistakes(inputs);
};
