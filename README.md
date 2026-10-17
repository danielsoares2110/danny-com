# danny.com

The app showcase site, in the same aesthetic as the current one: light warm-grey
page, white rounded cards, real app icon, blue pill badge, right-aligned grey
description.

```
npm start          # serves on http://localhost:4321
npm test           # drives the real page in Chrome, 38 checks
```

No build step and no dependencies. Plain HTML, CSS and one ES module. Upload the
folder to any static host as-is.

## The hidden dev spot

Nobody else needs to know these. Any of them opens the panel:

| Secret | How |
| --- | --- |
| Avatar taps | Click the round avatar 5 times in a row |
| Shortcut | <kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>D</kbd> (or <kbd>Ctrl</kbd> <kbd>⇧</kbd> <kbd>D</kbd>) |
| Type it | Just type `dev` anywhere on the page |
| URL | Append `?dev=1` to the address |

<kbd>Esc</kbd>, the backdrop, or the ✕ closes it.

Inside you can add, edit, reorder, hide and delete apps, upload an icon or use
an emoji on a gradient, and import/export the whole list.

## Local edits vs published apps

Apps you add in the panel are saved in this browser only — the site is static,
so nothing is sent anywhere. To make an app real for every visitor:

1. Dev Panel → **Copy as apps-data.js**
2. Paste it over `DEFAULT_APPS` in `assets/apps-data.js`
3. Deploy

**Reset to published** clears the browser's local copy so the page goes back to
whatever is in `apps-data.js`.

## Files

```
index.html              markup shell + the dev panel markup
assets/styles.css       the showcase look
assets/dev.css          dev panel styling
assets/app.js           rendering, state, hidden triggers
assets/apps-data.js     published content  ← edit this
assets/icons/           app icons extracted from Mounty.app and GazeBreak.app
tests/dev-spot.test.mjs browser test suite
```

## Adding an app by hand

Append an object to `DEFAULT_APPS` in `assets/apps-data.js`:

```js
{
  id: "droplet",
  name: "Droplet",
  description: "What it does, one or two sentences.",
  icon: { type: "image", src: "assets/icons/droplet.png" },
  href: "https://droplet.app",   // optional; omit for a non-clickable card
}
```

For a placeholder icon instead of an image:

```js
icon: { type: "emoji", value: "🧲", bg: ["#bf5af2", "#8a2be2"] }
```