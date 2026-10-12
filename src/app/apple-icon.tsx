import { ImageResponse } from "next/og";

// iOS ignores SVG home-screen icons; this renders the same "m" as icon.svg to a PNG.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #8b5cf6, #d946ef 55%, #f97316)",
        color: "#fff",
        fontSize: 120,
        fontWeight: 800,
        paddingBottom: 16,
      }}
    >
      m
    </div>,
    size,
  );
}
