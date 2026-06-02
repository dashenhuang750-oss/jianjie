const http = require("node:http");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const PROFILE_MODULE_PATH = path.join(ROOT, "data", "profile.js");
const LEGACY_PROFILE_PATH = path.join(ROOT, "profile.config.json");

loadEnvFile(path.join(ROOT, ".env"));
loadYamlEnv(path.join(ROOT, "render.yaml"));

const PORT = Number(process.env.PORT || 8787);
const DEEPSEEK_API_URL = (process.env.DEEPSEEK_API_URL || "https://api.deepseek.com").replace(/\/$/, "");
const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";
const PUBLIC_SITE_URL = cleanPublicUrl(process.env.PUBLIC_SITE_URL || "");
const CHAT_RATE_LIMIT_PER_MINUTE = clampNumber(process.env.CHAT_RATE_LIMIT_PER_MINUTE, 1, 60, 6);
const CHAT_DAILY_LIMIT_PER_IP = clampNumber(process.env.CHAT_DAILY_LIMIT_PER_IP, 1, 1000, 40);
const CHAT_MAX_MESSAGE_CHARS = clampNumber(process.env.CHAT_MAX_MESSAGE_CHARS, 80, 1200, 700);
const CHAT_MAX_HISTORY_ITEMS = clampNumber(process.env.CHAT_MAX_HISTORY_ITEMS, 0, 12, 4);
const CHAT_MAX_OUTPUT_TOKENS = clampNumber(process.env.CHAT_MAX_OUTPUT_TOKENS, 120, 1200, 420);
const LEGACY_GUESTBOOK_PATH = path.join(ROOT, "data", "guestbook.json");
const GUESTBOOK_PATH = resolveGuestbookPath();
const ANALYTICS_PATH = resolveDataFilePath("analytics.json");
const JSON_LIMIT_BYTES = 64 * 1024;
const RATE_LIMITS = new Map();
const CHAT_DAILY_USAGE = new Map();
let guestbookMemory = [];
let analyticsMemory = createEmptyAnalytics();

const REDIS_URL = (process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL || "").replace(/\/$/, "");
const REDIS_TOKEN = process.env.REDIS_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
const GUESTBOOK_REDIS_KEY = process.env.GUESTBOOK_REDIS_KEY || "guestbook:messages";
const GUESTBOOK_REDIS_LIST_KEY = process.env.GUESTBOOK_REDIS_LIST_KEY || `${GUESTBOOK_REDIS_KEY}:list`;
const ANALYTICS_REDIS_KEY = process.env.ANALYTICS_REDIS_KEY || "analytics:visits";
let guestbookStorage = {
  backend: REDIS_URL && REDIS_TOKEN ? "redis" : "file",
  durable: Boolean(REDIS_URL && REDIS_TOKEN)
};
let analyticsStorage = {
  backend: REDIS_URL && REDIS_TOKEN ? "redis" : "file",
  durable: Boolean(REDIS_URL && REDIS_TOKEN)
};

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
        guestbookPersisted: isGuestbookDurable() || canWriteGuestbook(),
        guestbookBackend: getGuestbookBackend(),
        guestbookPersistentAcrossDeploys: isGuestbookDurable(),
        guestbookCloudConfigured: hasRedisGuestbook(),
        analyticsBackend: getAnalyticsBackend(),
        analyticsPersisted: isAnalyticsDurable() || canWriteAnalytics(),
        analyticsPath: ANALYTICS_PATH,
        analyticsPersistentAcrossDeploys: isAnalyticsDurable()
      });
    }

    if (req.method === "GET" && url.pathname === "/api/analytics") {
      return handleAnalyticsSummary(res);
    }

    if (req.method === "POST" && url.pathname === "/api/analytics/visit") {
      if (isRateLimited(req, res, "analytics:visit", 30, 60 * 1000)) return;
      return await handleAnalyticsVisit(req, res);
    }

    if (req.method === "POST" && url.pathname === "/api/chat") {
      if (!isAllowedChatOrigin(req)) {
        return sendJson(res, 403, { error: "Chat requests must come from this site." });
      }
      if (isRateLimited(req, res, "chat", CHAT_RATE_LIMIT_PER_MINUTE, 60 * 1000)) return;
      return await handleChat(req, res);
    }

    if (req.method === "GET" && url.pathname === "/api/guestbook") {
      return await handleGuestbookList(res);
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

  if (message.length > CHAT_MAX_MESSAGE_CHARS) {
    return sendJson(res, 400, { error: `Message is too long. Limit is ${CHAT_MAX_MESSAGE_CHARS} characters.` });
  }

  if (isChatDailyLimited(req, res)) {
    return;
  }

  if (!process.env.DEEPSEEK_API_KEY) {
    return sendJson(res, 503, {
      error: "DeepSeek API key is not configured. Set DEEPSEEK_API_KEY to enable AI answers."
    });
  }

  try {
    const answer = await createDeepSeekAnswer({ message, history, profile });
    sendJson(res, 200, { answer, source: "deepseek" });
  } catch (error) {
    sendJson(res, 502, {
      error: "DeepSeek request failed",
      detail: error.message
    });
  }
}

