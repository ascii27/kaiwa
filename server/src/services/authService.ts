import { prisma } from "../db/prisma.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { createAuthToken } from "../utils/tokens.js";

export const signUp = async (email: string, password: string) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("Email already in use");
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      password: passwordHash,
      settings: {
        create: {
          targetLang: "japanese"
        }
      }
    },
    include: {
      settings: true
    }
  });

  const token = createAuthToken(user.id);
  return { token, user };
};

export const login = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { email }, include: { settings: true } });
  if (!user) {
    throw new Error("Invalid credentials");
  }

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    throw new Error("Invalid credentials");
  }

  const token = createAuthToken(user.id);
  return { token, user };
};
