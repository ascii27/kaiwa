import Controller from "@ember/controller";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";

export default class ConversationController extends Controller {
  @service api;
  @service session;
  @service settings;
  @service logger;
  @service("chat-socket") chat;

  @tracked selectedTemplateId = null;
  @tracked sessionId = null;
  @tracked sessionSummary = null;
  @tracked messages = [];
  @tracked _mistakesMap = {};
  @tracked vocabulary = [];
  @tracked wsConnected = false;
  @tracked isStarting = false;
  @tracked isAiResponding = false;
  @tracked error = null;
  @tracked levelSuggestion = null;

  constructor() {
    super(...arguments);
  }

  get canStart() {
    return Boolean(this.selectedTemplateId || this.model?.templates?.[0]?.id);
  }

  get isStartDisabled() {
    return this.isStarting || !this.canStart;
  }

  get isChatDisabled() {
    return !this.wsConnected;
  }

  get sortedMistakes() {
    return Object.values(this._mistakesMap).sort((a, b) => {
      if (b.recurrence !== a.recurrence) return b.recurrence - a.recurrence;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }

  @action selectScenario(e) {
    this.selectedTemplateId = e.target.value;
  }

  @action async startSession(e) {
    e?.preventDefault?.();
    if (!this.session.token) {
      this.error = "You must be logged in.";
      return;
    }
    this.isStarting = true;
    this.error = null;
    const scenarioId = this.selectedTemplateId || this.model?.templates?.[0]?.id;
    try {
      const { session, template } = await this.api.startSession(this.session.token, {
        language: this.settings.targetLang,
        level: this.settings.defaultLevel,
        persona: this.settings.persona,
        strictness: this.settings.strictness,
        characterStyle: this.settings.renderMode,
        scenarioId,
      });
      this.sessionId = session.id;
      this.sessionSummary = template?.summary;
      this.messages = [];
      this._mistakesMap = {};
      this.vocabulary = [];
      this.isAiResponding = false;
      this.levelSuggestion = null;

      try {
        const sessionData = await this.api.getSession(this.session.token, session.id);
        this.vocabulary = sessionData.session?.vocabulary ?? [];
      } catch (err) {
        this.logger.warn("session.vocab_sync_failed", { message: err.message });
      }

      await this.connectSocket(session.id, this.buildInitialPrompt(template));
    } catch (err) {
      this.error = err.message;
    } finally {
      this.isStarting = false;
    }
  }

  async connectSocket(sessionId, initialPrompt) {
    if (!this.session.token) return;
    this.chat.close();
    this.chat.clearHandlers();
    this.chat.on("chat_message", (payload) => {
      this.messages = [
        ...this.messages,
        {
          role: "ai",
          text: payload.text,
          translation: payload.translation ?? null,
          showTranslation: false,
        },
      ];
      this.isAiResponding = false;
    });
    this.chat.on("mistakes_update", (payload) => {
      const updated = { ...this._mistakesMap };
      for (const m of payload ?? []) {
        const type = typeof m.type === "string" ? m.type.toLowerCase() : m.type;
        const hash = m.hash || `${type}|${m.message}|${m.correction}`.toLowerCase();
        if (updated[hash]) {
          updated[hash] = { ...updated[hash], recurrence: updated[hash].recurrence + 1 };
        } else {
          updated[hash] = { ...m, type, hash, recurrence: 1 };
        }
      }
      this._mistakesMap = updated;
    });
    this.chat.on("vocab_update", (payload) => {
      this.vocabulary = [...(payload ?? []), ...this.vocabulary];
    });
    this.chat.on("level_suggestion", (payload) => {
      this.levelSuggestion = payload;
    });
    this.chat.on("openai_error", (payload) => {
      this.error = payload.message;
      this.isAiResponding = false;
    });
    this.chat.on("error", (payload) => {
      this.error = payload?.message ?? "Chat error";
      this.isAiResponding = false;
    });
    this.chat.on("close", () => {
      this.wsConnected = false;
    });
    try {
      await this.chat.connect(this.session.token, sessionId);
      this.wsConnected = true;
      if (initialPrompt) {
        this.isAiResponding = true;
        this.chat.sendSessionPrompt(initialPrompt);
      }
    } catch (err) {
      this.error = "Unable to connect to chat gateway.";
    }
  }

  buildInitialPrompt(template) {
    if (!template) return "Please begin a casual introduction in Japanese.";
    const userLine = template.starterTurns?.find((t) => t.role === "user")?.text;
    return userLine || `Please start a conversation about: ${template.summary}`;
  }

  @action sendMessage(e) {
    e.preventDefault();
    if (!this.wsConnected) {
      this.error = "Chat not connected yet.";
      return;
    }
    const textarea = e.target.querySelector("textarea");
    const text = textarea.value.trim();
    if (!text) return;
    this.chat.sendUserMessage(text);
    this.messages = [...this.messages, { role: "user", text, translation: null }];
    this.isAiResponding = true;
    this.error = null;
    textarea.value = "";
  }

  @action dismissLevelSuggestion() {
    this.levelSuggestion = null;
  }

  @action toggleTranslation(index) {
    this.messages = this.messages.map((m, i) =>
      i === index && m.role === "ai" && m.translation
        ? { ...m, showTranslation: !m.showTranslation }
        : m,
    );
  }

  @action async setVocabMastery(vocabId, mastery) {
    if (!this.session.token || !this.sessionId) return;
    try {
      const { vocabulary: updated } = await this.api.updateVocabMastery(
        this.session.token,
        this.sessionId,
        vocabId,
        mastery,
      );
      this.vocabulary = this.vocabulary.map((v) => (v.id === vocabId ? updated : v));
    } catch (err) {
      this.error = err.message;
    }
  }

  @action async saveVocab(e) {
    e.preventDefault();
    if (!this.session.token || !this.sessionId) return;
    const fd = new FormData(e.target);
    const payload = {
      phrase: String(fd.get("phrase") ?? ""),
      translation: String(fd.get("translation") ?? ""),
      context: String(fd.get("context") ?? ""),
    };
    try {
      const result = await this.api.addVocabulary(this.session.token, this.sessionId, payload);
      this.vocabulary = [...result.vocabulary, ...this.vocabulary];
      e.target.reset();
    } catch (err) {
      this.error = err.message;
    }
  }
}
