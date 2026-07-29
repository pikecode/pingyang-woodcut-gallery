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

await page.addInitScript(() => {
  const NativeAudio = window.Audio;
  window.__testAudioInstances = [];
  window.Audio = function Audio(source) {
    const audio = new NativeAudio(source);
    window.__testAudioInstances.push(audio);
    return audio;
  };
  window.Audio.prototype = NativeAudio.prototype;
  Object.setPrototypeOf(window.Audio, NativeAudio);
});

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

async function waitForOpeningReady(targetPage) {
  const opening = targetPage.locator(".opening-intro");
  await opening.waitFor();
  await targetPage.waitForFunction(() => document.querySelector(".opening-intro")?.dataset.animationReady === "true", null, { timeout: 3500 });
  const imagesReady = await opening.locator("img[data-opening-critical='true']").evaluateAll((images) =>
    images.length === 4 && images.every((image) => image.complete && image.naturalWidth > 0)
  );
  if (!imagesReady) throw new Error("opening timeline started before its critical images decoded");
}

async function getBgmState(targetPage) {
  return targetPage.evaluate(() => {
    const instances = (window.__testAudioInstances || []).filter((audio) =>
      new URL(audio.src, window.location.href).pathname === "/audio/bgm.mp3"
    );
    const audio = instances.at(-1);
    return {
      count: instances.length,
      currentTime: audio?.currentTime ?? null,
      volume: audio?.volume ?? null,
      paused: audio?.paused ?? null,
    };
  });
}

async function assertOpeningIsolation(targetPage, label) {
  if (await targetPage.locator(".cat-root, .gallery-topbar, .gallery-card").count()) {
    throw new Error(`${label}: background application mounted below opening`);
  }
  await targetPage.getByRole("button", { name: "跳过开屏动画" }).focus();
  await targetPage.keyboard.press("Tab");
  const activeClass = await targetPage.evaluate(() => document.activeElement?.className);
  if (activeClass !== "panorama-skip") {
    throw new Error(`${label}: keyboard focus escaped opening dialog to ${activeClass}`);
  }
}

async function openingClipPoints(targetPage) {
  return targetPage.locator(".panorama-viewport").evaluate((element) =>
    (getComputedStyle(element).clipPath.match(/%/g) || []).length / 2
  );
}

