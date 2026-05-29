const MOBILE_QUERY = window.matchMedia("(max-width: 720px), (pointer: coarse)");

const state = {
  profile: null,
  modules: [],
  activeModuleId: null,
  messages: [],
  busy: false,
  assistantReady: false,
  guestbookMessages: [],
  guestbookMode: "server",
  guestbookBackend: "server",
  guestbookDurable: false,
  guestbookAdminPassword: localStorage.getItem("guestbook-admin-password") || "",
  stageGrains: [],
  stageFrameAt: 0,
  scrollingUntil: 0,
  pointer: { x: 0.5, y: 0.5, active: false },
  reduceMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches
};

function isMobileView() {
  return MOBILE_QUERY.matches || window.innerWidth <= 720;
}

const VISUAL_ACCENTS = ["#172027", "#5f6b73", "#9aa4aa", "#3e4a52", "#b8c0c5", "#2d363d"];

const elements = {
  body: document.body,
  canvas: document.querySelector("#signatureCanvas"),
  cloudCanvas: document.querySelector("#cloudCanvas"),
  stageCanvas: document.querySelector("#stageCanvas"),
  stageNodes: document.querySelector("#stageNodes"),
  stageReadoutLabel: document.querySelector("#stageReadoutLabel"),
  stageReadoutTitle: document.querySelector("#stageReadoutTitle"),
  brandInitial: document.querySelector("#brandInitial"),
  brandName: document.querySelector("#brandName"),
  homeButton: document.querySelector("#homeButton"),
  homeView: document.querySelector("#homeView"),
  moduleView: document.querySelector("#moduleView"),
  moduleCount: document.querySelector("#moduleCount"),
  moduleGrid: document.querySelector("#moduleGrid"),
  moduleNav: document.querySelector("#moduleNav"),
  moduleProgress: document.querySelector("#moduleProgress"),
  moduleTextContent: document.querySelector("#moduleTextContent"),
  moduleDetail: document.querySelector(".module-detail"),
  assistantWorkspace: document.querySelector("#assistantWorkspace"),
  backButton: document.querySelector("#backButton"),
  name: document.querySelector("#profile-name"),
  role: document.querySelector("#profile-role"),
  headline: document.querySelector("#headline"),
  location: document.querySelector("#location"),
  availability: document.querySelector("#availability"),
  factGrid: document.querySelector("#factGrid"),
  linkList: document.querySelector("#linkList"),
  quickQuestions: document.querySelector("#quickQuestions"),
  messages: document.querySelector("#messages"),
  form: document.querySelector("#chatForm"),
  input: document.querySelector("#messageInput"),
  sendButton: document.querySelector("#sendButton"),
  themeToggle: document.querySelector("#themeToggle")
};

init();

async function init() {
  setupTheme();
  setupCanvas();
  setupCloudCanvas();
  bindGlobalEvents();
  bindChatEvents();

  try {
    const response = await fetch("/api/profile", { cache: "no-store" });
    state.profile = await response.json();
  } catch (error) {
    state.profile = createFallbackProfile();
  }

  try {
    state.modules = normalizeModules(state.profile);
    renderProfile(state.profile);
    renderModules();
    setupStageMap();
  } finally {
    revealApp();
  }
}

function revealApp() {
  requestAnimationFrame(() => {
    elements.body.classList.remove("is-booting");
  });
}

function setupTheme() {
  const stored = localStorage.getItem("profile-theme");
  elements.body.dataset.theme = stored || "light";
}

function bindGlobalEvents() {
  elements.themeToggle.addEventListener("click", () => {
    const next = elements.body.dataset.theme === "dark" ? "light" : "dark";
    elements.body.dataset.theme = next;
    localStorage.setItem("profile-theme", next);
  });

  elements.homeButton.addEventListener("click", closeModule);
  elements.backButton.addEventListener("click", closeModule);

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-open-module]");
    if (!trigger) return;
    openModule(trigger.dataset.openModule);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && elements.moduleView.classList.contains("is-active")) {
      closeModule();
    }
  });

  window.addEventListener("pointermove", (event) => {
    if (isMobileView() && event.pointerType === "touch") return;

    const mx = event.clientX / Math.max(window.innerWidth, 1);
    const my = event.clientY / Math.max(window.innerHeight, 1);
    state.pointer.x = mx;
    state.pointer.y = my;
    state.pointer.active = true;
    elements.body.style.setProperty("--mx", mx.toFixed(3));
    elements.body.style.setProperty("--my", my.toFixed(3));
    elements.body.style.setProperty("--tilt-x", mx.toFixed(3));
    elements.body.style.setProperty("--tilt-y", my.toFixed(3));
  }, { passive: true });

  window.addEventListener("pointerleave", () => {
    state.pointer.active = false;
  });

  const markScrolling = () => {
    state.scrollingUntil = performance.now() + 260;
  };

  window.addEventListener("scroll", markScrolling, { passive: true });
  elements.moduleDetail.addEventListener("scroll", markScrolling, { passive: true });
  elements.messages.addEventListener("scroll", markScrolling, { passive: true });
}

function bindChatEvents() {
  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    sendCurrentMessage();
  });

  elements.input.addEventListener("input", () => {
    elements.input.style.height = "auto";
    elements.input.style.height = `${Math.min(elements.input.scrollHeight, 160)}px`;
  });

  elements.input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendCurrentMessage();
    }
  });
}

function renderProfile(profile) {
  const name = profile.name || "你的名字";
  const latinName = profile.latinName || "";
  document.title = profile.siteTitle || `${name} | 数理建模 · 统计建模 · 数据分析`;
  updateMeta("name", "description", profile.siteDescription || profile.summary || "");
  updateMeta("property", "og:title", profile.siteTitle || document.title);
  updateMeta("property", "og:description", profile.siteDescription || profile.summary || "");

  elements.brandName.textContent = name;
  elements.brandInitial.textContent = name.trim().slice(0, 1).toUpperCase() || "P";
  elements.name.replaceChildren(createNameLine(name, "name-primary"));
  if (latinName) {
    elements.name.append(createNameLine(latinName, "name-latin"));
  }
  elements.role.textContent = profile.role || "创作者";
  elements.headline.textContent = profile.headline || "";
  elements.location.textContent = profile.location || "";
  elements.availability.textContent = profile.availability || "开放交流";

  elements.factGrid.replaceChildren(...(profile.facts || []).map((fact) => {
    const item = document.createElement("article");
    item.className = "fact";

    const label = document.createElement("strong");
    label.textContent = fact.label || "";

    const value = document.createElement("span");
    value.textContent = fact.value || "";

    item.append(label, value);
    return item;
  }));

  elements.linkList.replaceChildren(...(profile.links || []).map((link) => {
    const label = link.label && link.value ? `${link.label}：${link.value}` : link.value || link.label || "Link";
    if (!link.href) {
      const item = document.createElement("span");
      item.textContent = label;
      return item;
    }

    const anchor = document.createElement("a");
    anchor.href = link.href;
    anchor.textContent = label;
    anchor.target = anchor.href.startsWith("http") ? "_blank" : "";
    anchor.rel = anchor.target ? "noreferrer" : "";
    return anchor;
  }));

  elements.quickQuestions.replaceChildren(...(profile.quickQuestions || []).map((question) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = question;
    button.addEventListener("click", () => {
      openModule("assistant");
      requestAnimationFrame(() => {
        elements.input.value = question;
        elements.input.dispatchEvent(new Event("input"));
        sendCurrentMessage();
      });
    });
    return button;
  }));
}

