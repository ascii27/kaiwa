import Service from "@ember/service";
import config from "client-ember/config/environment";
import { inject as service } from "@ember/service";

export default class ApiService extends Service {
  @service logger;

  base = config.APP.API_URL || "";

  async fetch(path, options = {}) {
    const url = `${this.base}${path}`;
    this.logger.debug("api.fetch", { url, options });
    // Merge options first, then ensure Content-Type defaults to application/json
    const mergedOptions = { ...options };
    const incomingHeaders = options.headers || {};
    const headers = { ...incomingHeaders };
    const hasContentType = Object.keys(headers).some((k) => k.toLowerCase() === "content-type");
    if (!hasContentType) headers["Content-Type"] = "application/json";

    const res = await fetch(url, { ...mergedOptions, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      this.logger.error("api.error", { url, status: res.status, data });
      throw new Error(data.error ?? "Request failed");
    }
    this.logger.info("api.ok", { url });
    return data;
  }

  listTemplates(language = "japanese", level = "beginner") {
    return this.fetch(`/templates?language=${language}&level=${level}`);
  }
  getTemplate(id) {
    return this.fetch(`/templates/${id}`);
  }
  createTemplate(token, body) {
    return this.fetch(`/templates`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: JSON.stringify(body),
    });
  }
  updateTemplate(token, id, body) {
    return this.fetch(`/templates/${id}`, {
      method: "PUT",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: JSON.stringify(body),
    });
  }
  signup(email, password) {
    return this.fetch("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }
  login(email, password) {
    return this.fetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }
  getSettings(token) {
    return this.fetch("/settings", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  }
  updateSettings(token, body) {
    return this.fetch("/settings", {
      method: "PUT",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: JSON.stringify(body),
    });
  }
  startSession(token, body) {
    return this.fetch("/sessions", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: JSON.stringify(body),
    });
  }
  getSession(token, id) {
    return this.fetch(`/sessions/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }
  addVocabulary(token, sessionId, vocab) {
    return this.fetch(`/sessions/${sessionId}/vocabulary`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: JSON.stringify(vocab),
    });
  }
  updateVocabMastery(token, sessionId, vocabId, mastery) {
    return this.fetch(`/sessions/${sessionId}/vocabulary/${vocabId}`, {
      method: "PATCH",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: JSON.stringify({ mastery }),
    });
  }
  getDueVocab(token) {
    return this.fetch("/review/due", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }
}
