import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "merk",
    short_name: "merk",
    description: "Deutsch lernen, ein Kärtchen nach dem anderen.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#7c4dff",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