function createNameLine(text, className) {
  const span = document.createElement("span");
  span.className = className;
  span.textContent = text;
  return span;
}

function updateMeta(key, name, content) {
  if (!content) return;
  const selector = key === "property" ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  const meta = document.querySelector(selector);
  if (meta) {
    meta.setAttribute("content", content);
  }
}

function renderModules() {
  elements.moduleCount.textContent = `${state.modules.length} 个模块`;

  elements.moduleGrid.replaceChildren(...state.modules.map((module, index) => {
    const card = document.createElement("button");
    card.className = "module-card";
    card.type = "button";
    card.dataset.openModule = module.id;
    card.style.setProperty("--accent", getModuleAccent(module, index));

    const top = document.createElement("div");
    const cardIndex = document.createElement("span");
    cardIndex.className = "card-index";
    cardIndex.textContent = String(index + 1).padStart(2, "0");

    const title = document.createElement("strong");
    title.textContent = module.title || module.id;

    const summary = document.createElement("p");
    summary.textContent = module.summary || "这里后续可以继续补充内容。";

    top.append(cardIndex, title, summary);

    const arrow = document.createElement("span");
    arrow.className = "card-arrow";
    arrow.textContent = "→";

    card.addEventListener("click", (event) => {
      event.stopPropagation();
      openModule(module.id);
    });
    card.append(top, document.createElement("span"), arrow);
    return card;
  }));

  elements.moduleNav.replaceChildren(...state.modules.map((module) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = module.title || module.id;
    button.dataset.openModule = module.id;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openModule(module.id);
    });
    return button;
  }));

  elements.moduleProgress.replaceChildren(...state.modules.map(() => document.createElement("span")));
}

function setupStageMap() {
  if (!elements.stageCanvas || !elements.stageNodes) return;

  const visibleModules = state.modules.slice(0, 6);
  elements.stageNodes.replaceChildren(...visibleModules.map((module, index) => {
    const point = getStagePoint(index, visibleModules.length);
    const button = document.createElement("button");
    button.className = "stage-node";
    button.type = "button";
    button.dataset.openModule = module.id;
    button.style.left = `${point.x}%`;
    button.style.top = `${point.y}%`;
    button.style.setProperty("--node-color", getModuleAccent(module, index));
    button.style.setProperty("--depth", `${10 + index * 2}px`);
    button.setAttribute("aria-label", module.title || module.id);

    const label = document.createElement("span");
    label.textContent = String(index + 1).padStart(2, "0");
    button.append(label);

    button.addEventListener("mouseenter", () => {
      elements.stageReadoutLabel.textContent = module.eyebrow || "Module";
      elements.stageReadoutTitle.textContent = module.title || module.id;
      highlightStageNode(module.id);
    });

    button.addEventListener("mouseleave", () => {
      elements.stageReadoutLabel.textContent = "Profile Map";
      elements.stageReadoutTitle.textContent = "";
      highlightStageNode(state.activeModuleId);
    });

    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openModule(module.id);
    });

    return button;
  }));

  drawStageMap();
  window.addEventListener("resize", () => {
    state.stageFrameAt = 0;
    drawStageMap(performance.now());
  }, { passive: true });
}

function getStagePoint(index, total) {
  const angle = -Math.PI / 2 + (index / Math.max(total, 1)) * Math.PI * 2;
  const x = 50 + Math.cos(angle) * 34;
  const y = 48 + Math.sin(angle) * 31;
  return { x, y };
}

function highlightStageNode(moduleId) {
  elements.stageNodes.querySelectorAll(".stage-node").forEach((node) => {
    node.classList.toggle("is-active", Boolean(moduleId) && node.dataset.openModule === moduleId);
  });
}

