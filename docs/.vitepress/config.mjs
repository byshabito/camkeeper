import { defineConfig } from "vitepress";

const base = "/";

export default defineConfig({
    title: "CamKeeper",
    description: "Cross-site creator profile manager",
    lastUpdated: true,
    base,

    head: [
        [
            "link",
            {
                rel: "icon",
                type: "image/png",
                sizes: "32x32",
                href: `${base}icon-32.png`,
            },
        ],
        [
            "link",
            {
                rel: "icon",
                type: "image/png",
                sizes: "16x16",
                href: `${base}icon-16.png`,
            },
        ],
        ["link", { rel: "shortcut icon", href: `${base}icon-32.png` }],
        ["meta", { name: "theme-color", content: "#8b5cf6" }],
    ],

    themeConfig: {
        logo: {
            src: `${base}icon-32.png`,
            alt: "CamKeeper",
        },
        nav: [
            { text: "Home", link: "/" },
            { text: "Privacy", link: "/privacy/" },
            { text: "Support", link: "/support/" },
            { text: "Changelog", link: "/changelog/" },
        ],
    },
});
