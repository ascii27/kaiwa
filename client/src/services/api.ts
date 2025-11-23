interface RequestOptions extends RequestInit {
  token?: string;
}

const BASE_URL = import.meta.env.VITE_API_URL ?? "";

const apiFetch = async (path: string, options: RequestOptions = {}) => {
  const { token, ...rest } = options;
  const headers = new Headers(rest.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error ?? "Request failed");
  }

  return data;
};

export const api = {
  signup: (email: string, password: string) =>
    apiFetch("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  listTemplates: (language = "japanese", level = "beginner") =>
    apiFetch(`/templates?language=${language}&level=${level}`),
  startSession: (
    token: string,
    body: {
      language: string;
      level: string;
      persona: string;
      strictness: string;
      characterStyle: string;
      scenarioId?: string;
    },
  ) =>
    apiFetch("/sessions", {
      method: "POST",
      body: JSON.stringify(body),
      token,
    }),
  getSession: (token: string, id: string) =>
    apiFetch(`/sessions/${id}`, {
      token,
    }),
  addVocabulary: (token: string, sessionId: string, vocab: any) =>
    apiFetch(`/sessions/${sessionId}/vocabulary`, {
      method: "POST",
      body: JSON.stringify(vocab),
      token,
    }),
};
