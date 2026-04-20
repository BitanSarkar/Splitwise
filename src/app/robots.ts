import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/signin", "/help"],
        disallow: ["/dashboard", "/groups", "/api/", "/join/"],
      },
    ],
    sitemap: "https://splitwise.bitsar.net/sitemap.xml",
    host: "https://splitwise.bitsar.net",
  };
}
