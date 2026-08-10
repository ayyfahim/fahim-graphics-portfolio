const { chromium } = require("D:/Work/mental-empire-studio/node_modules/playwright");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto("http://localhost:4321/", { waitUntil: "load" });
  await p.waitForTimeout(1200);
  const rows = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll("p,li,dd,figcaption,h1,h2,h3").forEach(el => {
      const t = (el.innerText || "").trim();
      if (t.length < 40) return;
      const cs = getComputedStyle(el);
      const fs = parseFloat(cs.fontSize);
      const w = el.getBoundingClientRect().width;
      const cpl = w / (fs * 0.5);
      if (cpl > 78) out.push({ cpl: Math.round(cpl), cls: String(el.className || el.tagName), px: Math.round(w), fs, txt: t.slice(0, 55) });
    });
    return out.sort((a, b) => b.cpl - a.cpl);
  });
  console.log(JSON.stringify(rows, null, 1));
  await b.close();
})();
