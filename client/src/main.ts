import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/main.css";

import type { TemplateMetadata, Mistake, VocabularyItem } from "@kaiwa/shared";

import { api } from "./services/api";
import { ChatSocket } from "./services/socket";

type Message = {
  role: "user" | "ai";
  text: string;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

interface AppState {
  token: string | null;
  userEmail: string | null;
  templates: TemplateMetadata[];
  sessionId: string | null;
  messages: Message[];
  mistakes: Mistake[];
  vocabulary: VocabularyItem[];
  error: string | null;
  persona: string;
  strictness: string;
  level: string;
  language: string;
  isStartingSession: boolean;
  isAiResponding: boolean;
  wsConnected: boolean;
  selectedTemplateId?: string;
  sessionSummary?: string;
}

class KaiwaApp {
  private state: AppState;
  private root: HTMLElement;
  private socket: ChatSocket | null = null;

  constructor(root: HTMLElement) {
    const storedToken = localStorage.getItem("kaiwa_token");
    this.root = root;
    this.state = {
      token: storedToken,
      userEmail: null,
      templates: [],
      sessionId: null,
      messages: [],
      mistakes: [],
      vocabulary: [],
      error: null,
      persona: "encouraging",
      strictness: "standard",
      level: "beginner",
      language: "japanese",
      isStartingSession: false,
      isAiResponding: false,
      wsConnected: false,
      selectedTemplateId: undefined,
      sessionSummary: undefined
    };
  }

  async init() {
    if (this.state.token) {
      await this.loadTemplates();
    }
    this.render();
  }

  private async loadTemplates() {
    try {
      const data = await api.listTemplates(this.state.language, this.state.level);
      this.setState({
        templates: data.templates,
        selectedTemplateId: data.templates[0]?.id,
        error: null
      });
    } catch (error) {
      console.error(error);
      this.setState({ error: "Failed to load templates." });
    }
  }

  private setState(update: Partial<AppState>) {
    this.state = { ...this.state, ...update };
    this.render();
  }

  private render() {
    this.root.innerHTML = `
      <div class="container py-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 class="h3 mb-1">Kaiwa Practice Studio</h1>
            <p class="text-muted mb-0">AI language partner for real conversations.</p>
          </div>
          ${this.state.token ? `<button class="btn btn-outline-secondary" id="logout-btn">Logout</button>` : ""}
        </div>
        ${this.state.error ? `<div class="alert alert-danger">${this.state.error}</div>` : ""}
        ${this.state.token ? this.renderWorkspace() : this.renderAuth()}
      </div>
    `;

    if (!this.state.token) {
      this.bindAuthHandlers();
    } else {
      this.bindWorkspaceHandlers();
    }

    this.scrollChatToBottom();
  }

  private renderAuth() {
    return `
      <div class="row">
        <div class="col-lg-6 mb-4">
          <div class="card shadow-sm border-0">
            <div class="card-body">
              <h2 class="h5 mb-3">Create an account</h2>
              <form id="signup-form" class="vstack gap-3">
                <div>
                  <label class="form-label">Email</label>
                  <input type="email" name="email" class="form-control" required />
                </div>
                <div>
                  <label class="form-label">Password</label>
                  <input type="password" name="password" class="form-control" minlength="8" required />
                </div>
                <button class="btn btn-primary">Sign Up</button>
              </form>
            </div>
          </div>
        </div>
        <div class="col-lg-6 mb-4">
          <div class="card shadow-sm border-0">
            <div class="card-body">
              <h2 class="h5 mb-3">Log in</h2>
              <form id="login-form" class="vstack gap-3">
                <div>
                  <label class="form-label">Email</label>
                  <input type="email" name="email" class="form-control" required />
                </div>
                <div>
                  <label class="form-label">Password</label>
                  <input type="password" name="password" class="form-control" minlength="8" required />
                </div>
                <button class="btn btn-outline-primary">Log In</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderWorkspace() {
    return `
      <div class="mb-4">
        ${this.renderSessionForm()}
      </div>
      ${
        this.state.sessionId
          ? this.renderChatShell()
          : `<div class="card border-0 shadow-sm">
              <div class="card-body py-5 text-center text-muted">
                Start a session to begin practicing live conversations.
              </div>
            </div>`
      }
    `;
  }

  private renderSessionForm() {
    return `
      <form id="session-form" class="row g-3 align-items-end">
        <div class="col-md-3">
          <label class="form-label">Persona</label>
          <select class="form-select" name="persona" value="${this.state.persona}">
            <option value="encouraging" ${this.state.persona === "encouraging" ? "selected" : ""}>Encouraging</option>
            <option value="neutral" ${this.state.persona === "neutral" ? "selected" : ""}>Neutral</option>
            <option value="blunt" ${this.state.persona === "blunt" ? "selected" : ""}>Blunt</option>
            <option value="humorous" ${this.state.persona === "humorous" ? "selected" : ""}>Humorous</option>
          </select>
        </div>
        <div class="col-md-3">
          <label class="form-label">Strictness</label>
          <select class="form-select" name="strictness" value="${this.state.strictness}">
            <option value="gentle" ${this.state.strictness === "gentle" ? "selected" : ""}>Gentle</option>
            <option value="standard" ${this.state.strictness === "standard" ? "selected" : ""}>Standard</option>
            <option value="strict" ${this.state.strictness === "strict" ? "selected" : ""}>Strict</option>
          </select>
        </div>
        <div class="col-md-4">
          <label class="form-label">Scenario</label>
          <select class="form-select" name="scenarioId">
            ${(this.state.templates || [])
              .map(
                (template) =>
                  `<option value="${template.id}" ${
                    template.id === this.state.selectedTemplateId ? "selected" : ""
                  }>${template.summary}</option>`
              )
              .join("")}
          </select>
        </div>
        <div class="col-md-2 d-grid">
          <button class="btn btn-primary" ${this.state.isStartingSession ? "disabled" : ""}>
            ${this.state.isStartingSession ? "Starting..." : "Start Session"}
          </button>
        </div>
      </form>
    `;
  }

  private renderChatShell() {
    return `
      <div class="chat-shell">
        <div>
          ${
            this.state.sessionSummary
              ? `<div class="alert alert-info small">
                  Scenario: ${escapeHtml(this.state.sessionSummary)}
                </div>`
              : ""
          }
          <div class="chat-thread" id="chat-thread">
            ${this.state.messages
              .map(
                (message) => `
                <div class="message-bubble ${message.role}">
                  ${escapeHtml(message.text)}
                </div>
              `
              )
              .join("")}
            ${
              this.state.isAiResponding
                ? `<div class="text-muted small">Kaiwa is thinking...</div>`
                : ""
            }
          </div>
          <div class="composer mt-3">
            <form id="message-form" class="vstack gap-3">
              <textarea class="form-control" rows="3" placeholder="Type in Japanese..." ${
                !this.state.wsConnected ? "disabled" : ""
              }></textarea>
              <button class="btn btn-primary" ${!this.state.wsConnected ? "disabled" : ""}>
                Send
              </button>
            </form>
          </div>
        </div>
        <div class="side-panel">
          <h6 class="fw-bold">Corrections</h6>
          <div id="mistakes-panel">
            ${
              this.state.mistakes.length
                ? this.state.mistakes
                    .map(
                      (mistake) => `
                      <div class="mistake-item">
                        <div class="d-flex justify-content-between">
                          <span class="badge bg-secondary">${mistake.type.toLowerCase()}</span>
                          <span class="badge bg-light text-dark">${mistake.severity}</span>
                        </div>
                        <p class="mb-1 mt-2">${escapeHtml(mistake.message)}</p>
                        <p class="mb-0 text-success"><strong>Fix:</strong> ${escapeHtml(
                          mistake.correction
                        )}</p>
                      </div>
                    `
                    )
                    .join("")
                : `<p class="text-muted small mb-0">No mistakes yet. Keep speaking!</p>`
            }
          </div>
          <hr />
          <h6 class="fw-bold">Vocabulary Bank</h6>
          <div id="vocab-panel">
            ${
              this.state.vocabulary.length
                ? this.state.vocabulary
                    .map(
                      (vocab) => `
                        <div class="vocab-item">
                          <div class="fw-semibold">${escapeHtml(vocab.phrase)}</div>
                          <div class="text-muted small">${escapeHtml(vocab.translation)}</div>
                          <div class="small mt-2">${escapeHtml(vocab.context)}</div>
                        </div>
                      `
                    )
                    .join("")
                : `<p class="text-muted small mb-2">Vocabulary you add will appear here.</p>`
            }
          </div>
          <form id="vocab-form" class="vstack gap-2 mt-3">
            <input class="form-control" name="phrase" placeholder="Phrase" required ${
              !this.state.sessionId ? "disabled" : ""
            }/>
            <input class="form-control" name="translation" placeholder="Translation" required ${
              !this.state.sessionId ? "disabled" : ""
            }/>
            <textarea class="form-control" name="context" placeholder="Context sentence" rows="2" required ${
              !this.state.sessionId ? "disabled" : ""
            }></textarea>
            <button class="btn btn-outline-primary btn-sm" ${
              !this.state.sessionId ? "disabled" : ""
            }>Save vocab</button>
          </form>
        </div>
      </div>
    `;
  }

  private bindAuthHandlers() {
    const signupForm = document.getElementById("signup-form") as HTMLFormElement | null;
    signupForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(signupForm);
      try {
        const data = await api.signup(formData.get("email") as string, formData.get("password") as string);
        localStorage.setItem("kaiwa_token", data.token);
        this.setState({ token: data.token, userEmail: data.user.email, error: null });
        await this.loadTemplates();
      } catch (error) {
        this.setState({ error: (error as Error).message });
      }
    });

    const loginForm = document.getElementById("login-form") as HTMLFormElement | null;
    loginForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(loginForm);
      try {
        const data = await api.login(formData.get("email") as string, formData.get("password") as string);
        localStorage.setItem("kaiwa_token", data.token);
        this.setState({ token: data.token, userEmail: data.user.email, error: null });
        await this.loadTemplates();
      } catch (error) {
        this.setState({ error: (error as Error).message });
      }
    });
  }

  private bindWorkspaceHandlers() {
    const logoutBtn = document.getElementById("logout-btn");
    logoutBtn?.addEventListener("click", () => this.logout());

    const sessionForm = document.getElementById("session-form") as HTMLFormElement | null;
    sessionForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(sessionForm);
      const persona = (formData.get("persona") as string) ?? "encouraging";
      const strictness = (formData.get("strictness") as string) ?? "standard";
      const scenarioId = (formData.get("scenarioId") as string) || undefined;
      await this.startSession({ persona, strictness, scenarioId });
    });

    const messageForm = document.getElementById("message-form") as HTMLFormElement | null;
    messageForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      const textarea = messageForm.querySelector("textarea") as HTMLTextAreaElement;
      const text = textarea.value.trim();
      if (!text) return;
      this.handleSendMessage(text);
      textarea.value = "";
    });

    const vocabForm = document.getElementById("vocab-form") as HTMLFormElement | null;
    vocabForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(vocabForm);
      await this.saveVocabulary({
        phrase: formData.get("phrase"),
        translation: formData.get("translation"),
        context: formData.get("context")
      });
      vocabForm.reset();
    });
  }

  private scrollChatToBottom() {
    const thread = document.getElementById("chat-thread");
    if (thread) {
      thread.scrollTop = thread.scrollHeight;
    }
  }

  private async startSession({
    persona,
    strictness,
    scenarioId
  }: {
    persona: string;
    strictness: string;
    scenarioId?: string;
  }) {
    if (!this.state.token) return;
    this.setState({ isStartingSession: true, error: null });
    try {
      const { session, template } = await api.startSession(this.state.token, {
        language: this.state.language,
        level: this.state.level,
        persona,
        strictness,
        scenarioId
      });

      const starterMessages =
        template?.starterTurns?.map((turn: { role: "user" | "ai"; text: string }) => ({
          role: turn.role,
          text: turn.text
        })) ?? [];

      this.setState({
        sessionId: session.id,
        persona,
        strictness,
        messages: starterMessages,
        mistakes: [],
        vocabulary: [],
        sessionSummary: template?.summary,
        selectedTemplateId: scenarioId,
        wsConnected: false,
        isAiResponding: false
      });

      try {
        const sessionData = await api.getSession(this.state.token, session.id);
        this.setState({
          vocabulary: sessionData.session?.vocabulary ?? []
        });
      } catch (fetchError) {
        console.error(fetchError);
        this.setState({ error: "Session started, but failed to sync vocabulary." });
      }

      await this.connectSocket(session.id);
    } catch (error) {
      this.setState({ error: (error as Error).message });
    } finally {
      this.setState({ isStartingSession: false });
    }
  }

  private async connectSocket(sessionId: string) {
    if (!this.state.token) return;
    this.socket?.close();
    this.socket = new ChatSocket(this.state.token, sessionId);
    this.socket.on("chat_message", (payload) => {
      this.setState({
        messages: [...this.state.messages, { role: "ai", text: payload.text }],
        isAiResponding: false
      });
    });
    this.socket.on("mistakes_update", (payload) => {
      const normalized: Mistake[] = (payload ?? []).map((mistake: any) => ({
        ...mistake,
        type: typeof mistake.type === "string" ? ((mistake.type as string).toLowerCase() as Mistake["type"]) : mistake.type
      }));
      this.setState({ mistakes: [...normalized, ...this.state.mistakes] });
    });
    this.socket.on("vocab_update", (payload) => {
      const normalized: VocabularyItem[] = payload ?? [];
      this.setState({ vocabulary: [...normalized, ...this.state.vocabulary] });
    });
    this.socket.on("openai_error", (payload) => {
      this.setState({ error: payload.message, isAiResponding: false });
    });
    this.socket.on("error", (payload) => {
      this.setState({ error: payload?.message ?? "Chat error", isAiResponding: false });
    });
    this.socket.on("close", () => {
      this.setState({ wsConnected: false });
    });

    try {
      await this.socket.connect();
      this.setState({ wsConnected: true });
    } catch (error) {
      this.setState({ error: "Unable to connect to chat gateway." });
    }
  }

  private handleSendMessage(text: string) {
    if (!this.socket || !this.state.wsConnected) {
      this.setState({ error: "Chat not connected yet." });
      return;
    }
    this.socket.sendUserMessage(text);
    this.setState({
      messages: [...this.state.messages, { role: "user", text }],
      isAiResponding: true,
      error: null
    });
  }

  private async saveVocabulary(vocab: {
    phrase: FormDataEntryValue | null;
    translation: FormDataEntryValue | null;
    context: FormDataEntryValue | null;
  }) {
    if (!this.state.token || !this.state.sessionId) return;
    try {
      const payload = {
        phrase: String(vocab.phrase ?? ""),
        translation: String(vocab.translation ?? ""),
        context: String(vocab.context ?? "")
      };
      const result = await api.addVocabulary(this.state.token, this.state.sessionId, {
        phrase: payload.phrase,
        translation: payload.translation,
        context: payload.context
      });
      this.setState({ vocabulary: [...result.vocabulary, ...this.state.vocabulary], error: null });
    } catch (error) {
      this.setState({ error: (error as Error).message });
    }
  }

  private logout() {
    localStorage.removeItem("kaiwa_token");
    this.socket?.close();
    this.socket = null;
    this.setState({
      token: null,
      sessionId: null,
      messages: [],
      mistakes: [],
      vocabulary: [],
      wsConnected: false,
      selectedTemplateId: undefined
    });
  }
}

const root = document.getElementById("app");
if (!root) {
  throw new Error("Missing root element #app");
}

const app = new KaiwaApp(root);
app.init();