function drawStageMap(timestamp = performance.now()) {
  const compact = isMobileView();

  if (!state.reduceMotion) {
    const minFrameGap = compact ? 52 : 28;
    if (state.stageFrameAt && timestamp - state.stageFrameAt < minFrameGap) {
      requestAnimationFrame(drawStageMap);
      return;
    }
    state.stageFrameAt = timestamp;
  }

  if (elements.moduleView.classList.contains("is-active")) {
    if (!state.reduceMotion) {
      requestAnimationFrame(drawStageMap);
    }
    return;
  }

  const canvas = elements.stageCanvas;
  const context = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, compact ? 1.05 : 1.5);
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  const pixelWidth = Math.floor(width * ratio);
  const pixelHeight = Math.floor(height * ratio);

  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);

  if (
    state.stageGrains.length === 0 ||
    state.stageGrainsWidth !== Math.round(width) ||
    state.stageGrainsHeight !== Math.round(height) ||
    state.stageGrainsCompact !== compact
  ) {
    state.stageGrainsWidth = Math.round(width);
    state.stageGrainsHeight = Math.round(height);
    state.stageGrainsCompact = compact;
    state.stageGrains = createStageGrains(width, height, compact);
  }

  const centerX = width * 0.5;
  const centerY = height * 0.48;
  const radiusX = width * 0.34;
  const radiusY = height * 0.31;
  const modules = state.modules.slice(0, 6);
  const time = Date.now() * 0.00072;

  const orbitGradient = context.createLinearGradient(0, 0, width, height);
  orbitGradient.addColorStop(0, "rgba(255, 255, 255, 0.28)");
  orbitGradient.addColorStop(0.48, "rgba(73, 86, 94, 0.26)");
  orbitGradient.addColorStop(1, "rgba(255, 255, 255, 0.18)");

  context.lineWidth = 1.1;
  context.strokeStyle = orbitGradient;
  drawEllipse(context, centerX, centerY, radiusX, radiusY, -0.18);
  drawEllipse(context, centerX, centerY, radiusX * 0.72, radiusY * 0.72, 0.28);
  drawEllipse(context, centerX, centerY, radiusX * 1.08, radiusY * 0.58, 0.55);
  drawMovingOrbit(context, centerX, centerY, radiusX * 1.02, radiusY * 0.68, -0.14, time * 0.8, "rgba(255, 255, 255, 0.42)", [18, 20]);
  drawMovingOrbit(context, centerX, centerY, radiusX * 0.78, radiusY * 0.88, 0.36, -time * 0.72, "rgba(48, 58, 64, 0.24)", [10, 16]);
  drawMovingOrbit(context, centerX, centerY, radiusX * 1.18, radiusY * 0.48, 0.62, time * 0.5, "rgba(255, 255, 255, 0.22)", [7, 22]);

  drawStageGrains(context, width, height, time);

  const points = modules.map((_, index) => {
    const point = getStagePoint(index, modules.length);
    return {
      x: (point.x / 100) * width,
      y: (point.y / 100) * height
    };
  });

  context.strokeStyle = "rgba(255, 255, 255, 0.24)";
  context.beginPath();
  points.forEach((point, index) => {
    if (index === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  });
  context.closePath();
  context.stroke();

  context.strokeStyle = "rgba(48, 58, 64, 0.16)";
  points.forEach((point, index) => {
    const driftX = Math.sin(time + index * 0.8) * 10;
    const driftY = Math.cos(time * 0.9 + index) * 8;
    context.beginPath();
    context.moveTo(centerX + driftX, centerY + driftY);
    context.lineTo(point.x, point.y);
    context.stroke();
  });

  const pulseX = centerX + Math.cos(time * 1.15) * radiusX * 0.86;
  const pulseY = centerY + Math.sin(time * 1.05) * radiusY * 0.86;
  const pulseSize = 88 + Math.sin(time * 2.2) * 10;
  const gradient = context.createRadialGradient(pulseX, pulseY, 0, pulseX, pulseY, pulseSize);
  gradient.addColorStop(0, "rgba(255, 255, 255, 0.28)");
  gradient.addColorStop(0.45, "rgba(112, 124, 132, 0.12)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(pulseX, pulseY, pulseSize, 0, Math.PI * 2);
  context.fill();

  if (!state.reduceMotion) {
    requestAnimationFrame(drawStageMap);
  }
}

function createStageGrains(width, height, compact = isMobileView()) {
  const count = compact
    ? Math.min(150, Math.max(80, Math.floor((width * height) / 2200)))
    : Math.min(360, Math.max(180, Math.floor((width * height) / 1040)));
  return Array.from({ length: count }, (_, index) => {
    const ring = 0.25 + ((index * 37) % 100) / 130;
    const angle = index * 2.39996;
    return {
      x: 0.5 + Math.cos(angle) * ring * 0.38 + (Math.random() - 0.5) * 0.08,
      y: 0.48 + Math.sin(angle) * ring * 0.32 + (Math.random() - 0.5) * 0.08,
      seed: index * 0.173,
      drift: 0.35 + (index % 11) / 18,
      size: 0.7 + (index % 4) * 0.18,
      alpha: 0.14 + (index % 7) * 0.014,
      tone: index % 3
    };
  });
}

function drawStageGrains(context, width, height, time) {
  const pointerX = state.pointer.x - 0.5;
  const pointerY = state.pointer.y - 0.5;

  for (const grain of state.stageGrains) {
    const wave = Math.sin(time * grain.drift + grain.seed);
    const x = (
      grain.x +
      wave * 0.012 +
      Math.sin(time * 0.62 + grain.seed) * 0.006 +
      pointerX * 0.024 * grain.drift
    ) * width;
    const y = (
      grain.y +
      Math.cos(time * 0.86 + grain.seed) * 0.011 +
      pointerY * 0.02 * grain.drift
    ) * height;
    const alpha = grain.alpha + (wave + 1) * 0.036;
    const color = grain.tone === 0
      ? `rgba(255, 255, 255, ${alpha * 0.92})`
      : grain.tone === 1
        ? `rgba(58, 69, 76, ${alpha * 0.72})`
        : `rgba(174, 184, 190, ${alpha * 0.78})`;
    context.fillStyle = color;
    context.fillRect(x, y, grain.size, grain.size);
  }
}

function drawMovingOrbit(context, x, y, radiusX, radiusY, rotation, time, strokeStyle, dash) {
  context.save();
  context.translate(x, y);
  context.rotate(time);
  context.setLineDash(dash);
  context.lineDashOffset = -time * 28;
  context.lineWidth = 1.4;
  context.strokeStyle = strokeStyle;
  context.beginPath();
  context.ellipse(0, 0, radiusX, radiusY, rotation, 0.1, Math.PI * 1.64);
  context.stroke();
  context.restore();
}

function drawEllipse(context, x, y, radiusX, radiusY, rotation) {
  context.beginPath();
  context.ellipse(x, y, radiusX, radiusY, rotation, 0, Math.PI * 2);
  context.stroke();
}

function openModule(moduleId) {
  const module = state.modules.find((item) => item.id === moduleId) || state.modules[0];
  if (!module) return;

  state.activeModuleId = module.id;
  elements.homeView.classList.add("is-exiting");
  elements.moduleView.removeAttribute("aria-hidden");
  elements.moduleView.classList.add("is-active");
  document.body.style.overflow = "hidden";

  updateModuleNav();
  highlightStageNode(module.id);

  if (module.id === "assistant") {
    renderAssistantModule(module);
  } else if (module.id === "guestbook") {
    elements.assistantWorkspace.hidden = true;
    elements.moduleTextContent.hidden = false;
    renderGuestbookModule(module);
  } else {
    elements.assistantWorkspace.hidden = true;
    elements.moduleTextContent.hidden = false;
    renderModuleDetail(module);
  }
}

function closeModule() {
  state.activeModuleId = null;
  elements.homeView.classList.remove("is-exiting");
  elements.moduleView.classList.remove("is-active");
  elements.moduleView.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function updateModuleNav() {
  const activeIndex = state.modules.findIndex((module) => module.id === state.activeModuleId);

  for (const button of elements.moduleNav.querySelectorAll("button")) {
    button.classList.toggle("is-active", button.dataset.openModule === state.activeModuleId);
  }

  elements.moduleProgress.querySelectorAll("span").forEach((item, index) => {
    item.classList.toggle("is-active", index <= activeIndex);
  });
}

function renderModuleDetail(module) {
  elements.moduleTextContent.style.setProperty("--module-accent", module.accent || "#0f766e");
  elements.moduleTextContent.replaceChildren();

  const kicker = document.createElement("span");
  kicker.className = "module-kicker";
  kicker.textContent = module.eyebrow || "Module";

  const title = document.createElement("h2");
  title.className = "module-title";
  title.textContent = module.title || module.id;

  const summary = document.createElement("p");
  summary.className = "module-summary";
  summary.textContent = module.summary || "这里后续可以继续补充内容。";

  elements.moduleTextContent.append(kicker, title, summary);

  if (Array.isArray(module.chips) && module.chips.length > 0) {
    const chips = document.createElement("div");
    chips.className = "chip-row";
    chips.append(...module.chips.map((chip) => {
      const item = document.createElement("span");
      item.textContent = chip;
      return item;
    }));
    elements.moduleTextContent.append(chips);
  }

  renderStructuredContent(module, elements.moduleTextContent);
  renderModuleMedia(module, elements.moduleTextContent);

  if (Array.isArray(module.stats) && module.stats.length > 0) {
    const stats = document.createElement("div");
    stats.className = "stat-grid";
    stats.append(...module.stats.map((stat) => {
      const item = document.createElement("div");
      item.className = "module-stat";

      const value = document.createElement("strong");
      value.textContent = stat.value || "";

      const label = document.createElement("span");
      label.textContent = stat.label || "";

      item.append(value, label);
      return item;
    }));
    elements.moduleTextContent.append(stats);
  }

  const sections = Array.isArray(module.sections) ? module.sections : [];
  if (sections.length > 0) {
    const sectionList = document.createElement("div");
    sectionList.className = "section-list";
    sectionList.append(...sections.map((section) => {
      const item = document.createElement("section");
      item.className = "module-section";

      const heading = document.createElement("h3");
      heading.textContent = section.heading || "";

      const body = document.createElement("p");
      body.textContent = section.body || "";

      item.append(heading, body);
      return item;
    }));
    elements.moduleTextContent.append(sectionList);
  }
}

function renderStructuredContent(module, container) {
  renderFeatureCards(module.cards, container);
  renderProjectCards(module.projects, container);
  renderSkillGroups(module.skillGroups, container);
  renderTimelineItems(module.timeline, container);
  renderHonorList(module.honors, container);
  renderWorkCards(module.works, container);
  renderContactGrid(module.contacts, container);
}

function renderFeatureCards(cards, container) {
  const items = Array.isArray(cards) ? cards : [];
  if (items.length === 0) return;

  const grid = document.createElement("div");
  grid.className = "feature-card-grid";
  grid.append(...items.map((card) => {
    const item = document.createElement("article");
    item.className = "feature-card";

    if (card.label) {
      const label = document.createElement("span");
      label.className = "card-label";
      label.textContent = card.label;
      item.append(label);
    }

    const title = document.createElement("h3");
    title.textContent = card.title || "";

    const description = document.createElement("p");
    description.textContent = card.description || "";

    item.append(title, description);
    appendTagRow(item, card.tags);
    return item;
  }));

  container.append(grid);
}

function renderProjectCards(projects, container) {
  const items = Array.isArray(projects) ? projects : [];
  if (items.length === 0) return;

  const list = document.createElement("div");
  list.className = "project-list";
  list.append(...items.map((project) => {
    const item = document.createElement("article");
    item.className = "project-card";

    const header = document.createElement("div");
    header.className = "project-card-header";

    const titleGroup = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = project.title || "";
    titleGroup.append(title);

    if (project.role) {
      const role = document.createElement("p");
      role.className = "project-role";
      role.textContent = project.role;
      titleGroup.append(role);
    }

    const link = createDetailLink(project);
    header.append(titleGroup, link);

    const description = document.createElement("p");
    description.className = "project-description";
    description.textContent = project.description || "";

    item.append(header, description);

    if (Array.isArray(project.contributions) && project.contributions.length > 0) {
      const contributionList = document.createElement("ul");
      contributionList.className = "contribution-list";
      contributionList.append(...project.contributions.map((contribution) => {
        const point = document.createElement("li");
        point.textContent = contribution;
        return point;
      }));
      item.append(contributionList);
    }

    appendTagRow(item, project.tags);
    return item;
  }));

  container.append(list);
}

function renderSkillGroups(groups, container) {
  const items = Array.isArray(groups) ? groups : [];
  if (items.length === 0) return;

  const grid = document.createElement("div");
  grid.className = "skill-grid";
  grid.append(...items.map((group) => {
    const item = document.createElement("article");
    item.className = "skill-group";

    const title = document.createElement("h3");
    title.textContent = group.title || "";

    const list = document.createElement("ul");
    list.append(...(Array.isArray(group.items) ? group.items : []).map((skill) => {
      const point = document.createElement("li");
      point.textContent = skill;
      return point;
    }));

    item.append(title, list);
    return item;
  }));

  container.append(grid);
}

function renderTimelineItems(timeline, container) {
  const items = Array.isArray(timeline) ? timeline : [];
  if (items.length === 0) return;

  const list = document.createElement("div");
  list.className = "timeline-list";
  list.append(...items.map((entry) => {
    const item = document.createElement("article");
    item.className = "timeline-item";

    const period = document.createElement("span");
    period.className = "timeline-period";
    period.textContent = entry.period || "";

    const title = document.createElement("h3");
    title.textContent = entry.title || "";

    item.append(period, title);

    if (entry.meta) {
      const meta = document.createElement("p");
      meta.className = "timeline-meta";
      meta.textContent = entry.meta;
      item.append(meta);
    }

    const body = document.createElement("p");
    body.className = "timeline-body";
    body.textContent = entry.body || "";
    item.append(body);

    appendTagRow(item, entry.tags);
    return item;
  }));

  container.append(list);
}

function renderHonorList(honors, container) {
  const items = Array.isArray(honors) ? honors : [];
  if (items.length === 0) return;

  const list = document.createElement("div");
  list.className = "honor-list";
  list.append(...items.map((honor, index) => {
    const item = document.createElement("article");
    item.className = "honor-item";

    const number = document.createElement("span");
    number.textContent = String(index + 1).padStart(2, "0");

    const text = document.createElement("p");
    text.textContent = honor;

    item.append(number, text);
    return item;
  }));

  container.append(list);
}

function renderWorkCards(works, container) {
  const items = Array.isArray(works) ? works : [];
  if (items.length === 0) return;

  const grid = document.createElement("div");
  grid.className = "work-grid";
  grid.append(...items.map((work) => {
    const item = document.createElement("article");
    item.className = "work-card";

    const title = document.createElement("h3");
    title.textContent = work.title || "";

    const description = document.createElement("p");
    description.textContent = work.description || "";

    item.append(title, description);
    appendTagRow(item, work.tags);
    item.append(createDetailLink(work));
    return item;
  }));

  container.append(grid);
}

function renderContactGrid(contacts, container) {
  const items = Array.isArray(contacts) ? contacts : [];
  if (items.length === 0) return;

  const grid = document.createElement("div");
  grid.className = "contact-grid";
  grid.append(...items.map((contact) => {
    const item = contact.href ? document.createElement("a") : document.createElement("div");
    item.className = "contact-card";
    if (contact.href) {
      item.href = contact.href;
    }

    const label = document.createElement("span");
    label.textContent = contact.label || "";

    const value = document.createElement("strong");
    value.textContent = contact.value || "";

    item.append(label, value);
    return item;
  }));

  container.append(grid);
}

function appendTagRow(container, tags) {
  const items = Array.isArray(tags) ? tags.filter(Boolean) : [];
  if (items.length === 0) return;

  const row = document.createElement("div");
  row.className = "mini-tag-row";
  row.append(...items.map((tag) => {
    const item = document.createElement("span");
    item.textContent = tag;
    return item;
  }));
  container.append(row);
}

function createDetailLink(item) {
  const label = item.linkLabel || (item.href ? "查看链接" : "Link TODO");
  if (!item.href) {
    const placeholder = document.createElement("span");
    placeholder.className = "detail-link is-disabled";
    placeholder.setAttribute("aria-label", `${label}，链接待补充`);
    placeholder.textContent = label;
    return placeholder;
  }

  const link = document.createElement("a");
  link.className = "detail-link";
  link.href = item.href;
  link.textContent = label;
  link.target = link.href.startsWith("http") ? "_blank" : "";
  link.rel = link.target ? "noreferrer" : "";
  return link;
}

function renderModuleMedia(module, container) {
  const mediaItems = Array.isArray(module.media) ? module.media.filter((item) => item && item.src) : [];
  if (mediaItems.length === 0) return;

  const gallery = document.createElement("div");
  gallery.className = "media-grid";

  gallery.append(...mediaItems.slice(0, 6).map((media) => {
    const item = document.createElement("figure");
    item.className = "media-card";

    const url = normalizeMediaUrl(media.src);
    const type = String(media.type || "").toLowerCase();

    if (type === "video" || /\.(mp4|webm)$/i.test(url)) {
      const video = document.createElement("video");
      video.controls = true;
      video.preload = "metadata";
      video.playsInline = true;
      video.src = url;
      if (media.poster) video.poster = normalizeMediaUrl(media.poster);
      item.append(video);
    } else {
      const image = document.createElement("img");
      image.loading = "lazy";
      image.decoding = "async";
      image.src = url;
      image.alt = media.alt || media.caption || module.title || "module media";
      item.append(image);
    }

    if (media.caption) {
      const caption = document.createElement("figcaption");
      caption.textContent = media.caption;
      item.append(caption);
    }

    return item;
  }));

  container.append(gallery);
}

function normalizeMediaUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    const url = new URL(raw, window.location.origin);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return url.href;
  } catch (error) {
    return "";
  }
}

