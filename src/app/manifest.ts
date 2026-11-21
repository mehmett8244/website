import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return { name: "Son Kural Bükücü", short_name: "SKB", description: "BREAK THE RULES. CREATE YOUR WORLD.", start_url: "/", display: "standalone", background_color: "#07040F", theme_color: "#7C3AED",
    icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" }, { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }] };
}
