import Service from "@ember/service";
import { tracked } from "@glimmer/tracking";
import { inject as service } from "@ember/service";

export default class SettingsService extends Service {
  @service api;
  @service session;
  @service logger;

  @tracked targetLang = "japanese";
  @tracked persona = "encouraging";
  @tracked strictness = "standard";
  @tracked renderMode = "kanji";
  @tracked defaultLevel = "beginner";

  async load() {
    if (!this.session.token) return;
    try {
      const { settings } = await this.api.getSettings(this.session.token);
      if (settings) {
        this.targetLang = settings.targetLang ?? this.targetLang;
        this.persona = settings.persona ?? this.persona;
        this.strictness = settings.strictness ?? this.strictness;
        this.renderMode = settings.renderMode ?? this.renderMode;
        this.defaultLevel = settings.defaultLevel ?? this.defaultLevel;
      }
      this.logger.info("settings.loaded");
    } catch (e) {
      this.logger.warn("settings.load_failed", { message: e.message });
    }
  }

  async save(payload) {
    if (!this.session.token) return;
    const result = await this.api.updateSettings(this.session.token, payload);
    await this.load();
    return result;
  }
}
