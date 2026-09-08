const fs = require("fs");
const path = require("path");
const sharp = require("D:/Codex/MissionLive-Impeccable-Test/node_modules/sharp");

const root = __dirname;
const faithfulTransparentPath = path.join(root, "reference", "faithful-master-transparent.png");
const faithfulLightPath = path.join(root, "reference", "faithful-master-light.png");

const palette = {
  dark: [16, 53, 47],
  primary: [30, 90, 74],
  mid: [63, 123, 105],
  offWhite: [247, 250, 248],
  ink: [13, 31, 27],
};

const ensureDir = (folder) => fs.mkdirSync(folder, { recursive: true });
const write = (relativePath, value) => {
  const target = path.join(root, relativePath);
  ensureDir(path.dirname(target));
  fs.writeFileSync(target, value);
};

const escapeXml = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const dataImage = (png) => `data:image/png;base64,${png.toString("base64")}`;

function symbolSvg(title, description, png) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(title)}</title>
  <desc id="desc">${escapeXml(description)}</desc>
  <image width="1024" height="1024" href="${dataImage(png)}"/>
</svg>\n`;
}

function horizontalSvg(title, symbolPng, wordmarkColor, symbolWidth = 252) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 300" role="img" aria-labelledby="title">
  <title id="title">${escapeXml(title)}</title>
  <image x="24" y="24" width="${symbolWidth}" height="252" href="${dataImage(symbolPng)}"/>
  <text x="314" y="190" fill="${wordmarkColor}" font-family="Manrope, Inter, Arial, sans-serif" font-size="128" font-weight="700" letter-spacing="-4">MissionLive</text>
</svg>\n`;
}

function verticalSvg(title, symbolPng, wordmarkColor, signatureColor = null) {
  const signature = signatureColor ? `<text x="360" y="735" text-anchor="middle" fill="${signatureColor}" font-family="Manrope, Inter, Arial, sans-serif" font-size="48" font-weight="500" letter-spacing="7">Metas Claras</text>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 ${signatureColor ? 900 : 820}" role="img" aria-labelledby="title">
  <title id="title">${escapeXml(title)}</title>
  <image x="110" y="20" width="500" height="500" href="${dataImage(symbolPng)}"/>
  <text x="360" y="660" text-anchor="middle" fill="${wordmarkColor}" font-family="Manrope, Inter, Arial, sans-serif" font-size="112" font-weight="700" letter-spacing="-3">MissionLive</text>
  ${signature}
</svg>\n`;
}

