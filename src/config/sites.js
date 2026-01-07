const SITES = {
  "chaturbate.com": {
    label: "Chaturbate",
    abbr: "CB",
    color: "#f59f1c",
    url: (username) => `https://chaturbate.com/${username}`,
  },
  "stripchat.com": {
    label: "Stripchat",
    abbr: "SC",
    color: "#ef4444",
    url: (username) => `https://stripchat.com/${username}`,
  },
};

export const SITE_KEYS = Object.keys(SITES);
export default SITES;
