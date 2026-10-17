/* ==========================================================================
   danny.com — render + hidden Dev Panel
   ========================================================================== */

import { SITE, DEFAULT_APPS } from "./apps-data.js";

const STORE_KEY = "danny.apps.v1";

/* --- Liquid Glass capability gate ------------------------------------------ */
/* Chromium + Firefox can run the SVG displacement filter inside
   backdrop-filter; Safari parses url() refs but renders them wrong, so gate
   on UA and keep the plain blur fallback there. */
(() => {
  const isSafari = /^((?!chrome|chromium|crios|android|fxios).)*safari/i.test(
    navigator.userAgent
  );
  let ok = false;
  try {
    ok =
      !isSafari &&
      window.CSS &&
      CSS.supports &&
      CSS.supports("backdrop-filter", "url(#lg-filter)");
  } catch {
    ok = false;
  }
  document.documentElement.classList.toggle("svg-glass", ok);
})();

const GRADIENTS = [
  ["#0a84ff", "#0060df"],
  ["#30d158", "#12a03c"],
  ["#ff9f0a", "#ff6a00"],
  ["#ff375f", "#d81b45"],
  ["#bf5af2", "#8a2be2"],
  ["#5ac8fa", "#0a84ff"],
  ["#ff6482", "#ff375f"],
  ["#ffd60a", "#ff9f0a"],
  ["#64d2ff", "#32ade6"],
  ["#8e8e93", "#48484a"],
];

const $ = (id) => document.getElementById(id);
const grid = $("grid");

/* --- State ---------------------------------------------------------------- */

let apps = load();
let editingId = null;
let pendingIcon = null; // { type:'image', src } | { type:'emoji', value, bg }
let activeSwatch = 0;
let isDirty = false;

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return structuredClone(DEFAULT_APPS);
    const data = JSON.parse(raw);
    return Array.isArray(data.apps) ? data.apps : structuredClone(DEFAULT_APPS);
  } catch {
    return structuredClone(DEFAULT_APPS);
  }
}

function save() {
  isDirty = JSON.stringify(apps) !== JSON.stringify(DEFAULT_APPS);
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ apps }));
  } catch (err) {
    toast("Storage full — try a smaller icon");
    console.warn(err);
  }
  render();
}

/* --- Rendering ------------------------------------------------------------ */

function iconMarkup(app) {
  const icon = app.icon || {};
  if (icon.type === "image" && icon.src) {
    return `<img class="card__icon" src="${icon.src}" alt="" loading="lazy" />`;
  }
  const bg = icon.bg || GRADIENTS[0];
  return `<div
    class="card__icon card__icon--tile"
    style="background:linear-gradient(160deg,${bg[0]},${bg[1]})"
  >${icon.value || "🛠️"}</div>`;
}

function cardMarkup(app, i) {
  const inner = `
    ${iconMarkup(app)}
    <div class="card__body">
      <span class="card__badge">${esc(app.name)}</span>
      <p class="card__desc">${esc(app.description)}</p>
    </div>`;

  const style = `animation-delay:${i * 45}ms`;
  if (app.href) {
    return `<a class="card" style="${style}" href="${esc(app.href)}"
       target="_blank" rel="noopener noreferrer">${inner}</a>`;
  }
  return `<article class="card card--static" style="${style}">${inner}</article>`;
}

function render() {
  const visible = apps.filter((a) => !a.hidden);
  $("name").textContent = SITE.name;
  $("avatar").src = SITE.avatar;

  grid.innerHTML = visible.length
    ? visible.map(cardMarkup).join("")
    : `<div class="empty">
         <strong>No apps yet</strong>
         Open the Dev Panel to add one.
       </div>`;

  renderRows();
  $("devDirty").textContent = isDirty ? "local edits" : "in sync";
}

function renderRows() {
  $("devRows").innerHTML = apps
    .map((app, i) => {
      const icon = app.icon || {};
      const thumb =
        icon.type === "image" && icon.src
          ? `<img class="dev-row__icon" src="${icon.src}" alt="" />`
          : `<div class="dev-row__icon" style="background:linear-gradient(160deg,${
              (icon.bg || GRADIENTS[0])[0]
            },${(icon.bg || GRADIENTS[0])[1]})">${icon.value || "🛠️"}</div>`;
      return `
      <div class="dev-row ${app.hidden ? "is-off" : ""}">
        ${thumb}
        <div class="dev-row__meta">
          <div class="dev-row__name">${esc(app.name)}</div>
          <div class="dev-row__desc">${esc(app.description)}</div>
        </div>
        <div class="dev-row__acts">
          <button class="iconbtn" data-act="up"   data-i="${i}" title="Move up"   ${i === 0 ? "disabled" : ""}>↑</button>
          <button class="iconbtn" data-act="down" data-i="${i}" title="Move down" ${i === apps.length - 1 ? "disabled" : ""}>↓</button>
          <button class="iconbtn" data-act="eye"  data-i="${i}" title="${app.hidden ? "Show" : "Hide"}">${app.hidden ? "🚫" : "👁"}</button>
          <button class="iconbtn" data-act="edit" data-i="${i}" title="Edit">✎</button>
          <button class="iconbtn iconbtn--danger" data-act="del" data-i="${i}" title="Delete">✕</button>
        </div>
      </div>`;
    })
    .join("");
}