function appIconSvg(title, whiteSymbolPng, size = 512) {
  const margin = Math.round(size * 0.137);
  const inner = size - margin * 2;
  const radius = Math.round(size * 0.22);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-labelledby="title">
  <title id="title">${escapeXml(title)}</title>
  <rect width="${size}" height="${size}" rx="${radius}" fill="#10352F"/>
  <image x="${margin}" y="${margin}" width="${inner}" height="${inner}" href="${dataImage(whiteSymbolPng)}"/>
</svg>\n`;
}

function makeIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  const directory = Buffer.alloc(entries.length * 16);
  let offset = 6 + directory.length;
  entries.forEach((entry, index) => {
    const base = index * 16;
    directory.writeUInt8(entry.size === 256 ? 0 : entry.size, base);
    directory.writeUInt8(entry.size === 256 ? 0 : entry.size, base + 1);
    directory.writeUInt8(0, base + 2);
    directory.writeUInt8(0, base + 3);
    directory.writeUInt16LE(1, base + 4);
    directory.writeUInt16LE(32, base + 6);
    directory.writeUInt32LE(entry.data.length, base + 8);
    directory.writeUInt32LE(offset, base + 12);
    offset += entry.data.length;
  });
  return Buffer.concat([header, directory, ...entries.map((entry) => entry.data)]);
}

async function recolor(master, mode) {
  const { data, info } = await sharp(master).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const output = Buffer.alloc(data.length);
  for (let offset = 0; offset < data.length; offset += 4) {
    const luminance = 0.2126 * data[offset] + 0.7152 * data[offset + 1] + 0.0722 * data[offset + 2];
    const lightDetail = luminance > 175;
    const alpha = data[offset + 3];
    let color = palette.dark;
    let nextAlpha = alpha;
    if (mode === "dark") color = lightDetail ? palette.offWhite : palette.dark;
    if (mode === "white") {
      color = palette.offWhite;
      if (lightDetail) nextAlpha = 0;
    }
    output[offset] = color[0];
    output[offset + 1] = color[1];
    output[offset + 2] = color[2];
    output[offset + 3] = nextAlpha;
  }
  return sharp(output, { raw: info }).png().toBuffer();
}

async function renderSvg(svg, width, height) {
  return sharp(Buffer.from(svg)).resize(width, height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
}

async function build() {
  const faithfulMaster = fs.readFileSync(faithfulTransparentPath);
  const faithfulLight = fs.readFileSync(faithfulLightPath);
  const darkSymbol = await recolor(faithfulMaster, "dark");
  const whiteSymbol = await recolor(faithfulMaster, "white");

  write("reference/faithful-master-transparent.png", faithfulMaster);
  write("reference/faithful-master-light.png", faithfulLight);

  const primarySymbolSvg = symbolSvg("MissionLive symbol", "Faithful approved Concept B symbol without text.", faithfulMaster);
  const darkSymbolSvg = symbolSvg("MissionLive dark symbol", "Faithful approved symbol in the dark variant.", darkSymbol);
  const whiteSymbolSvg = symbolSvg("MissionLive white symbol", "Faithful approved symbol in the white knockout variant.", whiteSymbol);
  write("svg/missionlive-symbol.svg", primarySymbolSvg);

  const horizontal = horizontalSvg("MissionLive horizontal logo", faithfulMaster, "#0D1F1B");
  const vertical = verticalSvg("MissionLive vertical logo", faithfulMaster, "#0D1F1B");
  const institutional = verticalSvg("MissionLive institutional logo", faithfulMaster, "#0D1F1B", "#1E5A4A");
  const whiteLogo = horizontalSvg("MissionLive white logo", whiteSymbol, "#F7FAF8");
  const darkLogo = horizontalSvg("MissionLive dark logo", darkSymbol, "#0D1F1B");
  write("svg/missionlive-logo-horizontal.svg", horizontal);
  write("svg/missionlive-logo-vertical.svg", vertical);
  write("svg/missionlive-logo-institutional.svg", institutional);
  write("svg/missionlive-logo-white.svg", whiteLogo);
  write("svg/missionlive-logo-dark.svg", darkLogo);
  write("svg/missionlive-symbol-dark.svg", darkSymbolSvg);
  write("svg/missionlive-symbol-white.svg", whiteSymbolSvg);

  const appIcon = appIconSvg("MissionLive app icon", whiteSymbol, 512);
  const favicon = appIconSvg("MissionLive favicon", whiteSymbol, 128);
  write("svg/missionlive-app-icon.svg", appIcon);
  write("favicon/favicon.svg", favicon);

  const pngJobs = [
    [faithfulMaster, "png/missionlive-symbol-1024.png", 1024, 1024],
    [faithfulMaster, "png/missionlive-symbol-512.png", 512, 512],
    [faithfulMaster, "png/missionlive-symbol-256.png", 256, 256],
  ];
  for (const [input, output, width, height] of pngJobs) {
    write(output, await sharp(input).resize(width, height, { fit: "contain" }).png().toBuffer());
  }
  write("png/missionlive-logo-horizontal-1024.png", await renderSvg(horizontal, 1024, 240));

  const app512 = await renderSvg(appIcon, 512, 512);
  const app192 = await renderSvg(appIconSvg("MissionLive app icon", whiteSymbol, 192), 192, 192);
  const app180 = await renderSvg(appIconSvg("MissionLive app icon", whiteSymbol, 180), 180, 180);
  write("png/missionlive-app-icon-512.png", app512);
  write("png/missionlive-app-icon-192.png", app192);
  write("png/missionlive-apple-touch-icon-180.png", app180);

  const favicon32 = await renderSvg(favicon, 32, 32);
  const favicon16 = await renderSvg(favicon, 16, 16);
  write("favicon/favicon-32.png", favicon32);
  write("favicon/favicon-16.png", favicon16);
  write("png/favicon-32.png", favicon32);
  write("png/favicon-16.png", favicon16);
  write("favicon/favicon.ico", makeIco([{ size: 32, data: favicon32 }, { size: 16, data: favicon16 }]));

  write("preview/reference-faithful-master.png", faithfulLight);
  write("preview/index.html", `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>MissionLive — branding final</title>
<style>:root{color-scheme:light;--ink:#0d1f1b;--muted:#536862;--line:#c9d8d2;--paper:#eef3f0;--card:#f7faf8;--dark:#10352f}*{box-sizing:border-box}body{margin:0;color:var(--ink);background:var(--paper);font-family:Inter,Arial,sans-serif}main{width:min(1180px,calc(100% - 32px));margin:auto;padding:44px 0 72px}h1{margin:0;font-size:clamp(28px,5vw,52px);letter-spacing:-.045em}p.lead{max-width:760px;color:var(--muted);line-height:1.55;margin:10px 0 36px}h2{margin:42px 0 15px;font-size:17px;letter-spacing:.1em;text-transform:uppercase}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}.card{min-height:250px;border:1px solid var(--line);border-radius:16px;background:var(--card);padding:20px;display:flex;flex-direction:column}.card.dark{background:var(--dark);border-color:transparent}.card.wide{grid-column:1/-1}.label{margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:.09em;text-transform:uppercase}.asset{width:100%;height:190px;object-fit:contain;flex:1}.dark .asset{filter:none}.sizes{display:flex;align-items:flex-end;justify-content:space-around;gap:14px;min-height:190px}.sizes div{display:grid;justify-items:center;gap:8px;color:var(--muted);font-size:12px}.sizes img{object-fit:contain}.source{width:100%;display:block;border:1px solid var(--line);border-radius:16px}.checker{background-color:#fff;background-image:linear-gradient(45deg,#e8eeeb 25%,transparent 25%),linear-gradient(-45deg,#e8eeeb 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e8eeeb 75%),linear-gradient(-45deg,transparent 75%,#e8eeeb 75%);background-size:24px 24px;background-position:0 0,0 12px,12px -12px,-12px 0}@media(max-width:560px){main{width:min(100% - 20px,1180px);padding-top:28px}.card{min-height:220px;padding:16px}}</style></head>
<body><main><h1>MissionLive — pacote final</h1><p class="lead">Assets derivados diretamente da faithful aprovada do Conceito B. O símbolo não foi redesenhado nesta etapa.</p>
<h2>Fonte de verdade</h2><img class="source" src="reference-faithful-master.png" alt="Master visual faithful do símbolo MissionLive">
<h2>Símbolo</h2><section class="grid"><article class="card checker"><p class="label">Claro · primary</p><img class="asset" src="../svg/missionlive-symbol.svg" alt="Símbolo MissionLive"></article><article class="card dark"><p class="label">Escuro · branco</p><img class="asset" src="../svg/missionlive-symbol-white.svg" alt="Símbolo branco MissionLive"></article></section>
<h2>Logos</h2><section class="grid"><article class="card wide"><p class="label">Horizontal · fundo claro</p><img class="asset" src="../svg/missionlive-logo-horizontal.svg" alt="Logo horizontal MissionLive"></article><article class="card wide dark"><p class="label">Horizontal · fundo escuro</p><img class="asset" src="../svg/missionlive-logo-white.svg" alt="Logo branco horizontal MissionLive"></article><article class="card"><p class="label">Vertical</p><img class="asset" src="../svg/missionlive-logo-vertical.svg" alt="Logo vertical MissionLive"></article><article class="card"><p class="label">Institucional</p><img class="asset" src="../svg/missionlive-logo-institutional.svg" alt="Logo institucional MissionLive"></article></section>
<h2>App icon e favicon</h2><section class="grid"><article class="card dark"><p class="label">App icon</p><div class="sizes"><div><img width="128" height="128" src="../png/missionlive-app-icon-512.png" alt="512 pixels"><span>512</span></div><div><img width="96" height="96" src="../png/missionlive-app-icon-192.png" alt="192 pixels"><span>192</span></div><div><img width="84" height="84" src="../png/missionlive-apple-touch-icon-180.png" alt="180 pixels"><span>180</span></div></div></article><article class="card"><p class="label">Favicon</p><div class="sizes"><div><img width="64" height="64" src="../favicon/favicon-32.png" alt="32 pixels"><span>32</span></div><div><img width="32" height="32" src="../favicon/favicon-16.png" alt="16 pixels"><span>16</span></div></div></article></section></main></body></html>`);
  console.log("Final MissionLive brand package generated.");
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
