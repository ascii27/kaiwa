import Service from '@ember/service';
import config from 'client-ember/config/environment';

const levels = ['debug', 'info', 'warn', 'error'];

export default class LoggerService extends Service {
  level = config.APP.LOG_LEVEL || 'info';

  setLevel(level) {
    this.level = level;
  }

  shouldLog(level) {
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  debug(message, meta) {
    if (this.shouldLog('debug')) console.debug(`[debug] ${message}`, meta ?? '');
  }
  info(message, meta) {
    if (this.shouldLog('info')) console.info(`[info] ${message}`, meta ?? '');
  }
  warn(message, meta) {
    if (this.shouldLog('warn')) console.warn(`[warn] ${message}`, meta ?? '');
  }
  error(message, meta) {
    if (this.shouldLog('error')) console.error(`[error] ${message}`, meta ?? '');
  }
}
