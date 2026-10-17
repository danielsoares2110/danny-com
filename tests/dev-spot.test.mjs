/**
 * Dev Spot test suite — drives the real page in the installed Chrome.
 *   node tests/dev-spot.test.mjs        (needs the site served: npm start)
 *
 * Every assertion checks real state (classList / rendered DOM / computed
 * styles), never just `isVisible`, which silently passes for the off-canvas
 * panel.
 */
import { chromium } from "/Users/danny/node_modules/playwright-core/index.mjs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.BASE_URL || "http://localhost:4321/";
const SHOT = process.env.SHOT_DIR || null;

const results = [];
const errors = [];
const ok = (name, pass) => {
  results.push([name, !!pass]);
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}`);
};

const browser = await chromium.launch({ executablePath: CHROME });

function track(page) {
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  return page;
}

/* ---------------------------------------------------------------- triggers */
{
  const page = track(await browser.newPage({ viewport: { width: 1280, height: 860 } }));
  await page.goto(BASE, { waitUntil: "networkidle" });
  const isOpen = () =>
    page.evaluate(() => document.getElementById("dev").classList.contains("is-open"));

  ok("dev panel starts closed", !(await isOpen()));
  ok(
    "closed panel is not focusable",
    await page.evaluate(
      () => getComputedStyle(document.getElementById("dev")).visibility === "hidden"
    )
  );

  for (let i = 0; i < 5; i++) await page.click("#avatar", { delay: 40 });
  await page.waitForTimeout(500);
  ok("secret 1: five avatar taps", await isOpen());

  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  ok("Escape closes", !(await isOpen()));

  await page.keyboard.type("dev", { delay: 70 });
  await page.waitForTimeout(500);
  ok('secret 2: type "dev"', await isOpen());

  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  await page.keyboard.press("Meta+Shift+D");
  await page.waitForTimeout(500);
  ok("secret 3: Cmd+Shift+D", await isOpen());

  await page.locator("#devBackdrop").click({ position: { x: 60, y: 300 } });
  await page.waitForTimeout(500);
  ok("backdrop click closes", !(await isOpen()));

  await page.goto(BASE + "?dev=1", { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  ok("?dev=1 opens directly", await isOpen());

  /* --------------------------------------------------------------- content */
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE, { waitUntil: "networkidle" });
  const open = async () => {
    if (!(await isOpen())) {
      await page.keyboard.press("Meta+Shift+D");
      await page.waitForTimeout(600);
    }
  };
  await open();
  const cards = () => page.locator(".card").count();

  ok("published apps render", (await cards()) === 2);
  ok(
    "icon, badge and description all present",
    (await page.locator(".card__icon").count()) === 2 &&
      (await page.locator(".card__badge").count()) === 2 &&
      (await page.locator(".card__desc").count()) === 2
  );
  ok(
    "description is right-aligned like the reference",
    await page.evaluate(
      () => getComputedStyle(document.querySelector(".card__desc")).textAlign === "right"
    )
  );

  await page.fill("#fName", "Droppy");
  await page.fill("#fDesc", "Drag and drop anything without opening a window.");
  await page.fill("#fEmoji", "🧲");
  await page.click('.swatch[data-i="4"]');
  await page.click("#fSubmit");
  await page.waitForTimeout(600);
  ok("add app", (await cards()) === 3);
  ok("dirty flag appears", (await page.textContent("#devDirty")).trim() === "local edits");

  await page.fill("#fName", "NoDesc");
  await page.click("#fSubmit");
  await page.waitForTimeout(400);
  ok("app without a description is rejected", (await cards()) === 3);
  await page.fill("#fName", "");

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  ok("changes survive reload", (await cards()) === 3);
  await open();

  await page.click("#devRows .dev-row:nth-child(3) [data-act='eye']");
  await page.waitForTimeout(400);
  ok("hide removes card, keeps row", (await cards()) === 2 && (await page.locator(".dev-row").count()) === 3);
  await page.click("#devRows .dev-row:nth-child(3) [data-act='eye']");
  await page.waitForTimeout(400);
  ok("show restores card", (await cards()) === 3);

  const before = await page.locator(".card__badge").first().textContent();
  await page.click("#devRows .dev-row:nth-child(2) [data-act='up']");
  await page.waitForTimeout(400);
  const after = await page.locator(".card__badge").first().textContent();
  ok(`reorder (${before} -> ${after})`, before !== after);

  await page.click("#devRows .dev-row:nth-child(1) [data-act='edit']");
  await page.waitForTimeout(500);
  await page.fill("#fName", "Mounty Pro");
  await page.click("#fSubmit");
  await page.waitForTimeout(500);
  ok("edit app", (await page.locator(".card__badge").first().textContent()) === "Mounty Pro");

  page.on("dialog", (d) => d.accept());
  await page.click("#devRows .dev-row:nth-child(1) [data-act='del']");
  await page.waitForTimeout(500);
  ok("delete app", (await cards()) === 2);

  /* --------------------------------------------------------- icon picker */
  await page.click('.swatch[data-i="0"]');
  await page.waitForTimeout(200);
  ok(
    "gradient preview is actually painted",
    await page.evaluate(() =>
      document.getElementById("fPreview").style.background.includes("rgb(10, 132, 255)")
    )
  );
  ok(
    "swatches are one tab stop (roving tabindex)",
    await page.evaluate(
      () => [...document.querySelectorAll(".swatch")].filter((s) => s.tabIndex === 0).length === 1
    )
  );
  await page.locator('.swatch[data-i="0"]').focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(200);
  ok(
    "arrow keys move and select gradient",
    await page.evaluate(
      () =>
        document.activeElement?.dataset.i === "2" &&
        document.querySelector('.swatch[data-i="2"]').getAttribute("aria-checked") === "true"
    )
  );
  await page.fill("#fName", "Grad");
  await page.fill("#fDesc", "Gradient tile check.");
  await page.fill("#fEmoji", "🔥");
  await page.click("#fSubmit");
  await page.waitForTimeout(500);
  ok(
    "emoji tile keeps chosen gradient",
    await page.evaluate(
      () =>
        [...document.querySelectorAll(".card__icon--tile")].at(-1).style.background.includes(
          "rgb(255, 159, 10)"
        )
    )
  );
  ok(
    "emoji renders on the tile",
    (await page.locator(".card__icon--tile").last().textContent()) === "🔥"
  );

  await page.fill("#fName", "Pic");
  await page.fill("#fDesc", "Has a real uploaded icon.");
  await page.setInputFiles("#fFile", new URL("../assets/icons/mounty.png", import.meta.url).pathname);
  await page.waitForTimeout(900);
  await page.click("#fSubmit");
  await page.waitForTimeout(600);
  const hasDataIcon = () =>
    page.evaluate(() =>
      [...document.querySelectorAll("img.card__icon")].some((i) => i.src.startsWith("data:image/png"))
    );
  ok("uploaded icon used", await hasDataIcon());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  ok("uploaded icon survives reload", await hasDataIcon());

  /* --------------------------------------------------------------- safety */
  await open();
  const payload = "<img src=x onerror=alert(1)>Bad";
  await page.fill("#fName", payload);
  await page.fill("#fDesc", "desc");
  await page.click("#fSubmit");
  await page.waitForTimeout(500);
  ok("markup in app name is escaped, not executed", await page.evaluate(() => !window.__pwned));
  ok(
    "markup shown as literal text",
    (await page.locator(".card__badge").last().textContent()) === payload
  );
  ok(
    "no element injected from app name",
    (await page.locator(".card__badge img").count()) === 0
  );

  /* --------------------------------------------------------------- export */
  await page.evaluate(() => {
    window.__copied = null;
    navigator.clipboard.writeText = (t) => ((window.__copied = t), Promise.resolve());
  });
  await page.click("#bExport");
  await page.waitForTimeout(300);
  const copied = await page.evaluate(() => window.__copied);
  ok("export emits apps-data.js snippet", copied?.startsWith("export const DEFAULT_APPS = ["));
  ok(
    "exported snippet is valid JS",
    await page.evaluate((src) => {
      try {
        new Function(src.replace("export const", "const"));
        return true;
      } catch {
        return false;
      }
    }, copied)
  );

  await page.click("#bReset");
  await page.waitForTimeout(600);
  ok("reset restores published apps", (await cards()) === 2);
  ok("reset clears dirty flag", (await page.textContent("#devDirty")).trim() === "in sync");
  ok(
    "reset clears localStorage",
    await page.evaluate(() => !localStorage.getItem("danny.apps.v1"))
  );

  if (SHOT) await page.screenshot({ path: `${SHOT}/dev-panel.png` });
  await page.close();
}

/* ----------------------------------------------------------------- mobile */
{
  const page = track(await browser.newPage({ viewport: { width: 390, height: 844 } }));
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const fits = () =>
    page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  ok("mobile: no horizontal scroll", await fits());
  ok(
    "mobile: single column",
    await page.evaluate(() => {
      const g = getComputedStyle(document.querySelector(".grid"));
      return g.gridTemplateColumns.split(" ").length === 1;
    })
  );
  await page.keyboard.press("Meta+Shift+D");
  await page.waitForTimeout(600);
  ok(
    "mobile: panel fits viewport",
    await page.evaluate(() => {
      const r = document.getElementById("dev").getBoundingClientRect();
      return r.left >= -1 && r.right <= window.innerWidth + 1;
    })
  );
  if (SHOT) await page.screenshot({ path: `${SHOT}/mobile.png` });
  await page.close();
}

await browser.close();

const failed = results.filter(([, pass]) => !pass);
console.log(`\n  ${results.length - failed.length}/${results.length} passed`);
console.log("  console errors:", errors.length ? errors : "none");
if (failed.length || errors.length) process.exit(1);