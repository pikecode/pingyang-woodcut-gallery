import { chromium } from "playwright";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const OUTPUT = path.join(ROOT, "design", "screenshots");
const BASE_URL = process.env.DESKTOP_URL || "http://127.0.0.1:1420";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const gallery = JSON.parse(await readFile(path.join(ROOT, "desktop/public/data/artworks.json"), "utf8"));
const pairedArtwork = gallery.artworks.find((artwork) => artwork.images.length > 1);

await mkdir(OUTPUT, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: CHROME });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const errors = [];
const failedRequests = [];

page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(error.message));
page.on("response", (response) => {
  if (response.status() >= 400) failedRequests.push(`${response.status()} ${response.url()}`);
});

async function assertViewport(label) {
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  if (metrics.scrollWidth > metrics.clientWidth) {
    throw new Error(`${label}: horizontal overflow ${metrics.scrollWidth} > ${metrics.clientWidth}`);
  }
}

try {
  await page.goto(`${BASE_URL}/?intro=1`, { waitUntil: "domcontentloaded" });
  await page.locator(".opening-intro").waitFor();
  await page.waitForTimeout(1200);
  await assertViewport("opening");
  await page.screenshot({ path: path.join(OUTPUT, "desktop-opening-current.png") });
  await page.waitForTimeout(3200);
  await assertViewport("opening panorama");
  await page.screenshot({ path: path.join(OUTPUT, "desktop-opening-panorama.png") });
  await page.waitForTimeout(4200);
  await assertViewport("opening finale");
  await page.screenshot({ path: path.join(OUTPUT, "desktop-opening-finale.png") });
  const skipStartedAt = Date.now();
  await page.getByRole("button", { name: "跳过开屏动画" }).click();
  await page.locator(".opening-intro").waitFor({ state: "detached", timeout: 500 });
  if (Date.now() - skipStartedAt > 500) {
    throw new Error("opening skip took longer than 500ms");
  }
  if (await page.evaluate(() => document.body.style.overflow === "hidden")) {
    throw new Error("opening skip left body scrolling locked");
  }

  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  if (await page.locator(".opening-intro").count()) {
    throw new Error("opening intro replayed in the same session");
  }
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator(".opening-intro").waitFor();
  await page.getByRole("button", { name: "跳过开屏动画" }).click();
  await page.locator(".opening-intro").waitFor({ state: "detached", timeout: 500 });
  await page.locator(".gallery-card").first().waitFor();
  if (await page.locator(".gallery-card").count() !== 55) {
    throw new Error("gallery did not render all 55 artworks");
  }
  await assertViewport("gallery");

  await page.getByRole("button", { name: /神祇/ }).click();
  if (await page.locator(".gallery-card").count() !== 13) {
    throw new Error("deity filter did not return 13 artworks");
  }

  await page.getByRole("button", { name: /全部/ }).click();
  await page.getByRole("button", { name: "搜索" }).click();
  await page.getByPlaceholder("搜索题名、别名…").fill(pairedArtwork.title);
  await page.getByRole("button", { name: `查看《${pairedArtwork.title}》` }).click();
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("+");
  const zoomTransform = await page.locator(".detail-artwork-img").evaluate((element) => element.style.transform);
  if (!zoomTransform.includes("scale(1.25)")) {
    throw new Error(`detail image did not zoom: ${zoomTransform}`);
  }
  await page.getByRole("button", { name: "图 2" }).click();
  await page.getByRole("button", { name: "播放导览" }).waitFor();
  if (await page.getByRole("button", { name: "播放导览" }).isDisabled()) {
    throw new Error("gallery narration did not become playable");
  }
  await page.getByRole("button", { name: "播放导览" }).click();
  await page.getByRole("button", { name: "暂停导览" }).waitFor();
  await page.getByRole("button", { name: "暂停导览" }).click();
  await page.getByRole("button", { name: "播放导览" }).waitFor();
  await assertViewport("detail");
  await page.screenshot({ path: path.join(OUTPUT, "desktop-detail-current.png") });

  await page.getByRole("button", { name: "返回" }).click();
  for (const viewport of [
    { width: 1280, height: 800, name: "1280x800" },
    { width: 1024, height: 700, name: "1024x700" },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${BASE_URL}/?intro=1`, { waitUntil: "domcontentloaded" });
    await page.locator(".opening-intro").waitFor();
    await page.waitForTimeout(4400);
    await assertViewport(`opening ${viewport.name}`);
    await page.screenshot({ path: path.join(OUTPUT, `desktop-opening-${viewport.name}.png`) });
    await page.getByRole("button", { name: "跳过开屏动画" }).click();
    await page.locator(".opening-intro").waitFor({ state: "detached", timeout: 500 });
  }

  const reducedContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: "reduce",
  });
  const reducedPage = await reducedContext.newPage();
  await reducedPage.goto(`${BASE_URL}/?intro=1`, { waitUntil: "domcontentloaded" });
  if (await reducedPage.locator(".opening-intro").count()) {
    throw new Error("opening intro mounted with reduced motion enabled");
  }
  await reducedPage.locator(".gallery-card").first().waitFor();
  await reducedContext.close();

  if (failedRequests.length) throw new Error(`failed requests:\n${failedRequests.join("\n")}`);
  if (errors.length) throw new Error(`browser errors:\n${errors.join("\n")}`);
  console.log(`Desktop UI verification passed. Screenshots: ${OUTPUT}`);
} finally {
  await context.close();
  await browser.close();
}
