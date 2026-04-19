import { ImageResponse } from "next/og";

export const runtime = "edge";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          background: "#059669",
          borderRadius: 108,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 256,
        }}
      >
        💸
      </div>
    ),
    { width: 512, height: 512 }
  );
}
