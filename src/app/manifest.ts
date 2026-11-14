import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OpsPulse · Supply Chain Control",
    short_name: "OpsPulse",
    description: "Control de inventario y seguimiento operativo · CD11",
    start_url: "/",
    display: "standalone",
    background_color: "#1F2B3B",
    theme_color: "#1F2B3B",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
