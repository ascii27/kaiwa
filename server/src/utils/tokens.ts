import jwt from "jsonwebtoken";

import { env } from "../env.js";

export const createAuthToken = (userId: string) => {
  return jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: "7d" });
};
