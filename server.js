const http = require("node:http");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const PROFILE_PATH = path.join(ROOT, "profile.config.json");

loadEnvFile(path.join(ROOT, ".env"));

const PORT = Number(process.env.PORT || 8787);
const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const PUBLIC_SITE_URL = cleanPublicUrl(process.env.PUBLIC_SITE_URL || "");
const GUESTBOOK_PATH = process.env.GUESTBOOK_PATH
  ? path.resolve(ROOT, process.env.GUESTBOOK_PATH)
  : path.join(ROOT, "data", "guestbook.json");
const JSON_LIMIT_BYTES = 64 * 1024;
const ASSET_VERSION = createAssetVersion();
const RATE_LIMITS = new Map();
let guestbookMemory = [];

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml; charset=utf-8",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".webm": "video/webm"
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/api/profile") {
      return sendJson(res, 200, publicProfile(loadProfile()));
    }

    if (req.method === "GET" && url.pathname === "/api/health") {
      return sendJson(res, 200, {
        ok: true,
        uptime: Math.round(process.uptime()),
        guestbookPersisted: canWriteGuestbook()
      });
    }

    if (req.method === "POST" && url.pathname === "/api/chat") {
      if (isRateLimited(req, res, "chat", 18, 60 * 1000)) return;
      return await handleChat(req, res);
    }

    if (req.method === "GET" && url.pathname === "/api/guestbook") {
      return handleGuestbookList(res);
    }

    if (req.method === "POST" && url.pathname === "/api/guestbook") {
      if (isRateLimited(req, res, "guestbook:create", 8, 60 * 1000)) return;
      return await handleGuestbookCreate(req, res);
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/guestbook/")) {
      if (isRateLimited(req, res, "guestbook:delete", 20, 60 * 1000)) return;
      return await handleGuestbookDelete(req, res, url);
    }

    if (req.method === "GET" && url.pathname === "/robots.txt") {
      return sendText(res, 200, createRobotsTxt());
    }

    if (req.method === "GET" && url.pathname === "/sitemap.xml") {
      return sendText(res, 200, createSitemapXml(), "application/xml; charset=utf-8");
    }

    if (req.method === "GET") {
      return serveStatic(`${url.pathname}${url.search}`, res);
    }

    sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    sendJson(res, 500, { error: "Server error", detail: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`Personal profile site running at http://localhost:${PORT}`);
});

