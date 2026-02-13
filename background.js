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

// Toggle block/unblock on icon click
chrome.action.onClicked.addListener(async (tab) => {
  try {
    const domain = new URL(tab.url).hostname;
    const set = await getBlockedSet();
    const nowBlocked = !set.has(domain);

    if (nowBlocked) {
      set.add(domain);
    } else {
      set.delete(domain);
    }

    const domains = [...set];
    await chrome.storage.local.set({ blockedDomains: domains });
    await applyRules(domains);

    // Only force-reload when blocking — don't disrupt user when unblocking
    if (nowBlocked && tab.id) {
      chrome.tabs.reload(tab.id);
    }
  } catch (e) {
    console.error("Toggle block failed:", e);
  }
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