try {
  await page.goto(`${BASE_URL}/?intro=1`, { waitUntil: "domcontentloaded" });
  if (await page.locator("link[rel='preload'][as='image'][fetchpriority='high']").count() !== 4) {
    throw new Error("opening critical image preloads are missing");
  }
  await waitForOpeningReady(page);
  await page.waitForFunction(() => document.querySelector(".opening-intro")?.dataset.sceneAssetsReady === "true", null, { timeout: 3500 });
  await assertOpeningIsolation(page, "opening");
  if (await openingClipPoints(page) !== 10) {
    throw new Error("opening clip path did not start with 10 points");
  }
  const introStartedAt = Date.now();
  await page.waitForTimeout(1200);
  if (await openingClipPoints(page) !== 10) {
    throw new Error("opening clip path changed point count during reveal");
  }
  const printLineState = await page.locator(".ink-line").evaluate((element) => ({
    clipPath: getComputedStyle(element).clipPath,
    opacity: Number(getComputedStyle(element).opacity),
  }));
  if (printLineState.clipPath.includes("50%") || printLineState.opacity < 0.5) {
    throw new Error(`woodblock line impression did not reveal: ${JSON.stringify(printLineState)}`);
  }
  await assertViewport("opening");
  await page.screenshot({ path: path.join(OUTPUT, "desktop-opening-current.png") });
  await page.waitForTimeout(800);
  const registeredPlates = await page.locator(".ink-plate").evaluateAll((elements) =>
    elements.every((element) => Number(getComputedStyle(element).opacity) >= 0.5)
  );
  if (!registeredPlates) throw new Error("color registration plates did not settle");
  await page.screenshot({ path: path.join(OUTPUT, "desktop-opening-register.png") });
  await page.waitForTimeout(2700);
  await assertViewport("opening panorama");
  await page.screenshot({ path: path.join(OUTPUT, "desktop-opening-panorama.png") });
  await page.waitForTimeout(4400);
  const sealOpacity = await page.locator(".panorama-final-seal").evaluate((element) => Number(getComputedStyle(element).opacity));
  if (sealOpacity < 0.2) throw new Error("final collection seal did not appear");
  await assertViewport("opening finale");
  await page.screenshot({ path: path.join(OUTPUT, "desktop-opening-finale.png") });
  await page.locator(".opening-intro").waitFor({ state: "detached", timeout: 3000 });
  const introDuration = Date.now() - introStartedAt;
  if (introDuration < 10000 || introDuration > 11300) {
    throw new Error(`opening duration outside 10s target: ${introDuration}ms`);
  }
  if (await page.evaluate(() => document.body.style.overflow === "hidden")) {
    throw new Error("opening skip left body scrolling locked");
  }
  const initialBgm = await getBgmState(page);
  if (initialBgm.count !== 1 || initialBgm.volume < 0.35 || initialBgm.volume > 0.39) {
    throw new Error(`opening BGM did not reach its target state: ${JSON.stringify(initialBgm)}`);
  }

  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  if (await page.locator(".opening-intro").count()) {
    throw new Error("opening intro replayed in the same session");
  }
  await page.locator(".cat-root").waitFor();
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator(".opening-intro").waitFor();
  await page.getByRole("button", { name: "跳过开屏动画" }).click();
  await page.locator(".opening-intro").waitFor({ state: "detached", timeout: 500 });
  await page.getByRole("button", { name: "神祇，共13件" }).click();
  await page.locator(".cat-root").waitFor({ state: "detached" });
  await page.locator(".gallery-card").first().waitFor();
  if (await page.locator(".gallery-card").count() !== 13) {
    throw new Error("deity category did not return 13 artworks");
  }
  await assertViewport("gallery");

  await page.locator(".nav-tab").filter({ hasText: "全部" }).click();
  if (await page.locator(".gallery-card").count() !== 55) {
    throw new Error("gallery did not render all 55 artworks");
  }
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
  await page.waitForFunction(() => !document.querySelector(".detail-audio-btn")?.disabled);
  await page.getByRole("button", { name: "播放导览" }).click();
  await page.getByRole("button", { name: "暂停导览" }).waitFor();
  await page.getByRole("button", { name: "暂停导览" }).click();
  await page.getByRole("button", { name: "播放导览" }).waitFor();
  await assertViewport("detail");
  await page.screenshot({ path: path.join(OUTPUT, "desktop-detail-current.png") });

  await page.getByRole("button", { name: "返回", exact: true }).click();
  await page.getByRole("button", { name: "重播开屏动画" }).click();
  await waitForOpeningReady(page);
  await assertOpeningIsolation(page, "replayed opening");
  const replayedBgm = await getBgmState(page);
  if (replayedBgm.count !== 1 || replayedBgm.currentTime > 0.8 || replayedBgm.volume > 0.08) {
    throw new Error(`replayed opening did not resync its BGM: ${JSON.stringify(replayedBgm)}`);
  }
  await page.getByRole("button", { name: "跳过开屏动画" }).click();
  await page.locator(".opening-intro").waitFor({ state: "detached", timeout: 500 });
  await page.locator(".cat-root").waitFor();
  await page.getByRole("button", { name: "关闭音乐" }).click();
  await page.getByRole("button", { name: "开启音乐" }).click();
  await page.waitForTimeout(1000);
  const toggledBgm = await getBgmState(page);
  if (toggledBgm.volume < 0.35 || toggledBgm.paused) {
    throw new Error(`rapid BGM toggles left an obsolete fade active: ${JSON.stringify(toggledBgm)}`);
  }

  for (const viewport of [
    { width: 1280, height: 800, name: "1280x800" },
    { width: 1024, height: 700, name: "1024x700" },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${BASE_URL}/?intro=1`, { waitUntil: "domcontentloaded" });
    await waitForOpeningReady(page);
    await assertOpeningIsolation(page, `opening ${viewport.name}`);
    await page.waitForTimeout(4400);
    await assertViewport(`opening ${viewport.name}`);
    await page.screenshot({ path: path.join(OUTPUT, `desktop-opening-${viewport.name}.png`) });
    const skipStartedAt = Date.now();
    await page.getByRole("button", { name: "跳过开屏动画" }).click();
    await page.locator(".opening-intro").waitFor({ state: "detached", timeout: 500 });
    if (Date.now() - skipStartedAt > 500) {
      throw new Error(`opening skip took longer than 500ms at ${viewport.name}`);
    }
  }

  const delayedContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await delayedContext.route("**/images/py-014/primary.webp", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    await route.continue();
  });
  const delayedPage = await delayedContext.newPage();
  await delayedPage.goto(`${BASE_URL}/?intro=1`, { waitUntil: "domcontentloaded" });
  await delayedPage.locator(".opening-intro").waitFor();
  await delayedPage.waitForTimeout(150);
  if (await delayedPage.locator(".opening-intro").getAttribute("data-animation-ready") !== "false") {
    throw new Error("opening did not wait for a delayed critical image");
  }
  await waitForOpeningReady(delayedPage);
  await delayedContext.close();

  const deferredContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await deferredContext.route("**/images/py-038/primary.webp", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1800));
    await route.continue();
  });
  const deferredPage = await deferredContext.newPage();
  await deferredPage.goto(`${BASE_URL}/?intro=1`, { waitUntil: "domcontentloaded" });
  await waitForOpeningReady(deferredPage);
  if (await deferredPage.locator(".opening-intro").getAttribute("data-scene-assets-ready") !== "false") {
    throw new Error("opening waited for a deferred scene image before starting");
  }
  await deferredPage.waitForFunction(() => document.querySelector(".opening-intro")?.dataset.sceneAssetsReady === "true", null, { timeout: 3500 });
  await deferredContext.close();

  const reducedContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: "reduce",
  });
  const reducedPage = await reducedContext.newPage();
  await reducedPage.goto(`${BASE_URL}/?intro=1`, { waitUntil: "domcontentloaded" });
  if (await reducedPage.locator(".opening-intro").count()) {
    throw new Error("opening intro mounted with reduced motion enabled");
  }
  await reducedPage.locator(".cat-root").waitFor();
  await reducedContext.close();

  if (failedRequests.length) throw new Error(`failed requests:\n${failedRequests.join("\n")}`);
  if (errors.length) throw new Error(`browser errors:\n${errors.join("\n")}`);
  console.log(`Desktop UI verification passed. Screenshots: ${OUTPUT}`);
} finally {
  await context.close();
  await browser.close();
}
