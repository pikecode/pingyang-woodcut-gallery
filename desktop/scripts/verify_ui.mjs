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
  await page.goto(`${BASE_URL}/?intro=1`, { waitUntil: "networkidle" });
  await page.locator(".opening-intro").waitFor();
  await page.waitForTimeout(1200);
  await assertViewport("opening");
  await page.screenshot({ path: path.join(OUTPUT, "desktop-opening-current.png") });
  await page.getByRole("button", { name: "跳过开屏动画" }).click();
  await page.locator(".opening-intro").waitFor({ state: "detached" });

  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  if (await page.locator(".opening-intro").count()) {
    throw new Error("opening intro replayed in the same session");
  }
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
  await page.getByPlaceholder("搜索题名、别名…").fill(pairedArtwork.title);
  await page.getByRole("button", { name: `查看《${pairedArtwork.title}》` }).click();
  await page.getByRole("dialog").waitFor();
  await page.getByRole("button", { name: "放大" }).click();
  await page.getByText("125%").waitFor();
  await page.getByRole("button", { name: "图 2" }).click();
  await page.getByRole("button", { name: "载入本地高清原图" }).click();
  await page.getByText("本地原图仅在桌面应用中可用").waitFor();
  await assertViewport("detail");
  await page.screenshot({ path: path.join(OUTPUT, "desktop-detail-current.png") });

  if (failedRequests.length) throw new Error(`failed requests:\n${failedRequests.join("\n")}`);
  if (errors.length) throw new Error(`browser errors:\n${errors.join("\n")}`);
  console.log(`Desktop UI verification passed. Screenshots: ${OUTPUT}`);
} finally {
  await context.close();
  await browser.close();
}