async function handleChat(req, res) {
  const profile = loadProfile();
  const body = await readJson(req, JSON_LIMIT_BYTES);
  const message = cleanText(body.message || "");
  const history = Array.isArray(body.history) ? body.history : [];

  if (!message) {
    return sendJson(res, 400, { error: "Message is required" });
  }

  if (message.length > 1200) {
    return sendJson(res, 400, { error: "Message is too long" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return sendJson(res, 200, {
      answer: createLocalAnswer(message, profile),
      source: "local"
    });
  }

  try {
    const answer = await createOpenAIAnswer({ message, history, profile });
    sendJson(res, 200, { answer, source: "openai" });
  } catch (error) {
    sendJson(res, 200, {
      answer: createLocalAnswer(message, profile),
      source: "local",
      note: `AI service fell back locally: ${error.message}`
    });
  }
}

function handleGuestbookList(res) {
  sendJson(res, 200, {
    messages: loadGuestbook().slice(0, 80)
  });
}

async function handleGuestbookCreate(req, res) {
  const body = await readJson(req, JSON_LIMIT_BYTES);
  const name = cleanText(body.name || "匿名访客").slice(0, 32) || "匿名访客";
  const content = cleanText(body.content || "").slice(0, 600);

  if (!content) {
    return sendJson(res, 400, { error: "留言内容不能为空" });
  }

  if (content.length < 2) {
    return sendJson(res, 400, { error: "留言太短了" });
  }

  const messages = loadGuestbook();
  const message = {
    id: createId(),
    name,
    content,
    createdAt: new Date().toISOString()
  };

  messages.unshift(message);
  const persisted = saveGuestbook(messages.slice(0, 200));
  sendJson(res, 201, { message, persisted });
}

async function handleGuestbookDelete(req, res, url) {
  const id = decodeURIComponent(url.pathname.replace(/^\/api\/guestbook\//, "")).trim();
  const body = await readJson(req, JSON_LIMIT_BYTES).catch(() => ({}));
  const password = cleanText(body.password || req.headers["x-admin-password"] || "");
  const adminPassword = getGuestbookAdminPassword();

  if (!id) {
    return sendJson(res, 400, { error: "缺少留言 ID" });
  }

  if (!adminPassword) {
    return sendJson(res, 500, { error: "管理员密码还没有配置" });
  }

  if (!secureEqual(password, adminPassword)) {
    return sendJson(res, 403, { error: "管理员密码不正确" });
  }

  const messages = loadGuestbook();
  const nextMessages = messages.filter((message) => message.id !== id);

  if (nextMessages.length === messages.length) {
    return sendJson(res, 404, { error: "留言不存在" });
  }

  const persisted = saveGuestbook(nextMessages);
  sendJson(res, 200, { ok: true, persisted });
}

async function createOpenAIAnswer({ message, history, profile }) {
  const safeHistory = history
    .filter((item) => item && ["user", "assistant"].includes(item.role))
    .slice(-8)
    .map((item) => ({
      role: item.role,
      content: cleanText(item.content || "").slice(0, 1000)
    }))
    .filter((item) => item.content);

  const input = [
    {
      role: "system",
      content: buildSystemPrompt(profile)
    },
    ...safeHistory,
    {
      role: "user",
      content: message
    }
  ];

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: MODEL,
      input,
      max_output_tokens: 520
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = data.error && data.error.message ? data.error.message : response.statusText;
    throw new Error(detail);
  }

  const answer = extractResponseText(data);
  if (!answer) {
    throw new Error("Empty model response");
  }

  return answer.slice(0, 2400);
}

function buildSystemPrompt(profile) {
  return [
    "你是这个公开个人网站的 AI 分身，代表站主回答访客问题。",
    "你必须严格基于给定资料回答。资料没有的信息，要坦诚说明不确定，并引导访客联系本人。",
    "不要编造学校、公司、奖项、项目、联系方式或私人经历。",
    "默认使用访客提问的语言。中文回答要自然、清楚、有个人风格，不要像客服模板。",
    "回答长度控制在 2 到 5 个短段落。能具体就具体，避免空泛夸张。",
    "如果问题适合转化为合作沟通，给出简洁、可执行的下一步。",
    "",
    "站主资料 JSON:",
    JSON.stringify(profile, null, 2)
  ].join("\n");
}

function extractResponseText(data) {
  if (typeof data.output_text === "string") {
    return data.output_text.trim();
  }

  if (!Array.isArray(data.output)) {
    return "";
  }

  return data.output
    .flatMap((item) => item.content || [])
    .map((part) => {
      if (typeof part.text === "string") return part.text;
      if (part.type === "output_text" && typeof part.text === "string") return part.text;
      return "";
    })
    .join("")
    .trim();
}

function createLocalAnswer(message, profile) {
  const entries = Array.isArray(profile.knowledgeBase) ? profile.knowledgeBase : [];
  const normalized = message.toLowerCase();
  let best = null;
  let bestScore = 0;

  for (const entry of entries) {
    const keywords = Array.isArray(entry.keywords) ? entry.keywords : [];
    const score = keywords.reduce((total, keyword) => {
      const key = String(keyword).toLowerCase();
      return total + (key && normalized.includes(key) ? 2 : 0);
    }, normalized.includes(String(entry.topic || "").toLowerCase()) ? 1 : 0);

    if (score > bestScore) {
      best = entry;
      bestScore = score;
    }
  }

  const voice = profile.voice && Array.isArray(profile.voice.sampleLines)
    ? profile.voice.sampleLines[0]
    : "";
  const matched = best && best.answer
    ? best.answer
    : `${profile.summary || "目前资料还不完整。"} 这个问题我还没有足够资料回答得很具体，但我会更倾向于先说清楚真实情况，再给出可以继续沟通的方向。`;

  return [
    matched,
    voice ? `换成我的说法就是：${voice}` : "",
    "如果你想得到更像本人的回答，可以在 profile.config.json 里补充更多经历、项目和语气样本。"
  ].filter(Boolean).join("\n\n");
}

function publicProfile(profile) {
  const clone = JSON.parse(JSON.stringify(profile));
  delete clone.knowledgeBase;
  delete clone.adminPassword;
  if (clone.guestbook) {
    delete clone.guestbook.adminPassword;
  }
  return clone;
}

function loadProfile() {
  const raw = fs.readFileSync(PROFILE_PATH, "utf8");
  return JSON.parse(raw);
}

function loadGuestbook() {
  try {
    if (!fs.existsSync(GUESTBOOK_PATH)) return guestbookMemory;
    const raw = fs.readFileSync(GUESTBOOK_PATH, "utf8");
    const data = JSON.parse(raw);
    const messages = Array.isArray(data) ? data.filter(isGuestbookMessage) : [];
    guestbookMemory = messages;
    return messages;
  } catch (error) {
    return guestbookMemory;
  }
}

function saveGuestbook(messages) {
  guestbookMemory = messages;
  try {
    fs.mkdirSync(path.dirname(GUESTBOOK_PATH), { recursive: true });
    fs.writeFileSync(GUESTBOOK_PATH, JSON.stringify(messages, null, 2), "utf8");
    return true;
  } catch (error) {
    return false;
  }
}

function canWriteGuestbook() {
  try {
    fs.mkdirSync(path.dirname(GUESTBOOK_PATH), { recursive: true });
    fs.accessSync(path.dirname(GUESTBOOK_PATH), fs.constants.W_OK);
    return true;
  } catch (error) {
    return false;
  }
}

function isGuestbookMessage(message) {
  return message
    && typeof message.id === "string"
    && typeof message.name === "string"
    && typeof message.content === "string"
    && typeof message.createdAt === "string";
}

function getGuestbookAdminPassword() {
  if (process.env.GUESTBOOK_ADMIN_PASSWORD) return process.env.GUESTBOOK_ADMIN_PASSWORD;
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;

  const profile = loadProfile();
  if (profile.guestbook && profile.guestbook.adminPassword) {
    return String(profile.guestbook.adminPassword);
  }

  return "";
}

function secureEqual(input, expected) {
  if (!input || !expected) return false;
  const inputBuffer = Buffer.from(String(input));
  const expectedBuffer = Buffer.from(String(expected));
  if (inputBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(inputBuffer, expectedBuffer);
}

function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function serveStatic(requestPath, res) {
  const cleanPath = decodeURIComponent(requestPath.split("?")[0]);
  const relativePath = cleanPath === "/" ? "index.html" : cleanPath.replace(/^\/+/, "");
  const target = path.normalize(path.join(PUBLIC_DIR, relativePath));
  const relativeToPublic = path.relative(PUBLIC_DIR, target);

  if (relativeToPublic.startsWith("..") || path.isAbsolute(relativeToPublic)) {
    return sendText(res, 403, "Forbidden");
  }

  fs.readFile(target, (error, content) => {
    if (error) {
      if (error.code === "ENOENT") {
        fs.readFile(path.join(PUBLIC_DIR, "index.html"), (indexError, indexContent) => {
          if (indexError) return sendText(res, 404, "Not found");
          sendHtml(res, 200, indexContent, requestPath);
        });
        return;
      }
      return sendText(res, 500, "Server error");
    }

    const type = MIME_TYPES[path.extname(target).toLowerCase()] || "application/octet-stream";
    if (type.includes("text/html")) {
      return sendHtml(res, 200, content, requestPath);
    }
    sendBuffer(res, 200, content, type, requestPath);
  });
}

function readJson(req, limit = JSON_LIMIT_BYTES) {
  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > limit) {
        req.destroy();
        reject(new Error("Request body too large"));
      }
    });

    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(new Error("Invalid JSON"));
      }
    });

    req.on("error", reject);
  });
}

