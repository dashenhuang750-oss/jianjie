const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const cover = fs.readFileSync(path.join(root, "public", "cover.html"), "utf8");
const styles = fs.readFileSync(path.join(root, "public", "cover.css"), "utf8");

test("cover uses the personal mountain and tracks the pointer for the spotlight", () => {
  assert.match(cover, /url\(["']?\/media\/mountain-hero\.webp/);
  assert.match(cover, /setProperty\(["']--px["']/);
  assert.match(cover, /setProperty\(["']--py["']/);
  assert.match(styles, /radial-gradient\([^;]*var\(--px,\s*50%\)\s+var\(--py,\s*50%\)/s);
});

test("pointer reveals a crisp, aligned mountain layer with the Lithos radial mask", () => {
  assert.match(cover, /class="mountain-base"/);
  assert.match(cover, /class="mountain-reveal"/);
  assert.match(cover, /const POINTER_EASING\s*=\s*0\.1/);
  assert.match(cover, /mountainLayer\.getBoundingClientRect\(\)/);
  assert.match(cover, /pointer\.currentX\s*\+=\s*\(pointer\.targetX\s*-\s*pointer\.currentX\)\s*\*\s*POINTER_EASING/);
  assert.match(cover, /translate3d\([\s\S]*?calc\(\(0\.5\s*-\s*var\(--mx\)\)\s*\*\s*28px\)/);
  assert.match(cover, /scale\(1\.045\)/);
  assert.match(cover, /const pullX\s*=\s*\(mx\s*-\s*0\.5\)\s*\*\s*18/);
  assert.match(styles, /\.mountain-reveal[\s\S]*?mask-image:\s*radial-gradient\([\s\S]*?circle 260px at var\(--px,\s*50%\)\s+var\(--py,\s*50%\)[\s\S]*?#000 0%\s*,\s*#000 40%\s*,\s*rgba\(0,\s*0,\s*0,\s*0\.75\) 60%\s*,\s*rgba\(0,\s*0,\s*0,\s*0\.4\) 75%\s*,\s*rgba\(0,\s*0,\s*0,\s*0\.12\) 88%\s*,\s*transparent 100%/);
  assert.match(cover, /\.mountain-base,\s*\.mountain-reveal\s*\{[^}]*background-image:\s*url\("\/media\/mountain-hero\.webp"\)/s);
  const revealRule = styles.match(/\.mountain-reveal\s*\{([^}]*)\}/s)?.[1] ?? "";
  assert.doesNotMatch(revealRule, /(?:filter|transform|transform-origin|mix-blend-mode|opacity)\s*:/);
  assert.match(cover, /translate3d\(calc\(\(var\(--mx\)\s*-\s*0\.5\)\s*\*\s*14px/);
});

test("cover keeps its image clear and the spotlight cannot block controls", () => {
  assert.match(styles, /\.mountain-base[\s\S]*?filter:\s*[^;]*brightness\(0\.84\)/);
  assert.match(styles, /pointer-events:\s*none/);
  assert.match(styles, /\.mountain-reveal[\s\S]*?pointer-events:\s*none/);
  assert.doesNotMatch(styles, /rgba\(255, 255, 245, 0\.92\)/);
});

test("cover retains mobile and reduced-motion accommodations", () => {
  assert.match(styles, /@media\s*\(max-width:\s*820px\)/);
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});

test("cover copy is presented in Chinese", () => {
  assert.match(cover, /西北农林科技大学/);
  assert.doesNotMatch(cover, /Huang Wenhao|Northwest A&F University|>Projects<|>Skills<|>Contact<|>Enter<|Mathematical Modeling|Portfolio \/ Data Analysis/);
});
