type Handler = (payload: any) => void;

const WS_BASE = import.meta.env.VITE_WS_URL ?? "ws://localhost:4000";

export class ChatSocket {
  private ws?: WebSocket;
  private handlers: Record<string, Set<Handler>> = {};

  constructor(
    private token: string,
    private sessionId: string,
  ) {}

  connect() {
    return new Promise<void>((resolve, reject) => {
      this.ws = new WebSocket(`${WS_BASE}/ws/chat?token=${this.token}&sessionId=${this.sessionId}`);

      this.ws.onopen = () => resolve();
      this.ws.onerror = (event) => {
        reject(event);
      };
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.emit(message.type, message.payload);
        } catch (error) {
          console.error("Failed to parse WS payload", error);
        }
      };
      this.ws.onclose = () => {
        this.emit("close", null);
      };
    });
  }

  on(event: string, handler: Handler) {
    if (!this.handlers[event]) {
      this.handlers[event] = new Set();
    }
    this.handlers[event].add(handler);
  }

  off(event: string, handler: Handler) {
    this.handlers[event]?.delete(handler);
  }

  private emit(event: string, payload: any) {
    this.handlers[event]?.forEach((handler) => handler(payload));
  }

  sendUserMessage(text: string) {
    this.ws?.send(
      JSON.stringify({
        type: "user_message",
        payload: { text },
      }),
    );
  }

  sendSessionPrompt(text: string) {
    if (!text) return;
    this.ws?.send(
      JSON.stringify({
        type: "session_prompt",
        payload: { text },
      }),
    );
  }

  close() {
    this.ws?.close();
  }
}