function cleanText(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

function cleanPublicUrl(value) {
  const url = String(value || "").trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(url) ? url : "";
}

function getClientKey(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.socket.remoteAddress || "local";
}

function isRateLimited(req, res, bucket, maxRequests, windowMs) {
  const now = Date.now();
  const key = `${bucket}:${getClientKey(req)}`;
  const current = RATE_LIMITS.get(key);

  if (!current || current.resetAt <= now) {
    RATE_LIMITS.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  current.count += 1;
  if (current.count <= maxRequests) {
    return false;
  }

  res.writeHead(429, {
    "Content-Type": "application/json; charset=utf-8",
    "Retry-After": String(Math.ceil((current.resetAt - now) / 1000)),
    ...getSecurityHeaders()
  });
  res.end(JSON.stringify({ error: "请求太频繁，请稍后再试" }));
  return true;
}

function createRobotsTxt() {
  return [
    "User-agent: *",
    "Allow: /",
    PUBLIC_SITE_URL ? `Sitemap: ${PUBLIC_SITE_URL}/sitemap.xml` : ""
  ].filter(Boolean).join("\n");
}

function createSitemapXml() {
  const location = PUBLIC_SITE_URL || "http://localhost:8787";
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    "  <url>",
    `    <loc>${escapeXml(location)}/</loc>`,
    "    <changefreq>weekly</changefreq>",
    "    <priority>1.0</priority>",
    "  </url>",
    "</urlset>"
  ].join("\n");
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sendJson(res, status, payload) {
  sendBuffer(res, status, Buffer.from(JSON.stringify(payload)), "application/json; charset=utf-8");
}

function sendText(res, status, text, type = "text/plain; charset=utf-8") {
  sendBuffer(res, status, Buffer.from(text), type);
}

function sendHtml(res, status, content, requestPath = "") {
  const rawHtml = Buffer.isBuffer(content) ? content.toString("utf8") : String(content);
  const html = injectAssetVersion(rawHtml);
  sendBuffer(res, status, Buffer.from(html, "utf8"), MIME_TYPES[".html"], requestPath);
}

function injectAssetVersion(html) {
  return html.replace(
    /\b(href|src)="(\/(?:styles\.css|app\.js))(?:\?v=[^"]*)?"/g,
    (match, attr, assetPath) => `${attr}="${assetPath}?v=${ASSET_VERSION}"`
  );
}