function renderGuestbookModule(module) {
  elements.moduleTextContent.style.setProperty("--module-accent", module.accent || "#22d3ee");
  elements.moduleTextContent.replaceChildren();

  const kicker = document.createElement("span");
  kicker.className = "module-kicker";
  kicker.textContent = module.eyebrow || "Guestbook";

  const title = document.createElement("h2");
  title.className = "module-title";
  title.textContent = module.title || "留言板";

  const summary = document.createElement("p");
  summary.className = "module-summary";
  summary.textContent = module.summary || "留下你想说的话，我会在后台看到。";

  const shell = document.createElement("div");
  shell.className = "guestbook-shell";

  const form = document.createElement("form");
  form.className = "guestbook-form";

  const nameInput = document.createElement("input");
  nameInput.name = "name";
  nameInput.maxLength = 32;
  nameInput.autocomplete = "name";
  nameInput.placeholder = "你的名字";

  const contentInput = document.createElement("textarea");
  contentInput.name = "content";
  contentInput.rows = 4;
  contentInput.maxLength = 600;
  contentInput.placeholder = "写点什么...";

  const submitButton = document.createElement("button");
  submitButton.type = "submit";
  submitButton.className = "guestbook-submit";
  submitButton.textContent = "发布留言";

  const status = document.createElement("p");
  status.className = "guestbook-status";
  status.setAttribute("role", "status");

  form.append(nameInput, contentInput, submitButton, status);

  const panel = document.createElement("section");
  panel.className = "guestbook-panel";

  const panelHeader = document.createElement("div");
  panelHeader.className = "guestbook-panel-header";

  const panelTitle = document.createElement("h3");
  panelTitle.textContent = "访客留言";

  const admin = document.createElement("details");
  admin.className = "guestbook-admin";

  const summaryAdmin = document.createElement("summary");
  summaryAdmin.textContent = "管理员";

  const adminRow = document.createElement("div");
  adminRow.className = "guestbook-admin-row";

  const passwordInput = document.createElement("input");
  passwordInput.type = "password";
  passwordInput.autocomplete = "current-password";
  passwordInput.placeholder = "删除密码";
  passwordInput.value = state.guestbookAdminPassword;

  const saveAdmin = document.createElement("button");
  saveAdmin.type = "button";
  saveAdmin.textContent = state.guestbookAdminPassword ? "已启用" : "启用删除";

  const clearAdmin = document.createElement("button");
  clearAdmin.type = "button";
  clearAdmin.textContent = "退出";

  adminRow.append(passwordInput, saveAdmin, clearAdmin);
  admin.append(summaryAdmin, adminRow);
  panelHeader.append(panelTitle, admin);

  const list = document.createElement("div");
  list.className = "guestbook-list";

  panel.append(panelHeader, list);
  shell.append(form, panel);
  elements.moduleTextContent.append(kicker, title, summary, shell);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitGuestbookMessage({
      name: nameInput.value,
      content: contentInput.value,
      form,
      contentInput,
      status,
      list
    });
  });

  saveAdmin.addEventListener("click", () => {
    state.guestbookAdminPassword = passwordInput.value.trim();
    if (state.guestbookAdminPassword) {
      localStorage.setItem("guestbook-admin-password", state.guestbookAdminPassword);
      saveAdmin.textContent = "已启用";
      setGuestbookStatus(status, "管理员删除已启用。");
    } else {
      localStorage.removeItem("guestbook-admin-password");
      saveAdmin.textContent = "启用删除";
      setGuestbookStatus(status, "请输入管理员密码。", true);
    }
    renderGuestbookMessages(list, status);
  });

  clearAdmin.addEventListener("click", () => {
    state.guestbookAdminPassword = "";
    passwordInput.value = "";
    localStorage.removeItem("guestbook-admin-password");
    saveAdmin.textContent = "启用删除";
    setGuestbookStatus(status, "已退出管理员删除模式。");
    renderGuestbookMessages(list, status);
  });

  loadGuestbookMessages(list, status);
}

