import { describe, expect, it } from "vitest";

import type { Session } from "./index";

describe("shared types", () => {
  it("supports constructing a session object", () => {
    const session: Session = {
      id: "session",
      userId: "user",
      language: "japanese",
      level: "beginner",
      persona: "encouraging",
      strictness: "gentle",
      characterStyle: "kanji",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(session.level).toBe("beginner");
  });
});
