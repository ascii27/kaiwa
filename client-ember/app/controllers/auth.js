import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class AuthController extends Controller {
  @service api;
  @service session;
  @service logger;
  @service router;

  email = '';
  password = '';
  error = null;

  @action updateEmail(e) {
    this.email = e.target.value;
  }
  @action updatePassword(e) {
    this.password = e.target.value;
  }

  @action async signup(e) {
    e.preventDefault();
    this.error = null;
    try {
      const data = await this.api.signup(this.email, this.password);
      this.session.authenticate(data.token, data.user?.email);
      this.router.transitionTo('conversation');
    } catch (err) {
      this.error = err.message;
      this.logger.error('auth.signup_failed', { message: err.message });
    }
  }

  @action async login(e) {
    e.preventDefault();
    this.error = null;
    try {
      const data = await this.api.login(this.email, this.password);
      this.session.authenticate(data.token, data.user?.email);
      this.router.transitionTo('conversation');
    } catch (err) {
      this.error = err.message;
      this.logger.error('auth.login_failed', { message: err.message });
    }
  }
}
