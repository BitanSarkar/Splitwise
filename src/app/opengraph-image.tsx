import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Splitwise – Split expenses with friends";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #064e3b 0%, #059669 50%, #34d399 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          padding: "60px",
          position: "relative",
        }}
      >
        {/* Background pattern */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.07,
            backgroundImage:
              "radial-gradient(circle at 25% 25%, white 2px, transparent 2px), radial-gradient(circle at 75% 75%, white 2px, transparent 2px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Logo */}
        <div style={{ fontSize: 96, marginBottom: 24 }}>💸</div>

        {/* App name */}
        <div
          style={{
            fontSize: 80,
            fontWeight: 800,
            color: "white",
            letterSpacing: "-2px",
            marginBottom: 16,
          }}
        >
          Splitwise
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 34,
            color: "rgba(255,255,255,0.85)",
            fontWeight: 400,
            textAlign: "center",
            marginBottom: 48,
            maxWidth: 700,
          }}
        >
          Split expenses with friends, family &amp; teammates. Free, fast, and fair.
        </div>

        {/* Feature pills */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
          {["Equal splits", "By percentage", "By exact amount", "By shares", "Multi-currency", "Settle up"].map(
            (feat) => (
              <div
                key={feat}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "1.5px solid rgba(255,255,255,0.3)",
                  borderRadius: 999,
                  padding: "10px 22px",
                  color: "white",
                  fontSize: 22,
                  fontWeight: 500,
                }}
              >
                {feat}
              </div>
            )
          )}
        </div>

        {/* URL watermark */}
        <div
          style={{
            position: "absolute",
            bottom: 36,
            right: 52,
            fontSize: 20,
            color: "rgba(255,255,255,0.5)",
            fontWeight: 500,
          }}
        >
          splitwise.bitsar.net
        </div>
      </div>
    ),
    { ...size }
  );
}
