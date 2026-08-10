import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "../../lib/prisma.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken } from "../../lib/jwt.js";
import { UnauthorizedError } from "../../lib/errors.js";
import type { LoginInput, RefreshInput, LogoutInput } from "./schemas.js";

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const passwordValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordValid) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const jti = crypto.randomUUID();
  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = signRefreshToken({ sub: user.id, jti });

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt,
    },
  });

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

export async function refresh(input: RefreshInput) {
  let payload: { sub: string; jti: string };
  try {
    payload = verifyRefreshToken(input.refreshToken);
  } catch {
    throw new UnauthorizedError("Invalid or expired refresh token");
  }

  const tokenRecord = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(input.refreshToken) },
    include: { user: true },
  });

  if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt < new Date()) {
    throw new UnauthorizedError("Refresh token is invalid or revoked");
  }

  if (tokenRecord.userId !== payload.sub) {
    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() },
    });
    throw new UnauthorizedError("Token mismatch");
  }

  const accessToken = signAccessToken({
    sub: tokenRecord.user.id,
    role: tokenRecord.user.role,
  });

  return { accessToken };
}

export async function logout(input: LogoutInput) {
  const tokenRecord = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(input.refreshToken) },
  });

  if (!tokenRecord || tokenRecord.revokedAt) {
    return; // Already logged out, that's fine
  }

  await prisma.refreshToken.update({
    where: { id: tokenRecord.id },
    data: { revokedAt: new Date() },
  });
}
