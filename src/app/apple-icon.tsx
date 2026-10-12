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
        background: "#7c4dff",
        color: "#fff",
        fontSize: 120,
        fontWeight: 900,
        paddingBottom: 16,
      }}
    >
      m
    </div>,
    size,
  );
}
