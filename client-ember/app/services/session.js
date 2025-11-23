import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';

export default class SessionService extends Service {
  @service logger;

  @tracked token = null;
  @tracked userEmail = null;

  constructor() {
    super(...arguments);
    const saved = localStorage.getItem('kaiwa_token');
    if (saved) {
      this.token = saved;
    }
  }

  authenticate(token, userEmail) {
    this.token = token;
    this.userEmail = userEmail ?? null;
    localStorage.setItem('kaiwa_token', token);
    this.logger.info('session.authenticated', { userEmail });
  }

  logout() {
    this.logger.info('session.logout');
    localStorage.removeItem('kaiwa_token');
    this.token = null;
    this.userEmail = null;
  }
}
