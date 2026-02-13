const RESOURCE_TYPES = ["main_frame", "sub_frame"];

/** In-memory Set for O(1) lookups — rebuilt when service worker restarts */
let blockedSet = null;

async function getBlockedSet() {
  if (!blockedSet) {
    const { blockedDomains } = await chrome.storage.local.get({
      blockedDomains: [],
    });
    blockedSet = new Set(blockedDomains);
  }
  return blockedSet;
}

/** Persist the current set to storage and re-apply rules. Returns the domain array. */
async function syncAndApply() {
  const set = await getBlockedSet();
  const domains = [...set];
  await chrome.storage.local.set({ blockedDomains: domains });
  await applyRules(domains);
  return domains;
}

// Handle messages from the popup
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    const set = await getBlockedSet();

    switch (msg.type) {
      case "getDomains":
        return { domains: [...set] };

      case "addDomains":
        for (const d of msg.domains) set.add(d);
        return { domains: await syncAndApply() };

      case "removeDomain":
        set.delete(msg.domain);
        return { domains: await syncAndApply() };

      case "toggleDomain": {
        if (set.has(msg.domain)) set.delete(msg.domain);
        else set.add(msg.domain);
        return { domains: await syncAndApply() };
      }

      default:
        return {};
    }
  })().then(sendResponse);

  return true; // keep the message channel open for async response
});

/**
 * Applies declarativeNetRequest rules from the given domain list.
 * Uses a single atomic updateDynamicRules call (remove old + add new)
 * and requestDomains for Chrome-optimized domain matching.
 */
async function applyRules(domains) {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.map((r) => r.id);

  const addRules = domains.map((domain, i) => ({
    id: i + 1,
    priority: 1,
    action: { type: "block" },
    condition: {
      requestDomains: [domain],
      resourceTypes: RESOURCE_TYPES,
    },
  }));

  // Single atomic call — no gap where rules are missing
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules,
  });
}

// Initialize on browser start AND extension install/update
async function init() {
  const set = await getBlockedSet();
  await applyRules([...set]);

  // Show blocked-request count as badge text (zero cost, handled by Chrome)
  chrome.declarativeNetRequest.setExtensionActionOptions({
    displayActionCountAsBadgeText: true,
  });
}

chrome.runtime.onStartup.addListener(init);
chrome.runtime.onInstalled.addListener(init);
