import Controller from "@ember/controller";
import { inject as service } from "@ember/service";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";

const FALLBACK_LANGS = ["japanese", "english", "spanish", "korean", "chinese"];
const LEVELS = ["beginner", "intermediate", "advanced"];

export default class AdminController extends Controller {
  @service api;
  @service session;
  @service logger;

  @tracked languages = [...FALLBACK_LANGS];
  @tracked levels = [...LEVELS];
  @tracked filterLanguage = "japanese";
  @tracked filterLevel = "beginner";
  @tracked search = "";
  @tracked list = [];
  @tracked loadingList = false;

  @tracked selectedId = null;
  @tracked mode = "edit"; // 'edit' | 'new'
  @tracked editor = {
    language: "japanese",
    level: "beginner",
    scenario: "",
    startingPrompt: "",
  };
  @tracked isDirty = false;
  @tracked status = null;
  @tracked error = null;

  constructor() {
    super(...arguments);
    // Initialize from filters
    this.editor.language = this.filterLanguage;
    this.editor.level = this.filterLevel;
    this.refreshList();
    window.addEventListener("beforeunload", this._beforeUnload);
  }

  willDestroy() {
    super.willDestroy?.();
    window.removeEventListener("beforeunload", this._beforeUnload);
  }

  _beforeUnload = (e) => {
    if (this.isDirty) {
      e.preventDefault();
      e.returnValue = "";
      return "";
    }
  };

  get filteredList() {
    const term = (this.search || "").toLowerCase();
    if (!term) return this.list;
    return this.list.filter((t) =>
      String(t.scenario || t.summary || "")
        .toLowerCase()
        .includes(term),
    );
  }

  get isNew() {
    return this.mode === "new";
  }

  get isSelected() {
    return (id) => id === this.selectedId;
  }

  get canSave() {
    const s = (this.editor.scenario || "").trim();
    const p = (this.editor.startingPrompt || "").trim();
    return this.isDirty && s.length >= 2 && p.length >= 1;
  }

  async refreshList() {
    if (!this.session.token) return;
    this.loadingList = true;
    this.status = null;
    this.error = null;
    try {
      const { templates } = await this.api.listTemplates(this.filterLanguage, this.filterLevel);
      this.list = templates ?? [];
      // Update languages set from data if present
      const langs = Array.from(new Set([...FALLBACK_LANGS, ...this.list.map((t) => t.language)]));
      this.languages = langs;
    } catch (e) {
      this.error = e.message;
    } finally {
      this.loadingList = false;
    }
  }

  @action setFilterLanguage(e) {
    this.filterLanguage = e.target.value;
    this.editor.language = this.filterLanguage;
    this.selectedId = null;
    this.mode = "edit";
    this.refreshList();
  }

  @action setFilterLevel(e) {
    this.filterLevel = e.target.value;
    this.editor.level = this.filterLevel;
    this.selectedId = null;
    this.mode = "edit";
    this.refreshList();
  }

  @action setSearch(e) {
    this.search = e.target.value;
  }

  @action async selectTemplate(id) {
    if (!id) return;
    try {
      const data = await this.api.getTemplate(id);
      const t = data.template || data; // tolerate different shapes
      const userLine = (t.starterTurns || []).find((turn) => turn.role === "user")?.text || "";
      this.selectedId = t.id;
      this.mode = "edit";
      this.editor = {
        language: t.language,
        level: t.level,
        scenario: t.scenario,
        startingPrompt: userLine,
      };
      this.isDirty = false;
      this.status = "Loaded.";
      this.error = null;
    } catch (e) {
      this.error = e.message;
      this.status = null;
    }
  }

  @action newTemplate() {
    this.selectedId = null;
    this.mode = "new";
    this.editor = {
      language: this.filterLanguage,
      level: this.filterLevel,
      scenario: "",
      startingPrompt: "",
    };
    this.isDirty = false;
    this.status = null;
    this.error = null;
  }

  @action onField(field, e) {
    this.editor = { ...this.editor, [field]: e.target.value };
    this.isDirty = true;
  }

  @action async saveEditor(e) {
    e?.preventDefault?.();
    if (!this.session.token) {
      this.error = "You must be logged in.";
      return;
    }
    try {
      const body = {
        language: this.editor.language,
        level: this.editor.level,
        scenario: this.editor.scenario,
        startingPrompt: this.editor.startingPrompt,
      };
      if (this.mode === "new") {
        const created = await this.api.createTemplate(this.session.token, body);
        const tpl = created.template || created;
        this.status = "Created.";
        if (tpl?.id) this.selectedId = tpl.id;
        this.mode = "edit";
        await this.refreshList();
        if (this.selectedId) await this.selectTemplate(this.selectedId);
      } else if (this.selectedId) {
        await this.api.updateTemplate(this.session.token, this.selectedId, body);
        this.status = "Updated.";
        await this.refreshList();
      }
      this.isDirty = false;
      this.error = null;
    } catch (err) {
      this.error = err.message;
      this.status = null;
    }
  }
}