async function loadGuestbookMessages(list, status) {
  list.innerHTML = "<p class=\"guestbook-empty\">正在加载留言...</p>";

  try {
    const data = await requestGuestbookJson("/api/guestbook");

    state.guestbookMode = "server";
    updateGuestbookPersistence(data);
    state.guestbookMessages = Array.isArray(data.messages) ? data.messages : [];
    renderGuestbookMessages(list, status);
    setGuestbookStatus(status, createGuestbookStorageMessage());

    syncLocalMessages(list, status);
  } catch (error) {
    state.guestbookMode = "local";
    state.guestbookMessages = loadLocalGuestbookMessages();
    renderGuestbookMessages(list, status);
    setGuestbookStatus(status, "留言接口还没连上，当前先保存到本机临时留言。", true);
  }
}

async function syncLocalMessages(list, status) {
  const localMessages = loadLocalGuestbookMessages();
  if (localMessages.length === 0) return;

  let synced = 0;
  for (const msg of localMessages) {
    try {
      await requestGuestbookJson("/api/guestbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: msg.name, content: msg.content })
      });
      synced++;
    } catch {
      break;
    }
  }

  if (synced > 0) {
    saveLocalGuestbookMessages(localMessages.slice(synced));
    const data = await requestGuestbookJson("/api/guestbook").catch(() => null);
    if (data && Array.isArray(data.messages)) {
      updateGuestbookPersistence(data);
      state.guestbookMessages = data.messages;
      renderGuestbookMessages(list, status);
      setGuestbookStatus(status, createGuestbookStorageMessage("本机暂存留言已同步。"));
    }
  }
}

function updateGuestbookPersistence(data) {
  state.guestbookBackend = data && data.backend ? data.backend : "server";
  state.guestbookDurable = Boolean(data && data.durable);
}

function createGuestbookStorageMessage(prefix = "") {
  const lead = prefix ? `${prefix} ` : "";
  if (state.guestbookDurable) {
    return `${lead}留言已连接云端存储，重新部署后也会保留。`;
  }
  if (state.guestbookBackend === "file") {
    return `${lead}当前保存到服务器文件，公网重新部署可能会清空；配置 Redis 后可长期保留。`;
  }
  if (state.guestbookBackend === "memory") {
    return `${lead}当前为运行内临时保存，服务重启后可能清空。`;
  }
  return `${lead}留言已连接服务器。`;
}

