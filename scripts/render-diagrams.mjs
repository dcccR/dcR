// 把 docs/ARCHITECTURE.md 裡的 mermaid 區塊渲染成 PNG（GitHub 看得到原生 mermaid，
// 這是給不能渲染 mermaid 的地方用的）。
//   npm run diagrams
// 容器裡的 Chromium 版本若與 playwright 套件不合，用 PW_CHROMIUM 指定執行檔。

import { chromium } from "playwright";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const DOC = process.argv[2] ?? "docs/ARCHITECTURE.md";
const OUT = process.argv[3] ?? "docs/diagrams";
mkdirSync(OUT, { recursive: true });

const md = readFileSync(DOC, "utf8");
const blocks = [...md.matchAll(/```mermaid\n([\s\S]*?)```/g)].map((m) => m[1].trim());
if (!blocks.length) throw new Error(`${DOC} 裡沒有 mermaid 區塊`);

// 取每張圖前面最近的標題當檔名
const titles = [];
{
  let cursor = 0;
  for (const b of blocks) {
    const at = md.indexOf(b, cursor);
    cursor = at + b.length;
    const heading = [...md.slice(0, at).matchAll(/^#{2,3} (.+)$/gm)].pop();
    titles.push(
      (heading?.[1] ?? `diagram-${titles.length + 1}`)
        .replace(/^\d+\.\s*/, "")
        .replace(/[^\p{L}\p{N}]+/gu, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40),
    );
  }
}

const mermaidJs = readFileSync("node_modules/mermaid/dist/mermaid.min.js", "utf8");

// 沿用 App 的紙張配色（§10）
const THEME = {
  background: "#EDEAE1",
  primaryColor: "#F6F4EF",
  primaryTextColor: "#191A1C",
  primaryBorderColor: "#CFCABC",
  lineColor: "#5C5E63",
  secondaryColor: "#F2D14B",
  tertiaryColor: "#F6F4EF",
  fontFamily: "Archivo, Iansui, system-ui, sans-serif",
};

const browser = await chromium.launch(
  process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
);
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 2 });

for (const [i, code] of blocks.entries()) {
  const name = `${String(i + 1).padStart(2, "0")}-${titles[i]}`;
  await page.setContent(
    `<!doctype html><meta charset="utf-8">
     <style>body{margin:0;padding:24px;background:${THEME.background}}</style>
     <div id="d"></div><script>${mermaidJs}</script>
     <script>
       mermaid.initialize({ startOnLoad: false, theme: "base", themeVariables: ${JSON.stringify(THEME)} });
       window.render = async (code) => {
         const { svg } = await mermaid.render("g", code);
         document.getElementById("d").innerHTML = svg;
       };
     </script>`,
    { waitUntil: "load" },
  );
  await page.evaluate((c) => window.render(c), code);
  await page.waitForSelector("#d svg");
  const svg = await page.$("#d svg");
  await svg.screenshot({ path: path.join(OUT, `${name}.png`) });
  writeFileSync(
    path.join(OUT, `${name}.svg`),
    await page.evaluate(() => document.querySelector("#d svg").outerHTML),
  );
  console.log(`✓ ${name}`);
}

await browser.close();
