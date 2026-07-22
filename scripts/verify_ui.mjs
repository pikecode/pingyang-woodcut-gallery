import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUTPUT = path.join(ROOT, "design", "screenshots");
const BASE_URL = process.env.GALLERY_URL || "http://127.0.0.1:5173";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

await mkdir(OUTPUT, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: CHROME });

async function waitForImages(page) {
  await page.evaluate(() => {
    document.querySelectorAll("img").forEach((image) => {
      image.loading = "eager";
    });
  });
  await page.waitForFunction(
    () => [...document.images].every((image) => image.complete && image.naturalWidth > 0),
  );
}

async function assertViewport(page, label) {
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    title: document.title,
  }));
  if (metrics.scrollWidth > metrics.clientWidth) {
    throw new Error(`${label}: horizontal overflow ${metrics.scrollWidth} > ${metrics.clientWidth}`);
  }
  if (!metrics.title.includes("平阳木版年画")) {
    throw new Error(`${label}: unexpected document title`);
  }
}

async function runViewport(name, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.locator("h1").filter({ hasText: "平阳木版年画" }).waitFor();
  await waitForImages(page);
  await assertViewport(page, `${name} home`);
  await page.screenshot({ path: path.join(OUTPUT, `home-${name}.png`), fullPage: true });

  await page.goto(`${BASE_URL}/categories`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "藏品分类" }).waitFor();
  await page.getByRole("tab", { name: /神祇/ }).click();
  await page.getByText("13 件藏品").waitFor();
  await waitForImages(page);
  await assertViewport(page, `${name} categories`);
  await page.screenshot({ path: path.join(OUTPUT, `categories-${name}.png`), fullPage: true });

  await page.locator(".catalog-grid .artwork-card button").first().click();
  await page.getByRole("dialog").waitFor();
  await page.locator(".artwork-modal img").first().waitFor();
  await assertViewport(page, `${name} modal`);
  await page.screenshot({ path: path.join(OUTPUT, `detail-${name}.png`), fullPage: false });
  await page.getByRole("button", { name: "关闭详情" }).click();

  if (errors.length) {
    throw new Error(`${name}: browser errors\n${errors.join("\n")}`);
  }
  await context.close();
}

try {
  await runViewport("desktop", { width: 1440, height: 900 });
  await runViewport("mobile", { width: 390, height: 844 });
  console.log(`UI verification passed. Screenshots: ${OUTPUT}`);
} finally {
  await browser.close();
}
