// 關鍵流程煙霧測試（§11）：主題 → 小節 → 卡片 → 檢查點測驗 → 動詞模組 → 我的。
// 先 `npm run build && npx vite preview --port 4173`，再 `npm run e2e`。
// 容器裡的 Chromium 版本若與 playwright 套件不合，用 PW_CHROMIUM 指定執行檔。

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:4173";
const OUT = process.env.SHOT_DIR ?? "e2e/shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch(
  process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
);
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  // 離線環境載不到 Google Fonts，不算應用程式錯誤
  if (m.type() === "error" && !/Failed to load resource/.test(m.text())) {
    errors.push(`console: ${m.text()}`);
  }
});

const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png`, fullPage: true });
const assert = (cond, msg) => {
  if (!cond) errors.push(`assert: ${msg}`);
};

await page.goto(`${BASE}/#/vocab`, { waitUntil: "networkidle" });
await page.waitForSelector("text=Slovíčka 單字");
await shot("01-topics");

// 底部分頁列：捲動時仍固定在視窗底緣，且不蓋住最後一列內容
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(200);
const nav = await page.locator("nav").boundingBox();
const vh = page.viewportSize().height;
assert(Math.abs(nav.y + nav.height - vh) < 1, "捲到底時分頁列仍應貼齊視窗底緣");
assert(
  (await page.evaluate(() => {
    const navTop = document.querySelector("nav").getBoundingClientRect().top;
    const last = document.querySelector("main").lastElementChild?.getBoundingClientRect();
    return last ? last.bottom - navTop : 0;
  })) <= 0,
  "捲到底時內容不應被分頁列蓋住",
);
await page.evaluate(() => window.scrollTo(0, 0));

await page.click("text=居住");
await page.waitForSelector("text=居住 ・ 第 1 節");
await shot("02-units");

await page.click("text=居住 ・ 第 1 節");
await page.waitForSelector("article h1");
assert((await page.locator("article h1").first().innerText()) === "pokoj", "第一張卡應為 pokoj");
assert(await page.locator("text=4. pád").first().isVisible(), "卡片應顯示例句的格位標記");
assert((await page.locator(".mark").count()) > 0, "變格字尾應有 highlight");
await shot("03-card");

for (let i = 0; i < 4; i++) await page.click("text=/下一張|檢查點/");
await page.waitForSelector("text=檢查點 ・ 第 1–4 個字");
const options = page.locator("ul li button.hit");
assert((await options.count()) === 3, "測驗應有 3 個選項");
await shot("04-quiz");

await options.nth(0).click();
await page.waitForSelector("text=/答對了|正解/");
await shot("05-feedback");

for (let i = 0; i < 4; i++) {
  const next = page.locator(
    "button:has-text('下一題'), button:has-text('回到卡片'), button:has-text('完成小節')",
  );
  if (await next.count()) await next.first().click();
  else await options.nth(0).click();
  await page.waitForTimeout(120);
}
await shot("06-after-checkpoint");

await page.goto(`${BASE}/#/vocab/verbs`, { waitUntil: "networkidle" });
await page.waitForSelector("text=動詞 Slovesa");
await shot("07-verbs");
await page.click("text=第 3 類");
await page.click("text=/第 1 節/");
await page.waitForSelector("article h1");
await shot("08-verb-card");

await page.goto(`${BASE}/#/me`, { waitUntil: "networkidle" });
await page.waitForSelector("text=Já 我的");
await shot("09-me");

await page.click("text=深色模式 >> xpath=following-sibling::input");
await page.waitForTimeout(200);
assert((await page.locator("html").getAttribute("data-theme")) === "dark", "深色模式應切換 data-theme");
await shot("10-dark");

await browser.close();
if (errors.length) {
  console.error(`smoke ✗\n${errors.join("\n")}`);
  process.exit(1);
}
console.log(`smoke ✓  截圖在 ${OUT}/`);
