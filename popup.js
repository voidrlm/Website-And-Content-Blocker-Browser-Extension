const domainList = document.getElementById("domain-list");
const domainInput = document.getElementById("domain-input");
const addBtn = document.getElementById("add-btn");
const blockCurrentBtn = document.getElementById("block-current-btn");
const countBadge = document.getElementById("count");

const keywordList = document.getElementById("keyword-list");
const keywordInput = document.getElementById("keyword-input");
const addKeywordBtn = document.getElementById("add-keyword-btn");

const lockScreen = document.getElementById("lock-screen");
const protectedContent = document.getElementById("protected-content");
const lockBtn = document.getElementById("lock-btn");
const passwordInput = document.getElementById("password-input");
const passwordBtn = document.getElementById("password-btn");
const lockPrompt = document.getElementById("lock-prompt");
const lockError = document.getElementById("lock-error");

const safeSearchToggle = document.getElementById("safe-search-toggle");

let currentDomain = null;
let cachedDomains = [];
let cachedKeywords = [];
let isSetup = false; // true = no password set yet, need to create one

// --- Password hashing ---

async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// --- Lock / Unlock ---

async function initLock() {
  const { hasPassword } = await sendMessage({ type: "hasPassword" });
  if (!hasPassword) {
    isSetup = true;
    lockPrompt.textContent = "Set a password to protect your lists";
    passwordBtn.textContent = "Set password";
    passwordInput.placeholder = "Create password";
  } else {
    isSetup = false;
    lockPrompt.textContent = "Enter password to unlock";
    passwordBtn.textContent = "Unlock";
    passwordInput.placeholder = "Password";
  }
  lockScreen.classList.remove("hidden");
  protectedContent.classList.add("hidden");
  lockBtn.style.display = "none";
  passwordInput.focus();
}

async function handlePassword() {
  const pw = passwordInput.value;
  if (!pw) return;

  lockError.textContent = "";
  const hash = await hashPassword(pw);

  if (isSetup) {
    await sendMessage({ type: "setPassword", hash });
    unlock();
  } else {
    const { match } = await sendMessage({ type: "checkPassword", hash });
    if (match) {
      unlock();
    } else {
      lockError.textContent = "Wrong password";
      passwordInput.value = "";
      passwordInput.focus();
    }
  }
}

function unlock() {
  passwordInput.value = "";
  lockError.textContent = "";
  lockScreen.classList.add("hidden");
  protectedContent.classList.remove("hidden");
  lockBtn.style.display = "block";
  loadDomains();
  loadKeywords();
  loadSafeSearch();
}

function lock() {
  protectedContent.classList.add("hidden");
  lockBtn.style.display = "none";
  isSetup = false;
  lockPrompt.textContent = "Enter password to unlock";
  passwordBtn.textContent = "Unlock";
  passwordInput.placeholder = "Password";
  lockScreen.classList.remove("hidden");
  passwordInput.focus();
}

// --- Helpers ---

function sendMessage(msg) {
  return chrome.runtime.sendMessage(msg);
}

function updateCount() {
  countBadge.textContent = cachedDomains.length + cachedKeywords.length;
}

function renderDomainList(domains) {
  cachedDomains = domains;
  updateCount();

  if (domains.length === 0) {
    domainList.innerHTML = '<div class="empty-msg">No blocked domains yet</div>';
    return;
  }

  domainList.innerHTML = "";
  const sorted = [...domains].sort();
  for (const domain of sorted) {
    const item = document.createElement("div");
    item.className = "domain-item";

    const span = document.createElement("span");
    span.textContent = domain;

    const btn = document.createElement("button");
    btn.className = "remove-btn";
    btn.textContent = "\u00d7";
    btn.title = "Unblock " + domain;
    btn.addEventListener("click", () => removeDomain(domain));

    item.append(span, btn);
    domainList.appendChild(item);
  }
}

function renderKeywordList(keywords) {
  cachedKeywords = keywords;
  updateCount();

  if (keywords.length === 0) {
    keywordList.innerHTML = '<div class="empty-msg">No blocked keywords yet</div>';
    return;
  }

  keywordList.innerHTML = "";
  const sorted = [...keywords].sort();
  for (const keyword of sorted) {
    const item = document.createElement("div");
    item.className = "keyword-item";

    const span = document.createElement("span");
    span.textContent = keyword;

    const btn = document.createElement("button");
    btn.className = "remove-btn";
    btn.textContent = "\u00d7";
    btn.title = "Remove keyword: " + keyword;
    btn.addEventListener("click", () => removeKeyword(keyword));

    item.append(span, btn);
    keywordList.appendChild(item);
  }
}

function updateCurrentBtn(domains) {
  if (!currentDomain) {
    blockCurrentBtn.disabled = true;
    blockCurrentBtn.textContent = "Cannot block this page";
    return;
  }

  const isBlocked = domains.includes(currentDomain);
  blockCurrentBtn.classList.toggle("blocked", isBlocked);
  blockCurrentBtn.textContent = isBlocked
    ? "Unblock " + currentDomain
    : "Block " + currentDomain;
}

