const domainList = document.getElementById("domain-list");
const domainInput = document.getElementById("domain-input");
const addBtn = document.getElementById("add-btn");
const blockCurrentBtn = document.getElementById("block-current-btn");
const countBadge = document.getElementById("count");

let currentDomain = null;

// --- Helpers ---

function sendMessage(msg) {
  return chrome.runtime.sendMessage(msg);
}

function renderList(domains) {
  countBadge.textContent = domains.length;

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

// --- Actions ---

async function loadDomains() {
  const { domains } = await sendMessage({ type: "getDomains" });
  renderList(domains);
  updateCurrentBtn(domains);
}

async function addDomains() {
  const raw = domainInput.value.trim();
  if (!raw) return;

  const newDomains = parseDomains(raw);
  if (newDomains.length === 0) return;

  const { domains } = await sendMessage({ type: "addDomains", domains: newDomains });
  domainInput.value = "";
  renderList(domains);
  updateCurrentBtn(domains);
}

async function removeDomain(domain) {
  const { domains } = await sendMessage({ type: "removeDomain", domain });
  renderList(domains);
  updateCurrentBtn(domains);
}

async function toggleCurrent() {
  if (!currentDomain) return;

  const { domains } = await sendMessage({ type: "toggleDomain", domain: currentDomain });
  renderList(domains);
  updateCurrentBtn(domains);
}

// --- Import / Export ---

const importBtn = document.getElementById("import-btn");
const exportBtn = document.getElementById("export-btn");
const importFile = document.getElementById("import-file");

function exportList() {
  sendMessage({ type: "getDomains" }).then(({ domains }) => {
    const text = domains.sort().join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "blocked-domains.txt";
    a.click();
    URL.revokeObjectURL(url);
  });
}

function importList() {
  importFile.click();
}

importFile.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const text = await file.text();
  const newDomains = parseDomains(text);
  if (newDomains.length === 0) return;

  const { domains } = await sendMessage({ type: "addDomains", domains: newDomains });
  renderList(domains);
  updateCurrentBtn(domains);
  importFile.value = "";
});

// --- Init ---

importBtn.addEventListener("click", importList);
exportBtn.addEventListener("click", exportList);
addBtn.addEventListener("click", addDomains);
domainInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addDomains();
});
blockCurrentBtn.addEventListener("click", toggleCurrent);

// Get current tab domain, then load everything
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  try {
    if (tabs[0]?.url) {
      currentDomain = new URL(tabs[0].url).hostname;
    }
  } catch {}
  loadDomains();
});
