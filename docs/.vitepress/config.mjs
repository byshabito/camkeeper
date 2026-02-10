import { defineConfig } from "vitepress";

const repository = process.env.GITHUB_REPOSITORY || "byshabito/camkeeper";
const repoName = repository.split("/")[1] || "camkeeper";
const base = `/${repoName}/`;

export default defineConfig({
  title: "CamKeeper",
  description: "Cross-site creator profile manager",
  base,
  lastUpdated: true,
  head: [
    ["link", { rel: "icon", type: "image/png", sizes: "32x32", href: `${base}icon-32.png` }],
    ["link", { rel: "icon", type: "image/png", sizes: "16x16", href: `${base}icon-16.png` }],
    ["link", { rel: "shortcut icon", href: `${base}icon-32.png` }],
    ["meta", { name: "theme-color", content: "#8b5cf6" }],
  ],
  themeConfig: {
    logo: {
      src: "/icon-32.png",
      alt: "CamKeeper",
    },
    nav: [
      { text: "Home", link: "/" },
      { text: "Privacy", link: "/privacy/" },
      { text: "Support", link: "/support/" },
      { text: "GitHub", link: "https://github.com/byshabito/camkeeper" },
    ],
    sidebar: [
      {
        text: "Documentation",
        items: [
          { text: "Overview", link: "/" },
          { text: "Privacy", link: "/privacy/" },
          { text: "Support", link: "/support/" },
        ],
      },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/byshabito/camkeeper" },
    ],
    editLink: {
      pattern: "https://github.com/byshabito/camkeeper/edit/main/docs/:path",
      text: "Edit this page on GitHub",
    },
    footer: {
      message: "Released under GPL-3.0-or-later.",
      copyright: "Copyright (C) 2026 Shabito",
    },
  },
});