function esc(s = "") {
  return String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}

/* --- Hidden Dev Panel ----------------------------------------------------- */

const dev = $("dev");
const backdrop = $("devBackdrop");
let lastFocus = null;

function openDev() {
  lastFocus = document.activeElement;
  dev.classList.add("is-open");
  backdrop.classList.add("is-open");
  dev.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeDev() {
  dev.classList.remove("is-open");
  backdrop.classList.remove("is-open");
  dev.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  resetForm();
  lastFocus?.focus?.();
}

function toggleDev() {
  dev.classList.contains("is-open") ? closeDev() : openDev();
}

let taps = 0;
let tapTimer;
$("avatar").addEventListener("click", () => {
  taps += 1;
  clearTimeout(tapTimer);
  tapTimer = setTimeout(() => (taps = 0), 1200);
  if (taps >= 5) {
    taps = 0;
    openDev();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && dev.classList.contains("is-open")) return closeDev();
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "d") {
    e.preventDefault();
    return toggleDev();
  }
  if (dev.classList.contains("is-open")) return;
  // type "dev" anywhere on the page
  if (e.target.matches("input, textarea, [contenteditable]")) return;
  if (e.metaKey || e.ctrlKey || e.altKey || !/^[a-z]$/i.test(e.key)) return;
  typed += e.key.toLowerCase();
  clearTimeout(typeTimer);
  typeTimer = setTimeout(() => (typed = ""), 900);
  if (typed.endsWith("dev")) {
    typed = "";
    openDev();
  }
});

let typed = "";
let typeTimer;

$("devClose").addEventListener("click", closeDev);
backdrop.addEventListener("click", closeDev);
if (new URLSearchParams(location.search).has("dev")) openDev();

/* --- Row actions ---------------------------------------------------------- */

$("devRows").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-act]");
  if (!btn) return;
  const i = Number(btn.dataset.i);
  const app = apps[i];

  switch (btn.dataset.act) {
    case "up":
      [apps[i - 1], apps[i]] = [apps[i], apps[i - 1]];
      break;
    case "down":
      [apps[i + 1], apps[i]] = [apps[i], apps[i + 1]];
      break;
    case "eye":
      app.hidden = !app.hidden;
      break;
    case "edit":
      startEdit(app);
      break;
    case "del":
      if (!confirm(`Delete “${app.name}”?`)) return;
      apps.splice(i, 1);
      if (editingId === app.id) resetForm();
      break;
  }
  save();
});

/* --- Add / edit form ------------------------------------------------------ */

const form = $("appForm");

function defaultIcon() {
  return {
    type: "emoji",
    value: $("fEmoji").value.trim() || "🛠️",
    bg: GRADIENTS[activeSwatch],
  };
}

function currentIcon() {
  return pendingIcon || defaultIcon();
}

function paintPreview() {
  const icon = currentIcon();
  const box = $("fPreview");
  // use the `background` shorthand for both cases — assigning background-image
  // afterwards would wipe the gradient the shorthand just set
  if (icon.type === "image") {
    box.style.background = `url("${icon.src}") center/cover no-repeat`;
    box.textContent = "";
  } else {
    box.style.background = `linear-gradient(160deg,${icon.bg[0]},${icon.bg[1]})`;
    box.textContent = icon.value;
  }
}

$("fSwatches").innerHTML = GRADIENTS.map(
  (g, i) =>
    `<button type="button" class="swatch" role="radio" aria-checked="false"
       aria-label="Gradient ${i + 1}" data-i="${i}" tabindex="-1" title="Gradient ${i + 1}"
       style="background:linear-gradient(160deg,${g[0]},${g[1]})"></button>`
).join("");

const swatches = [...document.querySelectorAll("#fSwatches .swatch")];

function paintSwatches() {
  const usingGradient = !pendingIcon || pendingIcon.type === "emoji";
  swatches.forEach((sw, i) => {
    const on = usingGradient && i === activeSwatch;
    sw.classList.toggle("is-active", on);
    sw.setAttribute("aria-checked", String(on));
    sw.tabIndex = i === activeSwatch ? 0 : -1;
  });
}

function pickSwatch(i, focus = false) {
  activeSwatch = i;
  pendingIcon = { type: "emoji", value: $("fEmoji").value.trim() || "🛠️", bg: GRADIENTS[i] };
  paintSwatches();
  paintPreview();
  if (focus) swatches[i].focus();
}

$("fSwatches").addEventListener("click", (e) => {
  const sw = e.target.closest(".swatch");
  if (sw) pickSwatch(Number(sw.dataset.i));
});

// radiogroup: arrow keys move between swatches instead of 10 tab stops
$("fSwatches").addEventListener("keydown", (e) => {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
  if (!step) return;
  e.preventDefault();
  const from = swatches.indexOf(document.activeElement);
  const next = (Math.max(from, 0) + step + swatches.length) % swatches.length;
  pickSwatch(next, true);
});