async function submitGuestbookMessage({ name, content, form, contentInput, status, list }) {
  const submitButton = form.querySelector("button[type='submit']");
  const cleanContent = cleanGuestbookText(content, "");

  if (cleanContent.length < 2) {
    setGuestbookStatus(status, cleanContent ? "留言太短了。" : "留言内容不能为空。", true);
    return;
  }

  submitButton.disabled = true;
  setGuestbookStatus(status, "正在发布...");

  try {
    const data = await requestGuestbookJson("/api/guestbook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, content: cleanContent })
    });

    state.guestbookMode = "server";
    updateGuestbookPersistence(data);
    state.guestbookMessages = [data.message, ...state.guestbookMessages].slice(0, 80);
    contentInput.value = "";
    setGuestbookStatus(status, data.persisted === false ? "留言已发布，本次运行中可见；尚未连接持久存储。" : createGuestbookStorageMessage("留言已发布。"));
    renderGuestbookMessages(list, status);
  } catch (error) {
    const localMessage = createLocalGuestbookMessage(name, cleanContent);
    state.guestbookMode = "local";
    state.guestbookMessages = [localMessage, ...loadLocalGuestbookMessages()].slice(0, 80);
    saveLocalGuestbookMessages(state.guestbookMessages);
    contentInput.value = "";
    setGuestbookStatus(status, "留言接口还没连上，已先保存到本机并显示。", true);
    renderGuestbookMessages(list, status);
  } finally {
    submitButton.disabled = false;
  }
}

function renderGuestbookMessages(list, status) {
  list.replaceChildren();

  if (state.guestbookMessages.length === 0) {
    const empty = document.createElement("p");
    empty.className = "guestbook-empty";
    empty.textContent = "还没有留言。";
    list.append(empty);
    return;
  }

  const visibleMessages = state.guestbookMessages.slice(0, 24);

  list.append(...visibleMessages.map((message, index) => {
    const flow = getGuestbookFlow(index);
    const item = document.createElement("article");
    item.className = `guestbook-message${index === 0 ? " is-latest" : ""}${message.isLocal ? " is-local" : ""}`;
    item.style.setProperty("--flow-x", `${flow.x}%`);
    item.style.setProperty("--flow-y", `${flow.y}%`);
    item.style.setProperty("--flow-drift-x", `${flow.driftX}px`);
    item.style.setProperty("--flow-drift-y", `${flow.driftY}px`);
    item.style.setProperty("--flow-duration", `${flow.duration}s`);
    item.style.setProperty("--flow-delay", `${flow.delay}s`);

    const header = document.createElement("div");
    header.className = "guestbook-message-header";

    const author = document.createElement("strong");
    author.textContent = message.name || "匿名访客";

    const time = document.createElement("time");
    time.dateTime = message.createdAt || "";
    time.textContent = formatGuestbookDate(message.createdAt);

    header.append(author, time);

    if (state.guestbookAdminPassword) {
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "guestbook-delete";
      deleteButton.textContent = "删除";
      deleteButton.addEventListener("click", () => {
        deleteGuestbookMessage(message.id, list, status);
      });
      header.append(deleteButton);
    }

    const body = document.createElement("p");
    body.textContent = message.content || "";

    item.append(header, body);
    return item;
  }));

  if (state.guestbookMessages.length > visibleMessages.length) {
    const hint = document.createElement("p");
    hint.className = "guestbook-flow-hint";
    hint.textContent = `已显示最新 ${visibleMessages.length} 条留言。`;
    list.append(hint);
  }
}

function getGuestbookFlow(index) {
  const columns = [4, 28, 46, 10, 34, 52, 16, 42, 22, 6, 38, 48];
  const rows = [7, 18, 10, 34, 46, 28, 58, 62, 48, 24, 6, 38];
  const x = columns[index % columns.length];
  const y = rows[index % rows.length];
  const direction = index % 2 === 0 ? 1 : -1;

  return {
    x,
    y,
    driftX: direction * (118 + (index % 4) * 26),
    driftY: (index % 3 === 0 ? 1 : -1) * (42 + (index % 5) * 10),
    duration: 6.8 + (index % 6) * 0.9,
    delay: index === 0 ? 0 : -((index * 0.85) % 4.6)
  };
}

async function deleteGuestbookMessage(id, list, status) {
  if (!id || !state.guestbookAdminPassword) return;
  setGuestbookStatus(status, "正在删除...");

  const message = state.guestbookMessages.find((item) => item.id === id);
  if (message && message.isLocal) {
    state.guestbookMessages = state.guestbookMessages.filter((item) => item.id !== id);
    saveLocalGuestbookMessages(state.guestbookMessages);
    setGuestbookStatus(status, "本机临时留言已删除。");
    renderGuestbookMessages(list, status);
    return;
  }

  try {
    const data = await requestGuestbookJson(`/api/guestbook/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: state.guestbookAdminPassword })
    });

    updateGuestbookPersistence(data);
    state.guestbookMessages = state.guestbookMessages.filter((message) => message.id !== id);
    setGuestbookStatus(status, createGuestbookStorageMessage("留言已删除。"));
    renderGuestbookMessages(list, status);
  } catch (error) {
    setGuestbookStatus(status, error.message, true);
  }
}

async function requestGuestbookJson(url, options) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 4500);

  try {
    const response = await fetch(url, {
      ...(options || {}),
      signal: controller.signal
    });
    const contentType = response.headers.get("Content-Type") || "";

    if (!contentType.includes("application/json")) {
      throw new Error("留言接口未启动");
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "留言请求失败");
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("留言接口响应超时");
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

function createLocalGuestbookMessage(name, content) {
  return {
    id: `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: cleanGuestbookText(name, "匿名访客").slice(0, 32) || "匿名访客",
    content: cleanGuestbookText(content, "").slice(0, 600),
    createdAt: new Date().toISOString(),
    isLocal: true
  };
}

function loadLocalGuestbookMessages() {
  try {
    const data = JSON.parse(localStorage.getItem("guestbook-local-messages") || "[]");
    return Array.isArray(data) ? data.filter((message) => message && message.id && message.content) : [];
  } catch (error) {
    return [];
  }
}

function saveLocalGuestbookMessages(messages) {
  localStorage.setItem("guestbook-local-messages", JSON.stringify(messages.slice(0, 80)));
}

function cleanGuestbookText(value, fallback) {
  const text = String(value || fallback || "").replace(/\s+/g, " ").trim();
  return text;
}

function setGuestbookStatus(status, message, isError = false) {
  status.textContent = message;
  status.classList.toggle("is-error", isError);
}

function formatGuestbookDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function renderAssistantModule(module) {
  elements.moduleTextContent.hidden = true;
  elements.assistantWorkspace.hidden = false;
  elements.assistantWorkspace.style.setProperty("--module-accent", module.accent || "#0f766e");

  if (!state.assistantReady) {
    appendMessage("assistant", state.profile.greeting || "你好，我是这个网站里的 AI 分身。你可以直接问我。", "AI 分身");
    state.assistantReady = true;
  }

  requestAnimationFrame(() => {
    elements.input.focus();
    elements.messages.scrollTop = elements.messages.scrollHeight;
  });
}

async function sendCurrentMessage() {
  const message = elements.input.value.trim();
  if (!message || state.busy) return;

  state.busy = true;
  elements.sendButton.disabled = true;
  elements.input.value = "";
  elements.input.style.height = "auto";

  appendMessage("user", message, "你");
  const loading = appendTyping();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        history: state.messages.slice(-8)
      })
    });

    const data = await response.json();
    loading.remove();

    if (!response.ok) {
      throw new Error(data.error || "请求失败");
    }

    appendMessage(
      "assistant",
      data.answer || "这个问题我暂时没有足够资料回答。",
      data.source === "openai" ? "AI 分身" : "本地风格模式"
    );
  } catch (error) {
    loading.remove();
    appendMessage("assistant", `我这里连接不太顺。你可以稍后再试，或者先检查 server.js 和 .env。\n\n${error.message}`, "系统");
  } finally {
    state.busy = false;
    elements.sendButton.disabled = false;
    elements.input.focus();
  }
}

