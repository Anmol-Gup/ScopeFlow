import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ScopeFlow — AI Proposal Software for Agencies";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#FAFAF9",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: "#166534",
              display: "flex",
            }}
          />
          <div style={{ fontSize: 34, fontWeight: 700, color: "#1C1917" }}>scopeflow</div>
        </div>
        <div style={{ display: "flex", marginTop: 48, fontSize: 56, fontWeight: 700, color: "#1C1917", lineHeight: 1.15 }}>
          Turn Client Requirements Into
        </div>
        <div style={{ display: "flex", fontSize: 56, fontWeight: 700, color: "#166534", lineHeight: 1.15 }}>
          Professional Proposals
        </div>
        <div style={{ display: "flex", marginTop: 28, fontSize: 26, color: "#78716C" }}>
          AI-powered proposal, quotation, and project workflow for agencies
        </div>
      </div>
    ),
    { ...size }
  );
}
