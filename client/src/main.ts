import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/main.css";

import type { TemplateMetadata, Mistake, VocabularyItem } from "@kaiwa/shared";

import { api } from "./services/api";
import { ChatSocket } from "./services/socket";

type Message = {
  role: "user" | "ai";
  text: string;
  translation?: string | null;
  showTranslation?: boolean;
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
  characterStyle: string;
  isStartingSession: boolean;
  isAiResponding: boolean;
  wsConnected: boolean;
  selectedTemplateId?: string;
  sessionSummary?: string;
  // Admin authoring panel
  showAdmin: boolean;
  admin: {
    mode: "edit" | "new";
    selectedId?: string;
    language: string;
    level: "beginner" | "intermediate" | "advanced";
    scenario: string;
    startingPrompt: string;
    status?: string;
    error?: string;
  };
  adminMeta: {
    templates: any[];
    languages: string[];
    levels: string[];
    scenarios: { id: string; scenario: string }[];
  };
  // Navigation
  viewMode: "home" | "conversation" | "review" | "settings" | "admin";
  isSidebarCollapsed: boolean;
  adminTab: "prompts" | "config";
}

class KaiwaApp {
  private state: AppState;
  private root: HTMLElement;
  private socket: ChatSocket | null = null;
  private suspendRender = false;
  private bubbleClickHandler = (event: Event) => {
    const target = event.target as HTMLElement;
    const bubble = target.closest(".message-bubble.ai") as HTMLElement | null;
    if (!bubble) {
      return;
    }
    const indexAttr = bubble.getAttribute("data-index");
    if (!indexAttr) return;
    const index = Number.parseInt(indexAttr, 10);
    if (Number.isNaN(index)) return;
    this.toggleTranslation(index);
  };

