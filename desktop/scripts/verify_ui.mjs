import { chromium } from "playwright";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const OUTPUT = path.join(ROOT, "design", "screenshots");
const BASE_URL = process.env.DESKTOP_URL || "http://localhost:1420";
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
  await targetPage.waitForFunction(() => document.querySelector(".opening-intro")?.dataset.animationReady === "true", null, { timeout: 5000 });
  const mode = await opening.evaluate((element) =>
    element.classList.contains("opening-video-intro") ? "video" : "living"
  );
  if (mode === "video") {
    const videoReady = await opening.locator("video[data-opening-critical='true']").evaluate((video) =>
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0
    );
    if (!videoReady) throw new Error("opening video started before its critical media decoded");
    return mode;
  }
  const imagesReady = await opening.locator("img[data-opening-critical='true']").evaluateAll((images) =>
    images.length === 2 && images.every((image) => image.complete && image.naturalWidth > 0)
  );
  if (!imagesReady) throw new Error("opening timeline started before its critical images decoded");
  return mode;
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
  const focusStayedOnSkip = await targetPage.evaluate(() => document.activeElement?.classList.contains("living-skip"));
  if (!focusStayedOnSkip) {
    const activeClass = await targetPage.evaluate(() => document.activeElement?.className);
    throw new Error(`${label}: keyboard focus escaped opening dialog to ${activeClass}`);
  }
}

try {
  await page.goto(`${BASE_URL}/?intro=1`, { waitUntil: "domcontentloaded" });
  if (await page.locator("link[rel='preload'][as='video'][href='/opening/opening-guardian-ai.mp4']").count() !== 1) {
    throw new Error("opening critical video preload is missing");
  }
  if (await page.locator("link[rel='preload'][as='image'][fetchpriority='high']").count() < 3) {
    throw new Error("opening critical image preloads are missing");
  }
  const openingMode = await waitForOpeningReady(page);
  await page.waitForFunction(() => document.querySelector(".opening-intro")?.dataset.sceneAssetsReady === "true", null, { timeout: 3500 });
  await assertOpeningIsolation(page, "opening");
  const introStartedAt = Date.now();
  await page.waitForTimeout(1200);
  const guardianVisible = openingMode === "video"
    ? await page.locator(".opening-video-stage").evaluate((element) => Number(getComputedStyle(element).opacity) > 0.4)
    : await page.locator(".guardian-base").evaluateAll((elements) =>
      elements.length === 2 && elements.every((element) => Number(getComputedStyle(element).opacity) > 0.4)
    );
  if (!guardianVisible) {
    throw new Error("guardian paintings did not reveal");
  }
  await assertViewport("opening");
  await page.screenshot({ path: path.join(OUTPUT, "desktop-opening-current.png") });
  await page.waitForTimeout(1400);
  const movingLayersVisible = openingMode === "video"
    ? await page.locator(".opening-video").evaluate((video) => !video.paused && video.currentTime > 0)
    : await page.locator(".guardian-atmosphere").evaluateAll((elements) =>
      elements.length >= 12 && elements.some((element) => Number(getComputedStyle(element).opacity) > 0.2)
    );
  if (!movingLayersVisible) throw new Error("guardian painting atmosphere layers did not appear");
  await page.screenshot({ path: path.join(OUTPUT, "desktop-opening-register.png") });
  await page.waitForTimeout(2700);
  const livingMotion = openingMode === "video"
    ? await page.locator(".opening-video").evaluate((video) => video.currentTime)
    : await page.locator(".guardian-a .ribbon-left").evaluate((element) =>
      getComputedStyle(element).transform
    );
  if (!livingMotion || livingMotion === "none") {
    throw new Error("guardian painting atmosphere layer did not move");
  }
  await assertViewport("opening living painting");
  await page.screenshot({ path: path.join(OUTPUT, "desktop-opening-panorama.png") });
  await page.waitForTimeout(4400);
  const sealOpacity = openingMode === "video"
    ? await page.locator(".opening-video-final").evaluate((element) => Number(getComputedStyle(element).opacity))
    : await page.locator(".living-final-seal").evaluate((element) => Number(getComputedStyle(element).opacity));
  if (sealOpacity < 0.2) throw new Error("final collection seal did not appear");
  await assertViewport("opening finale");
  await page.screenshot({ path: path.join(OUTPUT, "desktop-opening-finale.png") });
  await page.locator(".opening-intro").waitFor({ state: "detached", timeout: 6000 });
  const introDuration = Date.now() - introStartedAt;
  const minIntroDuration = openingMode === "video" ? 12500 : 10000;
  const maxIntroDuration = openingMode === "video" ? 14500 : 11300;
  if (introDuration < minIntroDuration || introDuration > maxIntroDuration) {
    throw new Error(`opening duration outside target: ${introDuration}ms`);
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
  const audioRangeMax = await page.locator(".detail-audio-range").evaluate((input) => Number(input.max));
  if (!Number.isFinite(audioRangeMax) || audioRangeMax <= 0) {
    throw new Error(`detail audio duration was not reflected in the range control: ${audioRangeMax}`);
  }
  await page.locator(".detail-audio-range").evaluate((input) => {
    input.value = String(Math.min(Number(input.max), 3));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  const audioTimeText = await page.locator(".detail-audio-meta").innerText();
  if (!audioTimeText.includes("/") || audioTimeText.includes("0:00 / 0:00")) {
    throw new Error(`detail audio timeline did not render duration: ${audioTimeText}`);
  }
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
  await delayedContext.route("**/opening/opening-guardian-ai.mp4", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    await route.continue();
  });
  const delayedPage = await delayedContext.newPage();
  await delayedPage.goto(`${BASE_URL}/?intro=1`, { waitUntil: "domcontentloaded" });
  await delayedPage.locator(".opening-intro").waitFor();
  await delayedPage.waitForTimeout(150);
  if (await delayedPage.locator(".opening-intro").getAttribute("data-animation-ready") !== "false") {
    throw new Error("opening did not wait for a delayed critical video");
  }
  await waitForOpeningReady(delayedPage);
  await delayedContext.close();

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
