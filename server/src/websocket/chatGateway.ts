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
import { assessProficiency } from "../services/levelAssessmentService.js";
import { prisma } from "../db/prisma.js";
import { OpenAIUnavailableError } from "../ai/openaiClient.js";

const ASSESSMENT_INTERVAL = 10;

interface WsMessage {
  type: "user_message" | "add_vocab" | "session_prompt";
  payload: any;
}

export const registerChatGateway = (server: Server) => {
  const wss = new WebSocketServer({ server, path: "/ws/chat" });

  wss.on("connection", (socket, request) => {
    const url = new URL(request.url ?? "", "http://localhost");
    const token = url.searchParams.get("token");
    const sessionId = url.searchParams.get("sessionId");

    if (!token || !sessionId) {
      socket.close(4401, "Missing auth context");
      return;
    }

    // Register the message handler immediately (synchronously) so no messages
    // are lost while auth + DB setup runs asynchronously.
    const pendingMessages: string[] = [];
    let session: Awaited<ReturnType<typeof prisma.session.findFirst>> | null = null;
    let authComplete = false;

    const processMessage = async (raw: string) => {
      if (!session) return;
      try {
        const message = JSON.parse(raw) as WsMessage;
        if (message.type === "user_message") {
          await handleUserMessage({
            socket,
            text: message.payload.text,
            sessionId,
            language: session.language,
            level: session.level,
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
              level: session.level,
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
    };

    socket.on("message", async (raw) => {
      if (!authComplete) {
        pendingMessages.push(raw.toString());
        return;
      }
      await processMessage(raw.toString());
    });

    // Auth + DB lookup runs async; drain queued messages once ready
    (async () => {
      try {
        const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
        const found = await prisma.session.findFirst({
          where: { id: sessionId, userId: decoded.userId },
        });
        if (!found || found.status !== "ACTIVE") {
          socket.close(4401, "Session not found");
          return;
        }
        session = found;
        authComplete = true;
        for (const msg of pendingMessages) {
          await processMessage(msg);
        }
      } catch (error) {
        logger.error({ error }, "WS auth failed");
        socket.close(4401, "Invalid token");
      }
    })();
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
    level,
    persona,
    strictness,
    characterStyle,
  }: {
    socket: WebSocket;
    text: string;
    sessionId: string;
    language: string;
    level: string;
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
      level,
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

      if (turns.length % ASSESSMENT_INTERVAL === 0) {
        const assessment = await assessProficiency(
          turns.map((t) => ({ role: t.role === "user" ? "user" : "ai", text: t.text })),
          level,
          language,
        );
        if (assessment) {
          socket.send(JSON.stringify({ type: "level_suggestion", payload: assessment }));
        }
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
  const saved = await saveMistakes(inputs);
  // enrich with analysis-only fields for UI (not persisted yet)
  return saved.map((row, idx) => ({
    ...row,
    subcategory: findings[idx]?.subcategory,
    severityScore: findings[idx]?.severityScore,
    recommendedDrills: findings[idx]?.recommendedDrills,
    hash: `${row.type}|${row.message}|${row.correction}`.toLowerCase(),
  }));
};
