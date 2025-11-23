import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class SettingsController extends Controller {
  @service settings;
  @service api;
  @service session;
  @service logger;

  @action async save(e) {
    e.preventDefault();
    if (!this.session.token) return;
    const payload = {
      targetLang: this.settings.targetLang,
      persona: this.settings.persona,
      strictness: this.settings.strictness,
      renderMode: this.settings.renderMode,
    };
    try {
      await this.settings.save(payload);
      this.logger.info('settings.saved');
    } catch (err) {
      this.logger.error('settings.save_failed', { message: err.message });
    }
  }

  @action handleChange(field, event) {
    const value = event.target.value;
    this.settings[field] = value;
  }
}
