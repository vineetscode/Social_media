import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/chat/"],
    },
    sitemap: "https://jabwemet.up.railway.app/sitemap.xml",
  };
}