function appendMessage(role, content, label) {
  const item = document.createElement("article");
  item.className = `message ${role}`;

  const meta = document.createElement("div");
  meta.className = "message-meta";
  meta.textContent = label || (role === "user" ? "你" : "AI 分身");

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = content;

  item.append(meta, bubble);
  elements.messages.append(item);
  elements.messages.scrollTop = elements.messages.scrollHeight;

  state.messages.push({ role, content });
  return item;
}

function appendTyping() {
  const item = document.createElement("article");
  item.className = "message assistant";

  const meta = document.createElement("div");
  meta.className = "message-meta";
  meta.textContent = "AI 分身";

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  const typing = document.createElement("span");
  typing.className = "typing";
  typing.setAttribute("aria-label", "正在生成");
  typing.append(document.createElement("span"), document.createElement("span"), document.createElement("span"));

  bubble.append(typing);
  item.append(meta, bubble);
  elements.messages.append(item);
  elements.messages.scrollTop = elements.messages.scrollHeight;
  return item;
}

function setupCanvas() {
  const canvas = elements.canvas;
  const context = canvas.getContext("2d");
  let width = 0;
  let height = 0;
  let particles = [];
  let frame = 0;
  let lastDrawAt = 0;

  const resize = () => {
    const compact = isMobileView();
    const ratio = Math.min(window.devicePixelRatio || 1, compact ? 1 : 1.5);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    const count = compact
      ? Math.min(90, Math.max(42, Math.floor((width * height) / 18000)))
      : Math.min(220, Math.max(100, Math.floor((width * height) / 9500)));
    particles = Array.from({ length: count }, (_, index) => createParticle(index, width, height));
  };

  const draw = (timestamp = performance.now()) => {
    const compact = isMobileView();
    const moduleActive = elements.moduleView.classList.contains("is-active");
    const scrolling = timestamp < state.scrollingUntil;
    const minFrameGap = compact
      ? scrolling ? 140 : moduleActive ? 95 : 54
      : scrolling ? 86 : moduleActive ? 45 : 25;

    if (!state.reduceMotion) {
      if (lastDrawAt && timestamp - lastDrawAt < minFrameGap) {
        requestAnimationFrame(draw);
        return;
      }
      lastDrawAt = timestamp;
    }

    frame += 1;
    context.clearRect(0, 0, width, height);

    for (const particle of particles) {
      const targetX = state.pointer.x * width;
      const targetY = state.pointer.y * height;
      const pull = state.pointer.active ? 0.0012 : 0.00022;
      const particlePull = pull * (particle.edge ? 0.42 : 1);

      particle.vx += (targetX - particle.x) * particlePull * particle.weight;
      particle.vy += (targetY - particle.y) * particlePull * particle.weight;
      particle.vx += (particle.homeX - particle.x) * (particle.edge ? 0.00045 : 0.00012);
      particle.vy += (particle.homeY - particle.y) * (particle.edge ? 0.00045 : 0.00012);
      particle.vx *= 0.94;
      particle.vy *= 0.94;
      particle.x += particle.vx + Math.sin(frame * particle.floatSpeed + particle.seed) * particle.floatAmp;
      particle.y += particle.vy + Math.cos(frame * particle.floatSpeed * 0.86 + particle.seed) * particle.floatAmp;

      if (particle.x < -30) particle.x = width + 30;
      if (particle.x > width + 30) particle.x = -30;
      if (particle.y < -30) particle.y = height + 30;
      if (particle.y > height + 30) particle.y = -30;
    }

    if (!scrolling && (!compact || frame % 2 === 0)) {
      drawConnections(context, particles, width);
    }
    drawParticles(context, particles, frame);

    if (!state.reduceMotion) {
      requestAnimationFrame(draw);
    }
  };

  resize();
  draw(performance.now());
  window.addEventListener("resize", resize, { passive: true });
}

function setupCloudCanvas() {
  const canvas = elements.cloudCanvas;
  if (!canvas) return;
  const context = canvas.getContext("2d");
  let width = 0;
  let height = 0;
  let points = [];
  let frame = 0;
  let lastDrawAt = 0;

  const resize = () => {
    const compact = isMobileView();
    const ratio = Math.min(window.devicePixelRatio || 1, compact ? 1 : 1.4);
    width = Math.max(1, window.innerWidth);
    height = Math.max(1, window.innerHeight);
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    const count = compact
      ? Math.min(55, Math.max(24, Math.floor((width * height) / 42000)))
      : Math.min(120, Math.max(55, Math.floor((width * height) / 18000)));
    points = Array.from({ length: count }, (_, index) => {
      const row = index % 4;
      return {
        x: ((index * 37) % 100) / 100,
        y: 0.08 + row * 0.11 + (((index * 17) % 100) / 100) * 0.06,
        drift: 0.35 + (index % 9) * 0.05,
        size: 0.7 + (index % 3) * 0.22,
        alpha: 0.03 + (index % 5) * 0.01
      };
    });
  };

  const draw = (timestamp = performance.now()) => {
    if (state.reduceMotion) return;
    const compact = isMobileView();
    const minFrameGap = compact ? 92 : 46;
    if (lastDrawAt && timestamp - lastDrawAt < minFrameGap) {
      requestAnimationFrame(draw);
      return;
    }
    lastDrawAt = timestamp;
    frame += 1;
    context.clearRect(0, 0, width, height);

    const time = frame * 0.006;

    for (let i = 0; i < 5; i += 1) {
      const y = height * (0.18 + i * 0.105) + Math.sin(time * 1.8 + i) * 7;
      context.lineWidth = 1;
      context.strokeStyle = "rgba(160, 172, 184, 0.07)";
      context.beginPath();
      for (let x = -40; x <= width + 40; x += 34) {
        const wave = Math.sin(x * 0.012 + time * (1.4 + i * 0.12) + i) * (6 + i * 1.8);
        if (x === -40) context.moveTo(x, y + wave);
        else context.lineTo(x, y + wave);
      }
      context.stroke();
    }

    for (const point of points) {
      const x = ((point.x * width + Math.sin(time * point.drift + point.y * 9) * 18) + width) % width;
      const y = point.y * height + Math.cos(time * point.drift + point.x * 12) * 7;
      context.fillStyle = `rgba(180, 192, 204, ${point.alpha})`;
      context.beginPath();
      context.arc(x, y, point.size, 0, Math.PI * 2);
      context.fill();
    }

    requestAnimationFrame(draw);
  };

  resize();
  draw();
  window.addEventListener("resize", resize, { passive: true });
}

