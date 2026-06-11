import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { recordVisit } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VISITOR_COOKIE = "wc_visitor";
const ONE_YEAR = 60 * 60 * 24 * 365;

// Public beacon fired by the dashboard. Sets a first-party visitor id cookie and
// records one page view. Never throws back to the client (best-effort).
export async function POST() {
  const store = await cookies();
  let vid = store.get(VISITOR_COOKIE)?.value;
  const res = NextResponse.json({ ok: true });
  if (!vid) {
    vid = crypto.randomUUID();
    res.cookies.set(VISITOR_COOKIE, vid, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: ONE_YEAR,
      secure: process.env.NODE_ENV === "production",
    });
  }
  try {
    await recordVisit(vid);
  } catch {
    // Tracking must never break the page.
  }
  return res;
}
