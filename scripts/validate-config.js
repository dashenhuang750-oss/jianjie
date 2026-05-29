const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const profileModulePath = path.join(root, "data", "profile.js");
const legacyConfigPath = path.join(root, "profile.config.json");
const errors = [];

let profile;

try {
  profile = loadProfile();
} catch (error) {
  fail(`profile data is invalid: ${error.message}`);
}

if (profile) {
  requireText("name");
  requireText("headline");
  requireText("summary");

  if (!Array.isArray(profile.modules) || profile.modules.length === 0) {
    fail("modules must be a non-empty array");
  } else {
    const ids = new Set();
    profile.modules.forEach((module, index) => {
      const where = `modules[${index}]`;
      if (!module || typeof module !== "object") {
        fail(`${where} must be an object`);
        return;
      }

      if (!module.id || typeof module.id !== "string") {
        fail(`${where}.id is required`);
      } else if (ids.has(module.id)) {
        fail(`${where}.id "${module.id}" is duplicated`);
      } else {
        ids.add(module.id);
      }

      if (!module.title || typeof module.title !== "string") {
        fail(`${where}.title is required`);
      }

      if (module.media !== undefined) {
        validateMedia(module.media, where);
      }
    });
  }

  validateLinks(profile.links);
  validateKnowledgeBase(profile.knowledgeBase);
}

if (errors.length > 0) {
  console.error("Config check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Config check passed.");

function requireText(key) {
  if (!profile[key] || typeof profile[key] !== "string") {
    fail(`${key} is required`);
  }
}

function loadProfile() {
  if (fs.existsSync(profileModulePath)) {
    delete require.cache[require.resolve(profileModulePath)];
    const data = require(profileModulePath);
    return data && data.default ? data.default : data;
  }

  return JSON.parse(fs.readFileSync(legacyConfigPath, "utf8"));
}

function validateLinks(links) {
  if (links === undefined) return;
  if (!Array.isArray(links)) {
    fail("links must be an array");
    return;
  }

  links.forEach((link, index) => {
    if (!link || typeof link !== "object") {
      fail(`links[${index}] must be an object`);
      return;
    }
    if (!link.value && !link.label) {
      fail(`links[${index}] should include value or label`);
    }
    if (link.href && !isSafeUrl(link.href)) {
      fail(`links[${index}].href must be http(s), mailto, tel, or a relative path`);
    }
  });
}

function validateMedia(media, where) {
  if (!Array.isArray(media)) {
    fail(`${where}.media must be an array`);
    return;
  }

  media.forEach((item, index) => {
    if (!item || typeof item !== "object") {
      fail(`${where}.media[${index}] must be an object`);
      return;
    }
    if (!item.src || typeof item.src !== "string") {
      fail(`${where}.media[${index}].src is required`);
    } else if (!isSafeUrl(item.src)) {
      fail(`${where}.media[${index}].src must be http(s) or a relative path`);
    }
    if (item.type && !["image", "video"].includes(String(item.type).toLowerCase())) {
      fail(`${where}.media[${index}].type must be image or video`);
    }
  });
}

function validateKnowledgeBase(entries) {
  if (entries === undefined) return;
  if (!Array.isArray(entries)) {
    fail("knowledgeBase must be an array");
    return;
  }

  entries.forEach((entry, index) => {
    if (!entry || typeof entry !== "object") {
      fail(`knowledgeBase[${index}] must be an object`);
      return;
    }
    if (!entry.topic || !entry.answer) {
      fail(`knowledgeBase[${index}] should include topic and answer`);
    }
  });
}

function isSafeUrl(value) {
  const raw = String(value || "").trim();
  return raw.startsWith("/")
    || raw.startsWith("./")
    || raw.startsWith("../")
    || /^https?:\/\//i.test(raw)
    || /^mailto:/i.test(raw)
    || /^tel:/i.test(raw);
}

function fail(message) {
  errors.push(message);
}
