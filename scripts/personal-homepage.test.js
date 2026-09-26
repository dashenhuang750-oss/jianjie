const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "index.html"), "utf8");
const built = fs.readFileSync(path.join(root, "public", "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "public", "app.js"), "utf8");

function assertPersonalAppHost(html) {
  assert.match(html, /<html lang=[\"']zh-CN[\"']>/);
  for (const id of ["profile-name", "moduleGrid", "moduleView", "moduleNav", "moduleTextContent", "assistantWorkspace", "chatForm", "messages", "themeToggle"]) {
    assert.match(html, new RegExp(`id=[\"']${id}[\"']`), `missing #${id}`);
  }
  assert.match(html, /href=[\"']\/styles\.css/);
  assert.match(html, /src=[\"']\/app\.js/);
  assert.doesNotMatch(html, /Lithos|Layers hold tales of time/i);
  assert.doesNotMatch(html, /Profile Map|Modeling Portfolio|Profile Studio|Ask Me Anything|\b0 modules\b/);
}

test("source app host keeps the DOM contract required by app.js", () => {
  assertPersonalAppHost(source);
});

test("built /app host remains the personal profile application", () => {
  assertPersonalAppHost(built);
});

test("check validates the freshly generated host after building it", () => {
  const scripts = require(path.join(root, "package.json")).scripts;
  assert.match(scripts.check, /vite build.*npm test/);
});

test("existing personal modules and API integrations remain the implementation", () => {
  assert.match(app, /\/api\/profile/);
  assert.match(app, /params\.get\([\"']module[\"']\)/);
  assert.match(app, /\/api\/chat/);
  assert.match(app, /\/api\/guestbook/);
  assert.match(app, /guestbook-form/);
  assert.doesNotMatch(app, /Profile Map|\"Guestbook\"/);
  assert.match(app, /Skills:\s*\"技能\"/);
  assert.match(app, /\"Machine Learning & Data\":\s*\"机器学习与数据\"/);
  assert.match(app, /localizeProfileLabel\(module\.eyebrow\s*\|\|/);
  assert.match(app, /stageReadoutLabel\.textContent = localizeProfileLabel\(module\.eyebrow\s*\|\|/);
  assert.match(app, /localizeProfileLabel\(group\.title\)/);
  assert.match(app, /function renderGuestbookModule[\s\S]{0,700}kicker\.textContent = localizeProfileLabel\(module\.eyebrow/);
});

test("guestbook hides only messages whose author name is exactly lowercase h", () => {
  assert.match(app, /const displayedMessages = state\.guestbookMessages\.filter\(\(message\) => message\.name !== "h"\)/);
  assert.match(app, /countTarget\.textContent = `\$\{displayedMessages\.length\} 条`/);
  assert.match(app, /const visibleMessages = displayedMessages\.slice\(0, 24\)/);
});