$("fEmoji").addEventListener("input", () => {
  if (currentIcon().type === "emoji") {
    pendingIcon = { ...currentIcon(), value: $("fEmoji").value.trim() || "🛠️" };
    paintPreview();
  }
});

$("fUpload").addEventListener("click", () => $("fFile").click());

$("fClear").addEventListener("click", () => {
  pendingIcon = null;
  activeSwatch = 0;
  paintSwatches();
  paintPreview();
});

$("fFile").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  if (file.size > 4 * 1024 * 1024) return toast("Icon must be under 4 MB");
  try {
    const src = await downscale(file, 512);
    pendingIcon = { type: "image", src };
    paintSwatches();
    paintPreview();
  } catch (err) {
    toast("Could not read that image");
    console.warn(err);
  }
  e.target.value = "";
});

function downscale(file, size) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const ctx = c.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      const scale = Math.min(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/png"));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("bad image"));
    };
    img.src = url;
  });
}

function startEdit(app) {
  editingId = app.id;
  $("formLabel").textContent = "Edit app";
  $("fSubmit").textContent = "Save changes";
  $("fCancel").hidden = false;
  $("fName").value = app.name;
  $("fDesc").value = app.description;
  $("fHref").value = app.href || "";
  $("fEmoji").value = app.icon?.type === "emoji" ? app.icon.value : "";
  pendingIcon = app.icon ? structuredClone(app.icon) : null;
  activeSwatch = Math.max(
    0,
    GRADIENTS.findIndex((g) => g.join() === pendingIcon?.bg?.join())
  );
  paintSwatches();
  paintPreview();
  form.scrollIntoView({ behavior: "smooth", block: "center" });
}

function resetForm() {
  editingId = null;
  pendingIcon = null;
  activeSwatch = 0;
  form.reset();
  $("formLabel").textContent = "Add an app";
  $("fSubmit").textContent = "Add app";
  $("fCancel").hidden = true;
  paintSwatches();
  paintPreview();
}

$("fCancel").addEventListener("click", resetForm);

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("fName").value.trim();
  const description = $("fDesc").value.trim();
  if (!name || !description) return toast("Name and description are required");

  const href = $("fHref").value.trim();
  const icon = currentIcon();
  const payload = {
    name,
    description,
    href: /^https?:\/\//i.test(href) ? href : "",
    icon,
  };

  if (editingId) {
    Object.assign(apps.find((a) => a.id === editingId), payload);
    toast("Updated");
  } else {
    apps.push({
      id: slug(name) + "-" + Math.random().toString(36).slice(2, 6),
      ...payload,
    });
    toast(`Added ${name}`);
  }
  resetForm();
  save();
});

function slug(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "app";
}

/* --- Publish -------------------------------------------------------------- */

$("bExport").addEventListener("click", async () => {
  const snippet = `export const DEFAULT_APPS = ${JSON.stringify(
    apps.filter((a) => !a.hidden),
    null,
    2
  )};`;
  try {
    await navigator.clipboard.writeText(snippet);
    toast("Copied — paste into apps-data.js");
  } catch {
    $("jsonOut").hidden = false;
    $("jsonOut").value = snippet;
    $("jsonOut").select();
    toast("Clipboard blocked — copy from the box");
  }
});

$("bDownload").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(apps, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "danny-apps.json";
  a.click();
  URL.revokeObjectURL(a.href);
});

$("bImport").addEventListener("click", () => {
  const box = $("jsonOut");
  if (box.hidden) {
    box.hidden = false;
    box.focus();
    return toast("Paste JSON, then press Import again");
  }
  try {
    const data = JSON.parse(box.value);
    if (!Array.isArray(data)) throw new Error("not a list");
    apps = data.map((a, i) => ({
      id: a.id || `imported-${i}`,
      name: a.name || "Untitled",
      description: a.description || "",
      href: a.href || "",
      icon: a.icon || { type: "emoji", value: "🛠️", bg: GRADIENTS[i % GRADIENTS.length] },
      hidden: !!a.hidden,
    }));
    box.hidden = true;
    resetForm();
    save();
    toast("Imported");
  } catch {
    toast("That isn't valid JSON");
  }
});

$("bImportFile").addEventListener("click", () => $("iFile").click());

$("iFile").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    $("jsonOut").hidden = false;
    $("jsonOut").value = JSON.stringify(data, null, 2);
    toast("Loaded — press Import");
  } catch {
    toast("Couldn't parse that file");
  }
  e.target.value = "";
});

$("bReset").addEventListener("click", () => {
  if (!confirm("Discard local edits and go back to the published apps?")) return;
  // clear without re-saving: writing the published copy back to storage would
  // pin this browser to today's defaults and mask future edits to apps-data.js
  localStorage.removeItem(STORE_KEY);
  apps = structuredClone(DEFAULT_APPS);
  isDirty = false;
  resetForm();
  render();
  toast("Reset");
});

/* --- Toast ---------------------------------------------------------------- */

let toastTimer;
function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.add("is-on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-on"), 2200);
}

/* --- Go ------------------------------------------------------------------- */

paintSwatches();
paintPreview();
render();