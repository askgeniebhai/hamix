import { NextResponse } from "next/server";

/**
 * Liveness check for the application shell. Deliberately does not
 * touch the database or auth — those aren't wired into any rendered
 * page yet (M2 foundation only) — so this reflects "is the app
 * running", not "is the database reachable".
 */
export function GET() {
  return NextResponse.json({ status: "ok" });
}
