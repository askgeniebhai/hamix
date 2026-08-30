import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * Generated favicon/app icon — Next.js's `app/icon.tsx` convention
 * auto-serves this at the right routes and injects the matching
 * `<link rel="icon">` tags, so no static `.ico`/`.png` asset needs to
 * be checked in. Fixes a real console 404 every single page load
 * triggered (the browser's automatic `/favicon.ico` request, which
 * this app never had a file for) — found during M9's DevTools-style
 * QA pass. A simple mark in the same primary color as the header's
 * `MessageSquareText` brand icon, not a fabricated logo.
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1e293b",
          borderRadius: 7,
          color: "white",
          fontSize: 20,
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        F
      </div>
    ),
    { ...size },
  );
}
