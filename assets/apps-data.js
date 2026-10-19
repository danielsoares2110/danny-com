// ---------------------------------------------------------------------------
// Published content. This is the source of truth that ships with the site.
// Anything you add in the hidden Dev Panel lives in localStorage until you
// export it and paste it back in here (Dev Panel → Export gives you the
// exact snippet to paste).
// ---------------------------------------------------------------------------

export const SITE = {
  name: "Danny",
  avatar: "assets/icons/user.png",
};

export const DEFAULT_APPS = [
  {
    id: "mounty",
    name: "Mounty",
    description:
      "Mounty is an app that ejects your volumes when you close finder but mounts them when you open finder.",
    icon: { type: "image", src: "assets/icons/mounty.png" },
    href: "https://github.com/danielsoares2110/Mounty",
  },
  {
    id: "gazebreak",
    name: "GazeBreak",
    description:
      "A lightweight, native macOS focus timer for the 20-20-20 rule. Work, then look away and rest your eyes.",
    icon: { type: "image", src: "assets/icons/gazebreak.png" },
    href: "https://github.com/danielsoares2110/Gazebreak",
  },
  {
    id: "eufymake-sender",
    name: "eufyMake sender",
    description:
      "A tiny native macOS app for the AnkerMake M5 / M5C that does exactly three things: send a G-code file, show the printer's camera, and show the temperatures.",
    icon: { type: "image", src: "assets/icons/eufymake.png" },
    href: "https://github.com/danielsoares2110/eufyMake-sender",
  },
];