function createParticle(index, width, height) {
  const edge = index % 5 !== 0;
  const progress = ((index * 37) % 100) / 100;
  const secondary = ((index * 19) % 100) / 100;
  let x;
  let y;

  if (edge) {
    const side = index % 4;
    const edgeX = Math.min(width * 0.16, 190);
    const edgeY = Math.min(height * 0.18, 170);

    if (side === 0) {
      x = width * (0.06 + progress * 0.88);
      y = edgeY * (0.16 + secondary * 0.74);
    } else if (side === 1) {
      x = width - edgeX * (0.16 + secondary * 0.74);
      y = height * (0.06 + progress * 0.88);
    } else if (side === 2) {
      x = width * (0.06 + progress * 0.88);
      y = height - edgeY * (0.16 + secondary * 0.74);
    } else {
      x = edgeX * (0.16 + secondary * 0.74);
      y = height * (0.06 + progress * 0.88);
    }
  } else {
    const angle = (index * 137.5 * Math.PI) / 180;
    const radius = Math.sqrt((index % 89) / 89);
    x = width * (0.5 + Math.cos(angle) * radius * 0.42);
    y = height * (0.5 + Math.sin(angle) * radius * 0.42);
  }

  const angle = (index * 137.5 * Math.PI) / 180;
  return {
    x,
    y,
    homeX: x,
    homeY: y,
    edge,
    vx: (((index * 17) % 9) - 4) * (edge ? 0.052 : 0.07),
    vy: (((index * 23) % 11) - 5) * (edge ? 0.052 : 0.07),
    weight: edge ? 0.16 + (index % 7) / 24 : 0.22 + (index % 7) / 18,
    size: edge ? 1.45 + (index % 4) * 0.34 : 1 + (index % 4) * 0.3,
    alpha: edge ? 0.34 + (index % 5) * 0.035 : 0.18 + (index % 4) * 0.025,
    tone: index % 3,
    floatAmp: edge ? 0.16 + (index % 5) * 0.035 : 0.08 + (index % 4) * 0.02,
    floatSpeed: edge ? 0.008 + (index % 6) * 0.0011 : 0.006 + (index % 5) * 0.0008,
    seed: angle + index * 0.37
  };
}

function getModuleAccent(module, index = 0) {
  if (module && module.id === "assistant") return "#93c5fd";
  return VISUAL_ACCENTS[index % VISUAL_ACCENTS.length];
}

function drawConnections(context, particles, width) {
  const limit = width < 720 ? 86 : 116;
  const cells = new Map();
  const cellSize = limit;

  for (let i = 0; i < particles.length; i += 1) {
    const particle = particles[i];
    const cellX = Math.floor(particle.x / cellSize);
    const cellY = Math.floor(particle.y / cellSize);
    const key = `${cellX}:${cellY}`;
    const cell = cells.get(key);
    if (cell) cell.push(i);
    else cells.set(key, [i]);
  }

  for (let i = 0; i < particles.length; i += 1) {
    const a = particles[i];
    const cellX = Math.floor(a.x / cellSize);
    const cellY = Math.floor(a.y / cellSize);

    for (let x = cellX - 1; x <= cellX + 1; x += 1) {
      for (let y = cellY - 1; y <= cellY + 1; y += 1) {
        const cell = cells.get(`${x}:${y}`);
        if (!cell) continue;

        for (const j of cell) {
          if (j <= i) continue;

          const b = particles[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < limit) {
        const edgeBoost = a.edge || b.edge ? 1.12 : 0.72;
        const alpha = (1 - distance / limit) * 0.2 * edgeBoost;
        context.strokeStyle = `rgba(214, 236, 255, ${alpha * 0.92})`;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.stroke();
      }
        }
      }
    }
  }
}

function drawParticles(context, particles, frame) {
  for (const particle of particles) {
    const pulse = Math.sin(frame * 0.02 + particle.seed) * 0.5 + 0.5;
    const alpha = particle.alpha + pulse * (particle.edge ? 0.18 : 0.09);
    const radius = particle.size + pulse * (particle.edge ? 0.55 : 0.32);
    const color = particle.tone === 0
      ? [206, 236, 255]
      : particle.tone === 1
        ? [170, 205, 255]
        : [238, 244, 255];

    if (particle.edge) {
      context.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha * 0.2})`;
      context.beginPath();
      context.arc(particle.x, particle.y, radius * 2.8, 0, Math.PI * 2);
      context.fill();
    }

    context.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
    context.beginPath();
    context.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
    context.fill();
  }
}

function normalizeModules(profile) {
  const modules = Array.isArray(profile.modules) && profile.modules.length > 0
    ? [...profile.modules]
    : createDefaultModules(profile);

  const guestbookEnabled = !profile.guestbook || profile.guestbook.enabled !== false;
  const hasGuestbook = modules.some((module) => module.id === "guestbook");
  const guestbookModules = guestbookEnabled && !hasGuestbook
    ? insertBeforeAssistant(modules, createGuestbookModule())
    : modules;
  const hasAssistant = guestbookModules.some((module) => module.id === "assistant");
  return hasAssistant ? guestbookModules : [...guestbookModules, createAssistantModule()];
}

function insertBeforeAssistant(modules, module) {
  const assistantIndex = modules.findIndex((item) => item.id === "assistant");
  if (assistantIndex === -1) return [...modules, module];
  return [
    ...modules.slice(0, assistantIndex),
    module,
    ...modules.slice(assistantIndex)
  ];
}

function createGuestbookModule() {
  return {
    id: "guestbook",
    eyebrow: "Guestbook",
    title: "留言板",
    summary: "访客可以在这里留下想法、建议或合作意向。管理员输入密码后可以删除留言。",
    accent: "#22d3ee",
    chips: ["访客留言", "公开互动", "管理员删除"],
    sections: []
  };
}

function createDefaultModules(profile) {
  return [
    {
      id: "about",
      eyebrow: "About",
      title: "关于我",
      summary: profile.summary || "这里放你的个人介绍、当前状态和长期方向。",
      accent: "#0f766e",
      chips: ["个人介绍", "方向", "价值观"],
      sections: [
        { heading: "简介", body: "后续可以在 profile.config.json 里把这段换成你的真实经历。" },
        { heading: "我在意什么", body: "把复杂事情讲清楚、做漂亮、真正推进下去。" }
      ]
    },
    createAssistantModule()
  ];
}

function createAssistantModule() {
  return {
    id: "assistant",
    eyebrow: "Ask",
    title: "AI 分身",
    summary: "直接问我问题，回答会尽量贴近我的资料和表达风格。",
    accent: "#7867d8",
    chips: ["问答", "个人风格", "访客互动"],
    sections: []
  };
}

function createFallbackProfile() {
  return {
    name: "你的名字",
    role: "创作者",
    location: "中国",
    availability: "开放交流",
    headline: "把复杂想法做成清晰、漂亮、可用的产品。",
    summary: "这里放你的个人简介。",
    greeting: "你好，直接问我就好。",
    facts: [],
    links: [],
    quickQuestions: ["你是谁？", "你擅长什么？", "怎么联系你？"],
    modules: createDefaultModules({})
  };
}
