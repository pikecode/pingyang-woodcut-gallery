import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.PINGYANG_CAPTURE_URL || "http://127.0.0.1:1420/";
const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const repoRoot = path.resolve(scriptDir, "..");
const outputDir = process.env.PINGYANG_CAPTURE_DIR || path.resolve(repoRoot, "delivery/screenshots");
const viewport = { width: 1440, height: 900 };

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function shot(page, name) {
  await page.screenshot({
    path: path.join(outputDir, name),
    fullPage: false,
    animations: "allow",
  });
}

async function preparePage(browser, url = baseUrl) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  page.setDefaultTimeout(20_000);
  await page.goto(url, { waitUntil: "domcontentloaded" });
  return page;
}

async function preparePageWithoutIntro(browser, url = baseUrl) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  page.setDefaultTimeout(20_000);
  await page.addInitScript(() => {
    window.sessionStorage.setItem("pingyang-intro-seen", "1");
  });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  return page;
}

async function skipIntro(page) {
  const skip = page.locator("button", { hasText: "跳过" }).first();
  if (await skip.count()) {
    await skip.click();
    await page.waitForSelector(".cat-root", { state: "visible" });
    await page.waitForTimeout(900);
  }
}

async function main() {
  await ensureDir(outputDir);
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PINGYANG_CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });

  try {
    const introPage = await preparePage(browser, `${baseUrl}?intro=1`);
    await introPage.waitForTimeout(1600);
    await shot(introPage, "01-opening-video.png");
    await introPage.waitForTimeout(9300);
    await shot(introPage, "02-opening-gsap-panorama.png");
    await introPage.close();

    const page = await preparePageWithoutIntro(browser);
    await skipIntro(page);
    await page.waitForSelector(".cat-root", { state: "visible" });
    await page.waitForTimeout(1200);
    await shot(page, "03-category-home.png");

    await page.locator(".cat-info-btn").click();
    await page.waitForSelector(".cat-credits-modal", { state: "visible" });
    await page.waitForTimeout(500);
    await shot(page, "04-credits-modal.png");
    await page.locator(".cat-credits-close").click();

    await page.locator(".cat-panel").first().click();
    await page.waitForSelector(".gallery-grid", { state: "visible" });
    await page.waitForTimeout(1200);
    await shot(page, "05-gallery-list.png");

    await page.locator(".gallery-card").first().click();
    await page.waitForSelector(".detail-overlay", { state: "visible" });
    await page.waitForTimeout(900);
    await shot(page, "06-artwork-detail.png");
    await page.close();

    const maint = await preparePage(browser, `${baseUrl}#maintenance`);
    await maint.waitForSelector(".maint-gate-card", { state: "visible" });
    await maint.waitForTimeout(500);
    await shot(maint, "07-maintenance-gate.png");
    await maint.locator("input[type='password']").fill("pingyang-admin");
    await maint.locator("button", { hasText: "进入维护" }).click();
    await maint.waitForSelector(".maint-root", { state: "visible" });
    await maint.waitForTimeout(1200);
    await shot(maint, "08-maintenance-workbench.png");
    await maint.close();
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