  constructor(root: HTMLElement) {
    const storedToken = localStorage.getItem("kaiwa_token");
    const collapsedPref = localStorage.getItem("kaiwa_sidebar_collapsed");
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
      characterStyle: "kanji",
      isStartingSession: false,
      isAiResponding: false,
      wsConnected: false,
      selectedTemplateId: undefined,
      sessionSummary: undefined,
      showAdmin: false,
      admin: {
        mode: "edit",
        language: "japanese",
        level: "beginner",
        scenario: "",
        startingPrompt: "",
      },
      adminMeta: { templates: [], languages: [], levels: [], scenarios: [] },
      viewMode: "conversation",
      isSidebarCollapsed: collapsedPref === "true",
      adminTab: "prompts",
    };
  }

  async init() {
    // Avoid multiple renders during boot; batch state updates
    this.suspendRender = true;
    if (this.state.token) {
      await this.fetchAndPopulateSettings().catch(() => undefined);
      await this.loadTemplates();
    }
    // Restore admin tab from hash
    const hash = window.location.hash || "";
    if (hash.includes("#admin=")) {
      const tab = hash.split("#admin=")[1] as AppState["adminTab"];
      if (tab === "prompts" || tab === "config") {
        this.state.adminTab = tab;
      }
    }
    this.suspendRender = false;
    this.render();
  }

  private async loadTemplates() {
    try {
      const data = await api.listTemplates(this.state.language, this.state.level);
      this.setState({
        templates: data.templates,
        selectedTemplateId: data.templates[0]?.id,
        error: null,
      });
      // Keep admin meta in sync if visible
      if (this.state.showAdmin) {
        await this.loadAdminMeta();
      }
    } catch (error) {
      console.error(error);
      this.setState({ error: "Failed to load templates." });
    }
  }

  private setState(update: Partial<AppState>) {
    this.state = { ...this.state, ...update };
    if (!this.suspendRender) {
      this.render();
    }
  }

  private render() {
    const sideNav = this.renderSideNav();
    const mainContent = this.renderMainContent();
    const shellClass = `app-shell ${this.state.isSidebarCollapsed ? "is-collapsed" : ""}`;
    this.root.innerHTML = `
      <div class="${shellClass}">
        ${sideNav}
        <div class="main-pane">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h1 class="h5 mb-1"><span class="brand-label">Kaiwa</span></h1>
            </div>
            ${this.state.token ? `<button class="btn btn-outline-secondary btn-sm" id="logout-btn">Logout</button>` : ""}
          </div>
          ${this.state.error ? `<div class="alert alert-danger">${this.state.error}</div>` : ""}
          ${this.state.token ? mainContent : this.renderAuth()}
        </div>
      </div>
    `;

    if (!this.state.token) {
      this.bindAuthHandlers();
    } else {
      this.bindNavHandlers();
      this.bindViewHandlers();
    }

    this.scrollChatToBottom();
  }

  private renderSideNav() {
    const collapsed = this.state.isSidebarCollapsed ? "collapsed" : "";
    const link = (view: AppState["viewMode"], label: string) => {
      const active = this.state.viewMode === view ? "active" : "";
      const aria = this.state.viewMode === view ? 'aria-current="page"' : "";
      return `<a href="#" class="nav-link ${active}" data-view="${view}" title="${label}" ${aria}><span class="nav-label">${label}</span></a>`;
    };
    return `
      <aside class="side-nav ${collapsed}">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <span class="fw-semibold nav-label">Menu</span>
          <button id="nav-toggle" class="btn btn-sm btn-outline-secondary" aria-label="Toggle navigation" aria-pressed="${this.state.isSidebarCollapsed}">${
            this.state.isSidebarCollapsed ? "»" : "«"
          }</button>
        </div>
        <nav>
          <ul class="nav nav-pills flex-column gap-1">
            <li class="nav-item">${link("home", "Home")}</li>
            <li class="nav-item">${link("conversation", "Conversation")}</li>
            <li class="nav-item">${link("review", "Review")}</li>
            <li class="nav-item">${link("settings", "Settings")}</li>
            <li class="nav-item">${link("admin", "Admin")}</li>
          </ul>
        </nav>
      </aside>
    `;
  }

  private renderMainContent() {
    switch (this.state.viewMode) {
      case "home":
        return this.renderHome();
      case "conversation":
        return this.renderWorkspace();
      case "review":
        return this.renderReview();
      case "settings":
        return this.renderSettings();
      case "admin":
        return this.renderAdmin();
      default:
        return this.renderWorkspace();
    }
  }

  private renderHome() {
    return `<div class="card border-0 shadow-sm"><div class="card-body"><h2 class="h5 mb-2">Home</h2><p class="text-muted mb-0">Dashboard & progress will appear here.</p></div></div>`;
  }

  private renderReview() {
    return `<div class="card border-0 shadow-sm"><div class="card-body"><h2 class="h5 mb-2">Review</h2><p class="text-muted mb-0">Grammar and vocabulary drills will be available here.</p></div></div>`;
  }

  private renderSettings() {
    const loaded = !!this.state.token;
    return `
      <div class="card border-0 shadow-sm">
        <div class="card-body">
          <h2 class="h5 mb-3">Settings</h2>
          <form id="settings-form" class="row g-3">
            <div class="col-md-4">
              <label class="form-label">Language</label>
              <select class="form-select" name="targetLang" value="${this.state.language}">
                ${["japanese", "english", "spanish", "korean", "chinese"].map((l) => `<option value="${l}" ${this.state.language === l ? "selected" : ""}>${l}</option>`).join("")}
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label">Persona</label>
              <select class="form-select" name="persona" value="${this.state.persona}">
                <option value="encouraging" ${this.state.persona === "encouraging" ? "selected" : ""}>Encouraging</option>
                <option value="neutral" ${this.state.persona === "neutral" ? "selected" : ""}>Neutral</option>
                <option value="blunt" ${this.state.persona === "blunt" ? "selected" : ""}>Blunt</option>
                <option value="humorous" ${this.state.persona === "humorous" ? "selected" : ""}>Humorous</option>
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label">Strictness</label>
              <select class="form-select" name="strictness" value="${this.state.strictness}">
                <option value="gentle" ${this.state.strictness === "gentle" ? "selected" : ""}>Gentle</option>
                <option value="standard" ${this.state.strictness === "standard" ? "selected" : ""}>Standard</option>
                <option value="strict" ${this.state.strictness === "strict" ? "selected" : ""}>Strict</option>
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label">Output Script</label>
              <select class="form-select" name="renderMode" value="${this.state.characterStyle}">
                <option value="kanji" ${this.state.characterStyle === "kanji" ? "selected" : ""}>Kanji + Kana</option>
                <option value="hiragana" ${this.state.characterStyle === "hiragana" ? "selected" : ""}>Hiragana only</option>
                <option value="romaji" ${this.state.characterStyle === "romaji" ? "selected" : ""}>Romaji</option>
              </select>
            </div>
            <div class="col-12">
              <button class="btn btn-primary" ${!loaded ? "disabled" : ""}>Save Settings</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  private renderAdmin() {
    // Sub-navigation: Config (placeholder) and Prompts
    const tab = this.state.adminTab;
    const tabLink = (id: AppState["adminTab"], label: string) => {
      const active = tab === id ? "active" : "";
      return `<li class="nav-item"><a href="#" class="nav-link ${active}" data-admin-tab="${id}">${label}</a></li>`;
    };
    const body = tab === "config" ? this.renderAdminConfig() : this.renderAdminPanel();
    return `
      <div class="card border-0 shadow-sm">
        <div class="card-body">
          <ul class="nav nav-pills mb-3">
            ${tabLink("prompts", "Prompts")}
            ${tabLink("config", "Main Configuration")}
          </ul>
          ${body}
        </div>
      </div>
    `;
  }

  private renderAdminConfig() {
    return `<div class="text-muted">System/content settings coming soon.</div>`;
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

  private renderAdminPanel() {
    return `
      <div class="card border-0 shadow-sm">
        <div class="card-header d-flex justify-content-between align-items-center">
          <span class="fw-semibold">Admin Templates</span>
          <div class="form-check form-switch">
            <input class="form-check-input" type="checkbox" id="toggle-admin" ${
              this.state.showAdmin ? "checked" : ""
            }>
            <label class="form-check-label" for="toggle-admin">Show</label>
          </div>
        </div>
        ${
          this.state.showAdmin
            ? `<div class="card-body">
                ${this.state.admin.error ? `<div class="alert alert-danger">${this.state.admin.error}</div>` : ""}
                ${this.state.admin.status ? `<div class="alert alert-success">${this.state.admin.status}</div>` : ""}
                <form id="admin-form" class="row g-3">
                  <div class="col-12 d-flex gap-3 align-items-center">
                    <div class="btn-group" role="group">
                      <input type="radio" class="btn-check" name="mode" id="mode-edit" value="edit" ${
                        this.state.admin.mode === "edit" ? "checked" : ""
                      }>
                      <label class="btn btn-outline-secondary" for="mode-edit">Edit</label>
                      <input type="radio" class="btn-check" name="mode" id="mode-new" value="new" ${
                        this.state.admin.mode === "new" ? "checked" : ""
                      }>
                      <label class="btn btn-outline-secondary" for="mode-new">New</label>
                    </div>
                  </div>
                  ${
                    this.state.admin.mode === "edit"
                      ? `
                        <div class="col-md-4">
                          <label class="form-label">Language</label>
                          <select class="form-select" name="language">
                            ${this.state.adminMeta.languages.map((l) => `<option value="${l}" ${l === this.state.admin.language ? "selected" : ""}>${l}</option>`).join("")}
                          </select>
                        </div>
                        <div class="col-md-4">
                          <label class="form-label">Level</label>
                          <select class="form-select" name="level">
                            ${this.state.adminMeta.levels.map((lv) => `<option value="${lv}" ${lv === this.state.admin.level ? "selected" : ""}>${lv}</option>`).join("")}
                          </select>
                        </div>
                        <div class="col-md-4">
                          <label class="form-label">Scenario</label>
                          <select class="form-select" name="scenario">
                            ${this.state.adminMeta.scenarios.map((s) => `<option value="${s.id}" ${s.scenario === this.state.admin.scenario ? "selected" : ""}>${s.scenario}</option>`).join("")}
                          </select>
                        </div>
                        <div class="col-12">
                          <button class="btn btn-outline-secondary" data-action="load" type="button">Load</button>
                        </div>
                      `
                      : `
                        <div class="col-md-4">
                          <label class="form-label">Language</label>
                          <select class="form-select" name="language">
                            ${this.state.adminMeta.languages.map((l) => `<option value="${l}" ${l === this.state.admin.language ? "selected" : ""}>${l}</option>`).join("")}
                          </select>
                        </div>
                        <div class="col-md-4">
                          <label class="form-label">Level</label>
                          <select class="form-select" name="level">
                            ${["beginner", "intermediate", "advanced"].map((lv) => `<option value="${lv}" ${lv === this.state.admin.level ? "selected" : ""}>${lv}</option>`).join("")}
                          </select>
                        </div>
                        <div class="col-md-4">
                          <label class="form-label">Scenario</label>
                          <input class="form-control" name="scenario" value="${escapeHtml(this.state.admin.scenario)}" />
                        </div>
                      `
                  }
                  <div class="col-12">
                    <label class="form-label">Starting Prompt</label>
                    <textarea class="form-control" name="startingPrompt" rows="4">${escapeHtml(this.state.admin.startingPrompt)}</textarea>
                  </div>
                  <div class="col-12 d-flex gap-2">
                    ${this.state.admin.mode === "new" ? `<button class="btn btn-primary" data-action="create" type="button">Save New</button>` : `<button class="btn btn-primary" data-action="update" type="button">Save Changes</button>`}
                  </div>
                </form>
              </div>`
            : ""
        }
      </div>
    `;
  }

  private renderSessionForm() {
    const summary = `${this.state.language} • ${this.state.level} • ${this.state.persona} • ${this.state.strictness} • ${this.state.characterStyle}`;
    const hasScenario = Boolean(this.state.selectedTemplateId || (this.state.templates?.[0]?.id ?? ""));
    return `
      <div class="row g-3 align-items-end">
        <div class="col-12">
          <div class="small text-muted">Using Settings: ${summary} — <a href="#" data-go-settings>Change</a></div>
        </div>
        <div class="col-md-4">
          <label class="form-label">Scenario</label>
          <select class="form-select" name="scenarioId">
            ${(this.state.templates || [])
              .map(
                (template) =>
                  `<option value="${template.id}" ${
                    template.id === this.state.selectedTemplateId ? "selected" : ""
                  }>${template.summary}</option>`,
              )
              .join("")}
          </select>
        </div>
        <div class="col-12 col-lg-12 col-xl-12 d-grid">
          <form id="session-form">
            ${!hasScenario ? `<div class="text-danger small mb-2">Select a scenario to start.</div>` : ""}
            <button class="btn btn-primary" ${this.state.isStartingSession || !hasScenario ? "disabled" : ""}>
              ${this.state.isStartingSession ? "Starting..." : "Start Session"}
            </button>
          </form>
        </div>
      </div>
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
                (message, index) => `
                <div class="message-bubble ${message.role}" ${
                  message.role === "ai" ? `data-index="${index}"` : ""
                }>
                  ${escapeHtml(message.text)}
                  ${
                    message.role === "ai" && message.translation
                      ? `<div class="translation-hint text-muted small mt-2">${
                          message.showTranslation
                            ? "Translation shown below"
                            : "Click bubble to view translation"
                        }</div>`
                      : ""
                  }
                  ${
                    message.role === "ai" && message.translation && message.showTranslation
                      ? `<div class="translation-output mt-2 text-muted">${escapeHtml(message.translation)}</div>`
                      : ""
                  }
                </div>
              `,
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
            ${(() => {
              if (!this.state.mistakes.length) {
                return `<p class="text-muted small mb-0">No mistakes yet. Keep speaking!</p>`;
              }
              const groups = new Map<string, { m: any; count: number }>();
              for (const m of this.state.mistakes) {
                const key = `${m.type}|${m.message}|${m.correction}`.toLowerCase();
                const existing = groups.get(key);
                if (existing) existing.count += 1;
                else groups.set(key, { m, count: 1 });
              }
              return Array.from(groups.values())
                .map(
                  ({ m, count }) => `
                  <div class="mistake-item">
                    <div class="d-flex justify-content-between align-items-center">
                      <div>
                        <span class="badge bg-secondary">${m.type.toLowerCase()}</span>
                        ${m.subcategory ? `<span class="badge bg-info ms-1">${escapeHtml(m.subcategory)}</span>` : ""}
                      </div>
                      <div>
                        <span class="badge bg-light text-dark">${m.severity}</span>
                        ${count > 1 ? `<span class="badge bg-warning text-dark ms-1">${count}×</span>` : ""}
                      </div>
                    </div>
                    <p class="mb-1 mt-2">${escapeHtml(m.message)}</p>
                    <p class="mb-0 text-success"><strong>Fix:</strong> ${escapeHtml(m.correction)}</p>
                  </div>`,
                )
                .join("");
            })()}
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
                      `,
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
        const data = await api.signup(
          formData.get("email") as string,
          formData.get("password") as string,
        );
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
        const data = await api.login(
          formData.get("email") as string,
          formData.get("password") as string,
        );
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
      const formEl = document.querySelector('select[name="scenarioId"]') as HTMLSelectElement | null;
      const scenarioId = formEl?.value || this.state.selectedTemplateId || undefined;
      await this.startSession({
        persona: this.state.persona,
        strictness: this.state.strictness,
        characterStyle: this.state.characterStyle,
        scenarioId,
      });
    });

    // Settings shortcut
    const settingsLink = document.querySelector('[data-go-settings]') as HTMLAnchorElement | null;
    settingsLink?.addEventListener("click", (e) => {
      e.preventDefault();
      this.setState({ viewMode: "settings" });
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
        context: formData.get("context"),
      });
      vocabForm.reset();
    });

    const chatThread = document.getElementById("chat-thread");
    if (chatThread) {
      chatThread.removeEventListener("click", this.bubbleClickHandler);
      chatThread.addEventListener("click", this.bubbleClickHandler);
    }

    // Admin bindings
    const toggleAdmin = document.getElementById("toggle-admin") as HTMLInputElement | null;
    toggleAdmin?.addEventListener("change", (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      this.setState({
        showAdmin: checked,
        admin: { ...this.state.admin, status: undefined, error: undefined },
      });
      if (checked) {
        this.loadAdminMeta();
      }
    });

    const adminForm = document.getElementById("admin-form") as HTMLFormElement | null;
    adminForm?.addEventListener("click", async (event) => {
      const target = event.target as HTMLElement;
      if (!(target instanceof HTMLButtonElement)) return;
      const action = target.getAttribute("data-action");
      const formData = new FormData(adminForm);
      const language = String(formData.get("language") || "japanese").trim();
      const level = String(formData.get("level") || "beginner").trim() as AppState["admin"]["level"];
      const scenarioField = String(formData.get("scenario") || "").trim();
      const startingPrompt = String(formData.get("startingPrompt") || "");

      const setAdmin = (patch: Partial<AppState["admin"]>) =>
        this.setState({ admin: { ...this.state.admin, ...patch } });

      if (!this.state.token) {
        setAdmin({ error: "You must be logged in.", status: undefined });
        return;
      }

      try {
        if (action === "load") {
          const selectedId = scenarioField; // in edit mode, scenario select holds id
          const data = await api.getTemplate(selectedId);
          const t = data.template as TemplateMetadata;
          const userLine = t.starterTurns?.find((turn) => turn.role === "user")?.text ?? "";
          setAdmin({
            language: t.language,
            level: t.level as AppState["admin"]["level"],
            scenario: t.scenario,
            startingPrompt: userLine,
            selectedId: t.id,
            status: "Loaded.",
            error: undefined,
          });
          return;
        }

        if (action === "create") {
          const payload = { language, level, scenario: scenarioField, startingPrompt };
          await api.createTemplate(this.state.token, payload);
          setAdmin({ status: "Created.", error: undefined });
          await this.loadAdminMeta();
        } else if (action === "update") {
          const id = this.state.admin.selectedId;
          if (!id) {
            setAdmin({ error: "Load a template to update.", status: undefined });
            return;
          }
          const payload = { language, level, scenario: this.state.admin.scenario, startingPrompt };
          await api.updateTemplate(this.state.token, id, payload);
          setAdmin({ status: "Updated.", error: undefined });
          await this.loadAdminMeta();
        }
      } catch (error) {
        setAdmin({ error: (error as Error).message, status: undefined });
      }
    });

    adminForm?.addEventListener("change", (event) => {
      const target = event.target as HTMLInputElement | HTMLSelectElement | null;
      if (!target) return;
      const name = target.getAttribute("name");
      if (name === "mode") {
        const mode = (target as HTMLInputElement).value as "edit" | "new";
        this.setState({
          admin: { ...this.state.admin, mode, status: undefined, error: undefined },
        });
        return;
      }
      if (name === "language") {
        const language = (target as HTMLSelectElement).value;
        const templates = this.state.adminMeta.templates;
        const levels = Array.from(
          new Set(templates.filter((t: any) => t.language === language).map((t: any) => t.level)),
        );
        const level = (levels[0] as AppState["admin"]["level"]) || "beginner";
        const scenarios = templates
          .filter((t: any) => t.language === language && t.level === level)
          .map((t: any) => ({ id: t.id, scenario: t.scenario }));
        this.setState({
          admin: { ...this.state.admin, language, level, scenario: "", selectedId: undefined },
          adminMeta: { ...this.state.adminMeta, levels, scenarios },
        });
        return;
      }
      if (name === "level") {
        const level = (target as HTMLSelectElement).value as AppState["admin"]["level"];
        const templates = this.state.adminMeta.templates;
        const scenarios = templates
          .filter((t: any) => t.language === this.state.admin.language && t.level === level)
          .map((t: any) => ({ id: t.id, scenario: t.scenario }));
        this.setState({
          admin: { ...this.state.admin, level, scenario: "", selectedId: undefined },
          adminMeta: { ...this.state.adminMeta, scenarios },
        });
        return;
      }
      if (name === "scenario" && this.state.admin.mode === "edit") {
        const selectedId = (target as HTMLSelectElement).value;
        const selected = this.state.adminMeta.scenarios.find((s) => s.id === selectedId);
        this.setState({
          admin: { ...this.state.admin, selectedId, scenario: selected?.scenario || "" },
        });
      }
    });
  }

  private bindNavHandlers() {
    const nav = this.root.querySelector(".side-nav");
    nav?.addEventListener("click", async (e) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[data-view]') as HTMLAnchorElement | null;
      if (link) {
        e.preventDefault();
        const view = link.getAttribute("data-view") as AppState["viewMode"];
        console.log("[nav] click", { tag: target.tagName, view });
        const next: Partial<AppState> = { viewMode: view };
        if (view === "admin") {
          next.showAdmin = true;
          await this.loadAdminMeta();
        }
        this.setState(next);
      }
    });

    const toggle = document.getElementById("nav-toggle");
    toggle?.addEventListener("click", () => {
      const next = !this.state.isSidebarCollapsed;
      localStorage.setItem("kaiwa_sidebar_collapsed", String(next));
      this.setState({ isSidebarCollapsed: next });
      (toggle as HTMLButtonElement).setAttribute("aria-pressed", String(next));
      console.log("[nav] toggle", { collapsed: next });
    });
  }

  private bindViewHandlers() {
    if (this.state.viewMode === "conversation") {
      // Ensure templates reflect current settings defaults
      if (!this.state.templates.length) {
        this.loadTemplates();
      }
      this.bindWorkspaceHandlers();
    } else if (this.state.viewMode === "admin") {
      // Admin tab switching + data
      document.querySelectorAll('[data-admin-tab]').forEach((el) => {
        el.addEventListener("click", (e) => {
          e.preventDefault();
          const tab = (e.currentTarget as HTMLElement).getAttribute("data-admin-tab") as AppState["adminTab"];
          if (tab === "prompts" || tab === "config") {
            window.location.hash = `#admin=${tab}`;
            console.log("[admin] switch tab", { tab });
            this.setState({ adminTab: tab });
          }
        });
      });
      this.bindWorkspaceHandlers();
    } else if (this.state.viewMode === "settings") {
      if (this.state.token) {
        this.fetchAndPopulateSettings();
      }
      const form = document.getElementById("settings-form") as HTMLFormElement | null;
      form?.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!this.state.token) return;
        const fd = new FormData(form);
        const payload = {
          targetLang: String(fd.get("targetLang") || this.state.language),
          persona: String(fd.get("persona") || this.state.persona),
          strictness: String(fd.get("strictness") || this.state.strictness),
          renderMode: String(fd.get("renderMode") || this.state.characterStyle),
        };
        try {
          const result = await api.updateSettings(this.state.token, payload);
          this.setState({
            language: result.settings.targetLang,
            persona: result.settings.persona,
            strictness: result.settings.strictness,
            characterStyle: result.settings.renderMode,
            error: null,
          });
          // Refresh templates for new language
          await this.loadTemplates();
        } catch (err) {
          this.setState({ error: (err as Error).message });
        }
      });
    }
  }

  private async fetchAndPopulateSettings() {
    if (!this.state.token) return;
    try {
      const result = await api.getSettings(this.state.token);
      const s = result.settings ?? {};
      this.setState({
        language: s.targetLang ?? this.state.language,
        persona: s.persona ?? this.state.persona,
        strictness: s.strictness ?? this.state.strictness,
        characterStyle: s.renderMode ?? this.state.characterStyle,
      });
    } catch (e) {
      // Non-fatal; leave defaults
    }
  }

  private toggleTranslation(index: number) {
    const messages = this.state.messages.map((message, idx) =>
      idx === index && message.role === "ai" && message.translation
        ? { ...message, showTranslation: !message.showTranslation }
        : message,
    );
    this.setState({ messages });
  }

  private scrollChatToBottom() {
    const thread = document.getElementById("chat-thread");
    if (thread) {
      thread.scrollTop = thread.scrollHeight;
    }
  }

  private async loadAdminMeta() {
    try {
      const all = await api.listTemplates();
      const templates: any[] = all.templates ?? [];
      const fallbackLangs = ["japanese", "english", "spanish", "korean", "chinese"];
      const languages = Array.from(
        new Set([...fallbackLangs, ...templates.map((t: any) => t.language)]),
      );
      const levels = Array.from(
        new Set(
          templates
            .filter((t: any) => t.language === this.state.admin.language)
            .map((t: any) => t.level),
        ),
      );
      const scenarios = templates
        .filter(
          (t: any) =>
            t.language === this.state.admin.language && t.level === this.state.admin.level,
        )
        .map((t: any) => ({ id: t.id, scenario: t.scenario }));
      this.setState({ adminMeta: { templates, languages, levels, scenarios } });
    } catch (error) {
      this.setState({ admin: { ...this.state.admin, error: (error as Error).message } });
    }
  }

  private async startSession({
    persona,
    strictness,
    characterStyle,
    scenarioId,
  }: {
    persona: string;
    strictness: string;
    characterStyle: string;
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
        characterStyle,
        scenarioId,
      });

      const initialPrompt = this.buildInitialPrompt(template);
      this.setState({
        sessionId: session.id,
        persona,
        strictness,
        characterStyle,
        messages: [],
        mistakes: [],
        vocabulary: [],
        sessionSummary: template?.summary,
        selectedTemplateId: scenarioId,
        wsConnected: false,
        isAiResponding: false,
      });

      try {
        const sessionData = await api.getSession(this.state.token, session.id);
        this.setState({
          vocabulary: sessionData.session?.vocabulary ?? [],
        });
      } catch (fetchError) {
        console.error(fetchError);
        this.setState({ error: "Session started, but failed to sync vocabulary." });
      }

      await this.connectSocket(session.id, initialPrompt);
    } catch (error) {
      this.setState({ error: (error as Error).message });
    } finally {
      this.setState({ isStartingSession: false });
    }
  }

  private async connectSocket(sessionId: string, initialPrompt?: string) {
    if (!this.state.token) return;
    this.socket?.close();
    this.socket = new ChatSocket(this.state.token, sessionId);
    this.socket.on("chat_message", (payload) => {
      this.setState({
        messages: [
          ...this.state.messages,
          { role: "ai", text: payload.text, translation: payload.translation ?? null },
        ],
        isAiResponding: false,
      });
    });
    this.socket.on("mistakes_update", (payload) => {
      const normalized: Mistake[] = (payload ?? []).map((mistake: any) => ({
        ...mistake,
        type:
          typeof mistake.type === "string"
            ? ((mistake.type as string).toLowerCase() as Mistake["type"])
            : mistake.type,
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
      if (initialPrompt) {
        this.socket.sendSessionPrompt(initialPrompt);
      }
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
      messages: [...this.state.messages, { role: "user", text, translation: null }],
      isAiResponding: true,
      error: null,
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
        context: String(vocab.context ?? ""),
      };
      const result = await api.addVocabulary(this.state.token, this.state.sessionId, {
        phrase: payload.phrase,
        translation: payload.translation,
        context: payload.context,
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
      selectedTemplateId: undefined,
      characterStyle: "kanji",
    });
  }

  private buildInitialPrompt(template: TemplateMetadata | null | undefined) {
    if (!template) {
      return "Please begin a casual introduction in Japanese.";
    }
    const userLine = template.starterTurns?.find((turn) => turn.role === "user")?.text;
    if (userLine) {
      return userLine;
    }
    return `Please start a conversation about: ${template.summary}`;
  }
}

const root = document.getElementById("app");
if (!root) {
  throw new Error("Missing root element #app");
}

const app = new KaiwaApp(root);
app.init();
