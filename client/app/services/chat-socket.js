import Service from "@ember/service";
import { inject as service } from "@ember/service";
import config from "client-ember/config/environment";
const WS_BASE = config.APP.WS_URL || "ws://localhost:4000";

export default class ChatSocketService extends Service {
  @service logger;

  ws = null;
  handlers = {};

  clearHandlers() {
    this.logger.debug("ws.clear_handlers");
    this.handlers = {};
  }

  connect(token, sessionId) {
    return new Promise((resolve, reject) => {
      const url = `${WS_BASE}/ws/chat?token=${token}&sessionId=${sessionId}`;
      this.logger.info("ws.connect", { url });
      this.ws = new WebSocket(url);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (event) => reject(event);
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.emit(message.type, message.payload);
        } catch (e) {
          this.logger.error("ws.parse_error", { message: e.message });
        }
      };
      this.ws.onclose = () => this.emit("close", null);
    });
  }

  on(event, handler) {
    if (!this.handlers[event]) this.handlers[event] = new Set();
    this.handlers[event].add(handler);
  }

  off(event, handler) {
    this.handlers[event]?.delete(handler);
  }

  emit(event, payload) {
    this.logger.debug("ws.emit", { event });
    this.handlers[event]?.forEach((h) => h(payload));
  }

  sendUserMessage(text) {
    this.ws?.send(JSON.stringify({ type: "user_message", payload: { text } }));
  }

  sendSessionPrompt(text) {
    if (!text) return;
    this.ws?.send(JSON.stringify({ type: "session_prompt", payload: { text } }));
  }

  close() {
    this.ws?.close();
  }
}