async function handleGuestbookList(res) {
  const messages = await loadGuestbook();
  sendJson(res, 200, {
    messages: messages.slice(0, 80),
    backend: getGuestbookBackend(),
    durable: isGuestbookDurable()
  });
}

async function handleGuestbookCreate(req, res) {
  const body = await readJson(req, JSON_LIMIT_BYTES);
  const name = cleanText(body.name || "????").slice(0, 32) || "????";
  const content = cleanText(body.content || "").slice(0, 600);

  if (!content) {
    return sendJson(res, 400, { error: "????????" });
  }

  if (content.length < 2) {
    return sendJson(res, 400, { error: "?????" });
  }

  const message = {
    id: createId(),
    name,
    content,
    createdAt: new Date().toISOString()
  };

  const saveResult = await appendGuestbookMessage(message);
  sendJson(res, 201, {
    message,
    persisted: saveResult.ok,
    backend: saveResult.backend,
    durable: saveResult.durable
  });
}

async function handleGuestbookDelete(req, res, url) {
  const id = decodeURIComponent(url.pathname.replace(/^\/api\/guestbook\//, "")).trim();
  const body = await readJson(req, JSON_LIMIT_BYTES).catch(() => ({}));
  const password = cleanText(body.password || req.headers["x-admin-password"] || "");
  const adminPassword = getGuestbookAdminPassword();

  if (!id) {
    return sendJson(res, 400, { error: "???? ID" });
  }

  if (!adminPassword) {
    return sendJson(res, 500, { error: "??????????" });
  }

  if (!secureEqual(password, adminPassword)) {
    return sendJson(res, 403, { error: "????????" });
  }

  const messages = await loadGuestbook();
  const nextMessages = messages.filter((message) => message.id !== id);

  if (nextMessages.length === messages.length) {
    return sendJson(res, 404, { error: "?????" });
  }

  const saveResult = await saveGuestbook(nextMessages);
  sendJson(res, 200, {
    ok: true,
    persisted: saveResult.ok,
    backend: saveResult.backend,
    durable: saveResult.durable
  });
}

async function createDeepSeekAnswer({ message, history, profile }) {
  const safeHistory = history
    .filter((item) => item && ["user", "assistant"].includes(item.role))
    .slice(-CHAT_MAX_HISTORY_ITEMS)
    .map((item) => ({
      role: item.role,
      content: cleanText(item.content || "").slice(0, 600)
    }))
    .filter((item) => item.content);

  const messages = [
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

  const response = await fetch(`${DEEPSEEK_API_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: CHAT_MAX_OUTPUT_TOKENS,
      stream: false,
      thinking: { type: "disabled" }
    }),
    signal: AbortSignal.timeout(25 * 1000)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = data.error && data.error.message ? data.error.message : response.statusText;
    throw new Error(detail);
  }

  const answer = extractDeepSeekChatText(data);
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

function extractDeepSeekChatText(data) {
  const choice = Array.isArray(data.choices) ? data.choices[0] : null;
  const content = choice && choice.message ? choice.message.content : "";
  return typeof content === "string" ? content.trim() : "";
}

async function handleAnalyticsSummary(res) {
  const analytics = await loadAnalytics();
  sendJson(res, 200, createAnalyticsSummary(analytics));
}

async function handleAnalyticsVisit(req, res) {
  const body = await readJson(req, JSON_LIMIT_BYTES).catch(() => ({}));
  const visitorId = cleanText(body.visitorId || "").slice(0, 120);
  const page = cleanText(body.page || "").slice(0, 160) || "/";
  const analytics = await loadAnalytics();
  const now = new Date();
  const day = formatAnalyticsDay(now);
  const visitorKey = hashAnalyticsVisitor(visitorId || getClientKey(req));
  const visitor = analytics.visitors[visitorKey] || {
    firstSeenAt: now.toISOString(),
    lastSeenAt: "",
    views: 0
  };

  analytics.totalViews += 1;
  analytics.updatedAt = now.toISOString();
  analytics.daily[day] = analytics.daily[day] || { views: 0, visitors: {} };
  analytics.daily[day].views += 1;
  analytics.daily[day].visitors[visitorKey] = true;
  analytics.pages[page] = (analytics.pages[page] || 0) + 1;

  visitor.lastSeenAt = now.toISOString();
  visitor.views += 1;
  analytics.visitors[visitorKey] = visitor;

  await saveAnalytics(analytics);
  sendJson(res, 200, createAnalyticsSummary(analytics));
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
  if (fs.existsSync(PROFILE_MODULE_PATH)) {
    delete require.cache[require.resolve(PROFILE_MODULE_PATH)];
    const profile = require(PROFILE_MODULE_PATH);
    return profile && profile.default ? profile.default : profile;
  }

  const raw = fs.readFileSync(LEGACY_PROFILE_PATH, "utf8");
  return JSON.parse(raw);
}

function createEmptyAnalytics() {
  return {
    totalViews: 0,
    visitors: {},
    daily: {},
    pages: {},
    updatedAt: ""
  };
}

async function loadAnalytics() {
  const redisAnalytics = await loadAnalyticsFromRedis();
  if (redisAnalytics !== null) {
    analyticsMemory = redisAnalytics;
    setAnalyticsStorageStatus("redis", true);
    return redisAnalytics;
  }

  try {
    if (!fs.existsSync(ANALYTICS_PATH)) {
      setAnalyticsStorageStatus("memory", false);
      return analyticsMemory;
    }

    const data = JSON.parse(fs.readFileSync(ANALYTICS_PATH, "utf8"));
    analyticsMemory = normalizeAnalytics(data);
    setAnalyticsStorageStatus("file", isAnalyticsDiskPath());
    return analyticsMemory;
  } catch (error) {
    setAnalyticsStorageStatus("memory", false);
    return analyticsMemory;
  }
}

async function saveAnalytics(analytics) {
  analyticsMemory = pruneAnalytics(normalizeAnalytics(analytics));

  if (hasRedisAnalytics()) {
    const redisOk = await saveAnalyticsToRedis(analyticsMemory);
    if (redisOk) {
      saveAnalyticsToFile(analyticsMemory);
      setAnalyticsStorageStatus("redis", true);
      return true;
    }
  }

  const fileOk = saveAnalyticsToFile(analyticsMemory);
  setAnalyticsStorageStatus(fileOk ? "file" : "memory", fileOk && isAnalyticsDiskPath());
  return fileOk;
}

function saveAnalyticsToFile(analytics) {
  try {
    fs.mkdirSync(path.dirname(ANALYTICS_PATH), { recursive: true });
    fs.writeFileSync(ANALYTICS_PATH, JSON.stringify(analytics, null, 2), "utf8");
    return true;
  } catch (error) {
    return false;
  }
}

async function loadAnalyticsFromRedis() {
  if (!hasRedisAnalytics()) return null;
  try {
    const data = await redisCommand(["GET", ANALYTICS_REDIS_KEY]);
    if (!data.result) return createEmptyAnalytics();
    return normalizeAnalytics(JSON.parse(data.result));
  } catch {
    return null;
  }
}

async function saveAnalyticsToRedis(analytics) {
  if (!hasRedisAnalytics()) return false;
  try {
    const data = await redisCommand(["SET", ANALYTICS_REDIS_KEY, JSON.stringify(analytics)]);
    return Boolean(data.result);
  } catch {
    return false;
  }
}

function normalizeAnalytics(data) {
  return {
    totalViews: Number.isFinite(data && data.totalViews) ? Math.max(0, Math.floor(data.totalViews)) : 0,
    visitors: data && data.visitors && typeof data.visitors === "object" ? data.visitors : {},
    daily: data && data.daily && typeof data.daily === "object" ? data.daily : {},
    pages: data && data.pages && typeof data.pages === "object" ? data.pages : {},
    updatedAt: data && typeof data.updatedAt === "string" ? data.updatedAt : ""
  };
}

function pruneAnalytics(analytics) {
  const days = Object.keys(analytics.daily).sort();
  const keepDays = new Set(days.slice(-90));
  analytics.daily = days.reduce((result, day) => {
    if (keepDays.has(day)) result[day] = analytics.daily[day];
    return result;
  }, {});

  return analytics;
}

function createAnalyticsSummary(analytics) {
  const today = formatAnalyticsDay(new Date());
  const todayData = analytics.daily[today] || { views: 0, visitors: {} };
  return {
    totalViews: analytics.totalViews,
    uniqueVisitors: Object.keys(analytics.visitors).length,
    todayViews: todayData.views || 0,
    todayVisitors: Object.keys(todayData.visitors || {}).length,
    updatedAt: analytics.updatedAt
  };
}

function hashAnalyticsVisitor(value) {
  const salt = process.env.ANALYTICS_SALT || "personal-profile-ai";
  return crypto
    .createHash("sha256")
    .update(`${salt}:${value}`)
    .digest("hex")
    .slice(0, 32);
}

function formatAnalyticsDay(date) {
  return date.toISOString().slice(0, 10);
}

async function loadGuestbook() {
  const redisMessages = await loadGuestbookFromRedis();
  if (redisMessages !== null) {
    guestbookMemory = redisMessages;
    setGuestbookStorageStatus("redis", true);
    return redisMessages;
  }

  try {
    if (!fs.existsSync(GUESTBOOK_PATH)) {
      const seededMessages = loadGuestbookSeed();
      if (seededMessages.length > 0) {
        guestbookMemory = seededMessages;
        saveGuestbookToFile(seededMessages);
        setGuestbookStorageStatus("file", false);
        return seededMessages;
      }
      setGuestbookStorageStatus("memory", false);
      return guestbookMemory;
    }
    const raw = fs.readFileSync(GUESTBOOK_PATH, "utf8");
    const data = JSON.parse(raw);
    const messages = Array.isArray(data) ? data.filter(isGuestbookMessage) : [];
    guestbookMemory = messages;
    setGuestbookStorageStatus("file", false);
    return messages;
  } catch (error) {
    setGuestbookStorageStatus("memory", false);
    return guestbookMemory;
  }
}

async function saveGuestbook(messages) {
  guestbookMemory = messages;

  if (hasRedisGuestbook()) {
    const redisOk = await saveGuestbookToRedis(messages);
    if (redisOk) {
      saveGuestbookToFile(messages);
      return createGuestbookSaveResult(true, "redis", true);
    }
  }

  const fileOk = saveGuestbookToFile(messages);
  return createGuestbookSaveResult(fileOk, fileOk ? "file" : "memory", false);
}

async function appendGuestbookMessage(message) {
  if (hasRedisGuestbook()) {
    try {
      const existing = await loadGuestbook();
      const messages = [message, ...existing.filter((item) => item.id !== message.id)].slice(0, 200);
      guestbookMemory = messages;
      await redisCommand(["LPUSH", GUESTBOOK_REDIS_LIST_KEY, JSON.stringify(message)]);
      await redisCommand(["LTRIM", GUESTBOOK_REDIS_LIST_KEY, "0", "199"]);
      await saveGuestbookToRedis(messages);
      saveGuestbookToFile(messages);
      setGuestbookStorageStatus("redis", true);
      return createGuestbookSaveResult(true, "redis", true);
    } catch (error) {
      // Fall through to file storage so a temporary Redis problem does not drop the visitor's text.
    }
  }

  const messages = [message, ...guestbookMemory].slice(0, 200);
  return await saveGuestbook(messages);
}

async function loadGuestbookFromRedis() {
  if (!hasRedisGuestbook()) return null;
  try {
    const listData = await redisCommand(["LRANGE", GUESTBOOK_REDIS_LIST_KEY, "0", "199"]);
    if (Array.isArray(listData.result) && listData.result.length > 0) {
      return listData.result
        .map((item) => parseGuestbookMessage(item))
        .filter(isGuestbookMessage);
    }

    const data = await redisCommand(["GET", GUESTBOOK_REDIS_KEY]);
    if (!data.result) return [];
    const messages = JSON.parse(data.result);
    const filtered = Array.isArray(messages) ? messages.filter(isGuestbookMessage) : [];
    if (filtered.length > 0) {
      await seedGuestbookRedisList(filtered);
    }
    return filtered;
  } catch {
    return null;
  }
}

async function saveGuestbookToRedis(messages) {
  if (!hasRedisGuestbook()) return false;
  try {
    const data = await redisCommand(["SET", GUESTBOOK_REDIS_KEY, JSON.stringify(messages)]);
    await seedGuestbookRedisList(messages);
    return Boolean(data.result);
  } catch {
    return false;
  }
}

async function seedGuestbookRedisList(messages) {
  const values = messages.slice(0, 200).map((message) => JSON.stringify(message));
  await redisCommand(["DEL", GUESTBOOK_REDIS_LIST_KEY]);
  if (values.length > 0) {
    await redisCommand(["RPUSH", GUESTBOOK_REDIS_LIST_KEY, ...values]);
  }
}

function parseGuestbookMessage(value) {
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return null;
  }
}

async function redisCommand(command) {
  const res = await fetch(REDIS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(command)
  });
  if (!res.ok) {
    throw new Error(`Redis request failed: ${res.status}`);
  }
  return await res.json();
}

function saveGuestbookToFile(messages) {
  try {
    fs.mkdirSync(path.dirname(GUESTBOOK_PATH), { recursive: true });
    fs.writeFileSync(GUESTBOOK_PATH, JSON.stringify(messages, null, 2), "utf8");
    return true;
  } catch (error) {
    return false;
  }
}

function hasRedisGuestbook() {
  return Boolean(REDIS_URL && REDIS_TOKEN);
}

function hasRedisAnalytics() {
  return Boolean(REDIS_URL && REDIS_TOKEN);
}

function createGuestbookSaveResult(ok, backend, durable) {
  setGuestbookStorageStatus(backend, durable);
  return { ok, backend, durable };
}

function setGuestbookStorageStatus(backend, durable) {
  guestbookStorage = { backend, durable };
}

function getGuestbookBackend() {
  return guestbookStorage.backend || (hasRedisGuestbook() ? "redis" : "file");
}

function isGuestbookDurable() {
  return Boolean(guestbookStorage.durable);
}

function setAnalyticsStorageStatus(backend, durable) {
  analyticsStorage = { backend, durable };
}

function getAnalyticsBackend() {
  return analyticsStorage.backend || (hasRedisAnalytics() ? "redis" : "file");
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

function canWriteAnalytics() {
  try {
    fs.mkdirSync(path.dirname(ANALYTICS_PATH), { recursive: true });
    fs.accessSync(path.dirname(ANALYTICS_PATH), fs.constants.W_OK);
    return true;
  } catch (error) {
    return false;
  }
}

function isAnalyticsDurable() {
  return Boolean(analyticsStorage.durable) || isAnalyticsDiskPath();
}

function isAnalyticsDiskPath() {
  if (!process.env.RENDER) return false;
  return path.resolve(ANALYTICS_PATH).startsWith(path.resolve("/var/data"));
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

  let relativePath;
  if (cleanPath === "/") {
    relativePath = "cover.html";
  } else if (cleanPath === "/app" || cleanPath === "/app/" || cleanPath.startsWith("/app/")) {
    relativePath = "index.html";
  } else {
    relativePath = cleanPath.replace(/^\/+/, "");
  }

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

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function getClientKey(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.socket.remoteAddress || "local";
}

function isAllowedChatOrigin(req) {
  const origin = cleanPublicUrl(req.headers.origin || "");
  const referer = cleanPublicUrl(req.headers.referer || "");
  const host = String(req.headers.host || "").toLowerCase();

  if (!origin && !referer) return true;

  const allowed = new Set([
    `http://${host}`,
    `https://${host}`,
    PUBLIC_SITE_URL
  ].filter(Boolean).map((value) => value.toLowerCase()));

  const source = (origin || referer).toLowerCase();
  return [...allowed].some((allowedOrigin) => source === allowedOrigin || source.startsWith(`${allowedOrigin}/`));
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

function isChatDailyLimited(req, res) {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const key = `chat:${day}:${getClientKey(req)}`;
  const tomorrow = new Date(now);
  tomorrow.setUTCHours(24, 0, 0, 0);

  cleanupDailyChatUsage(day);

  const current = CHAT_DAILY_USAGE.get(key) || {
    count: 0,
    day,
    resetAt: tomorrow.getTime()
  };

  current.count += 1;
  CHAT_DAILY_USAGE.set(key, current);

  if (current.count <= CHAT_DAILY_LIMIT_PER_IP) {
    return false;
  }

  res.writeHead(429, {
    "Content-Type": "application/json; charset=utf-8",
    "Retry-After": String(Math.max(60, Math.ceil((current.resetAt - Date.now()) / 1000))),
    ...getSecurityHeaders()
  });
  res.end(JSON.stringify({ error: "Daily chat limit reached. Please try again tomorrow." }));
  return true;
}

function cleanupDailyChatUsage(currentDay) {
  if (CHAT_DAILY_USAGE.size < 1000) return;
  for (const [key, value] of CHAT_DAILY_USAGE.entries()) {
    if (!value || value.day !== currentDay || value.resetAt <= Date.now()) {
      CHAT_DAILY_USAGE.delete(key);
    }
  }
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
  const assetVersion = createAssetVersion();
  return html.replace(
    /\b(href|src)="(\/(?:cover\.css|styles\.css|app\.js))(?:\?v=[^"]*)?"/g,
    (match, attr, assetPath) => `${attr}="${assetPath}?v=${assetVersion}"`
  );
}

function resolveGuestbookPath() {
  if (process.env.GUESTBOOK_PATH) {
    return path.resolve(ROOT, process.env.GUESTBOOK_PATH);
  }

  if (process.env.DATA_DIR) {
    return path.resolve(ROOT, process.env.DATA_DIR, "guestbook.json");
  }

  const renderDiskPath = "/var/data";
  if (process.env.RENDER && fs.existsSync(renderDiskPath)) {
    return path.join(renderDiskPath, "guestbook.json");
  }

  return path.join(ROOT, ".guestbook", "guestbook.json");
}

function resolveDataFilePath(fileName) {
  if (process.env.DATA_DIR) {
    return path.resolve(ROOT, process.env.DATA_DIR, fileName);
  }

  const renderDiskPath = "/var/data";
  if (process.env.RENDER && fs.existsSync(renderDiskPath)) {
    return path.join(renderDiskPath, fileName);
  }

  return path.join(ROOT, ".analytics", fileName);
}

function loadGuestbookSeed() {
  if (GUESTBOOK_PATH === LEGACY_GUESTBOOK_PATH || !fs.existsSync(LEGACY_GUESTBOOK_PATH)) {
    return [];
  }

  try {
    const data = JSON.parse(fs.readFileSync(LEGACY_GUESTBOOK_PATH, "utf8"));
    return Array.isArray(data) ? data.filter(isGuestbookMessage) : [];
  } catch (error) {
    return [];
  }
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

  const assetFiles = ["cover.html", "cover.css", "index.html", "styles.css", "app.js"];
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
    "X-Frame-Options": "DENY",
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

function loadYamlEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  let inEnvVars = false;
  let currentKey = null;

  for (const line of lines) {
    if (/^\s*envVars:/.test(line)) {
      inEnvVars = true;
      continue;
    }
    if (!inEnvVars) continue;
    if (/^\S/.test(line)) { inEnvVars = false; currentKey = null; continue; }

    const keyMatch = line.match(/^\s+-\s+key:\s*(.+)/);
    if (keyMatch) { currentKey = keyMatch[1].trim(); continue; }

    if (currentKey) {
      const valueMatch = line.match(/^\s+value:\s*["']?(.+?)["']?\s*$/);
      if (valueMatch && valueMatch[1] && !process.env[currentKey]) {
        process.env[currentKey] = valueMatch[1];
      }
      currentKey = null;
    }
  }
}
