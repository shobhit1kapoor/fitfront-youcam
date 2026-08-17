import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

export const VTO_SESSION_COOKIE = "fitfront-vto-session";
const COOKIE_MAX_AGE = 60 * 60 * 24;

function hashSession(value: string) {
  const secret = process.env.SESSION_SECRET || "fitfront-local-session-secret";
  return createHash("sha256").update(`${value}:${secret}`).digest("hex");
}

export function getExistingSessionHash(request: NextRequest) {
  const value = request.cookies.get(VTO_SESSION_COOKIE)?.value;
  return value ? hashSession(value) : null;
}

export function getOrCreateSession(request: NextRequest) {
  const existing = request.cookies.get(VTO_SESSION_COOKIE)?.value;
  const value = existing || randomUUID();
  return { value, hash: hashSession(value), isNew: !existing };
}

export function attachSessionCookie(response: NextResponse, value: string) {
  response.cookies.set(VTO_SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}