function parseDomains(input) {
  return input
    .split(/[,\n]+/)
    .map((d) => d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, ""))
    .filter(Boolean);
}

function parseKeywords(input) {
  return input
    .split(/[,\n]+/)
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);
}

// --- Actions ---

async function loadDomains() {
  const { domains } = await sendMessage({ type: "getDomains" });
  renderDomainList(domains);
  updateCurrentBtn(domains);
}

async function loadKeywords() {
  const { keywords } = await sendMessage({ type: "getKeywords" });
  renderKeywordList(keywords);
}

async function loadSafeSearch() {
  const { enabled } = await sendMessage({ type: "getSafeSearch" });
  safeSearchToggle.checked = enabled;
}

async function addDomains() {
  const raw = domainInput.value.trim();
  if (!raw) return;

  const newDomains = parseDomains(raw);
  if (newDomains.length === 0) return;

  const { domains, keywords } = await sendMessage({ type: "addDomains", domains: newDomains });
  domainInput.value = "";
  renderDomainList(domains);
  if (keywords) renderKeywordList(keywords);
  updateCurrentBtn(domains);
}

async function removeDomain(domain) {
  const { domains, keywords } = await sendMessage({ type: "removeDomain", domain });
  renderDomainList(domains);
  if (keywords) renderKeywordList(keywords);
  updateCurrentBtn(domains);
}

async function addKeywords() {
  const raw = keywordInput.value.trim();
  if (!raw) return;

  const newKeywords = parseKeywords(raw);
  if (newKeywords.length === 0) return;

  const { domains, keywords } = await sendMessage({ type: "addKeywords", keywords: newKeywords });
  keywordInput.value = "";
  if (domains) renderDomainList(domains);
  renderKeywordList(keywords);
  if (domains) updateCurrentBtn(domains);
}

async function removeKeyword(keyword) {
  const { domains, keywords } = await sendMessage({ type: "removeKeyword", keyword });
  if (domains) renderDomainList(domains);
  renderKeywordList(keywords);
  if (domains) updateCurrentBtn(domains);
}

async function toggleCurrent() {
  if (!currentDomain) return;

  const { domains, keywords } = await sendMessage({ type: "toggleDomain", domain: currentDomain });
  renderDomainList(domains);
  if (keywords) renderKeywordList(keywords);
  updateCurrentBtn(domains);
}

// --- Import / Export ---

const importBtn = document.getElementById("import-btn");
const exportBtn = document.getElementById("export-btn");
const clearBtn = document.getElementById("clear-btn");
const importFile = document.getElementById("import-file");

function exportList() {
  Promise.all([
    sendMessage({ type: "getDomains" }),
    sendMessage({ type: "getKeywords" }),
  ]).then(([domainRes, keywordRes]) => {
    const data = {
      domains: (domainRes.domains || []).sort(),
      keywords: (keywordRes.keywords || []).sort(),
    };
    const text = JSON.stringify(data, null, 2);
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "blocked-list.json";
    a.click();
    URL.revokeObjectURL(url);
  });
}

function importList() {
  importFile.click();
}

async function clearAll() {
  if (!confirm("Remove all blocked domains and keywords?")) return;
  const { domains, keywords } = await sendMessage({ type: "clearAll" });
  renderDomainList(domains);
  renderKeywordList(keywords);
  updateCurrentBtn(domains);
}

importFile.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const text = await file.text();

  // Try JSON format first (new format with domains + keywords)
  try {
    const data = JSON.parse(text);
    if (data.domains && Array.isArray(data.domains) && data.domains.length > 0) {
      const { domains } = await sendMessage({ type: "addDomains", domains: data.domains });
      renderDomainList(domains);
      updateCurrentBtn(domains);
    }
    if (data.keywords && Array.isArray(data.keywords) && data.keywords.length > 0) {
      const { keywords } = await sendMessage({ type: "addKeywords", keywords: data.keywords });
      renderKeywordList(keywords);
    }
    importFile.value = "";
    return;
  } catch {}

  // Fallback: plain text list of domains (old format)
  const newDomains = parseDomains(text);
  if (newDomains.length > 0) {
    const { domains } = await sendMessage({ type: "addDomains", domains: newDomains });
    renderDomainList(domains);
    updateCurrentBtn(domains);
  }
  importFile.value = "";
});

// --- Init ---

importBtn.addEventListener("click", importList);
exportBtn.addEventListener("click", exportList);
clearBtn.addEventListener("click", clearAll);
addBtn.addEventListener("click", addDomains);
domainInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addDomains();
});
addKeywordBtn.addEventListener("click", addKeywords);
keywordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addKeywords();
});
blockCurrentBtn.addEventListener("click", toggleCurrent);
safeSearchToggle.addEventListener("change", () => {
  sendMessage({ type: "setSafeSearch", enabled: safeSearchToggle.checked });
});
lockBtn.addEventListener("click", lock);
passwordBtn.addEventListener("click", handlePassword);
passwordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handlePassword();
});

// Get current tab domain, then show lock screen
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  try {
    if (tabs[0]?.url) {
      currentDomain = new URL(tabs[0].url).hostname;
    }
  } catch {}
  initLock();
});