function sendBuffer(res, status, content, type, requestPath = "") {
  const shouldNotCache = type.includes("text/html")
    || type.includes("json")
    || type.includes("xml");
  const hasVersion = /\bv=/.test(String(requestPath || ""));
  const cacheControl = shouldNotCache
    ? "no-store"
    : hasVersion
      ? "public, max-age=31536000, immutable"
      : "public, max-age=3600";

  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": cacheControl,
    ...getSecurityHeaders()
  });
  res.end(content);
}

function createAssetVersion() {
  const deployVersion = cleanVersion(
    process.env.RENDER_GIT_COMMIT
      || process.env.COMMIT_SHA
      || process.env.SOURCE_VERSION
      || ""
  );

  if (deployVersion) {
    return deployVersion.slice(0, 12);
  }

  const assetFiles = ["index.html", "styles.css", "app.js"];
  const latestMtime = assetFiles.reduce((latest, fileName) => {
    try {
      const filePath = path.join(PUBLIC_DIR, fileName);
      return Math.max(latest, fs.statSync(filePath).mtimeMs);
    } catch (error) {
      return latest;
    }
  }, 0);

  return String(Math.round(latestMtime || Date.now()));
}

function cleanVersion(value) {
  return String(value || "").trim().replace(/[^a-zA-Z0-9._-]/g, "");
}

function getSecurityHeaders() {
  return {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
  };
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const equals = trimmed.indexOf("=");
    if (equals === -1) continue;

    const key = trimmed.slice(0, equals).trim();
    const value = trimmed.slice(equals + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}
