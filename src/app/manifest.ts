import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "merk",
    short_name: "merk",
    description: "Deutsch lernen, ein Kärtchen nach dem anderen.",
    start_url: "/",
    display: "standalone",
    background_color: "#fdf8f3",
    theme_color: "#8b5cf6",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
