const RESOURCE_TYPES = [
  "main_frame",
  "sub_frame",
  "image",
  "media",
  "script",
  "stylesheet",
  "xmlhttprequest",
  "other",
];

const KEYWORD_RULE_ID_OFFSET = 10000;

/** In-memory Set for O(1) lookups — rebuilt when service worker restarts */
let blockedSet = null;
let keywordSet = null;

async function getBlockedSet() {
  if (!blockedSet) {
    const { blockedDomains } = await chrome.storage.local.get({
      blockedDomains: [],
    });
    blockedSet = new Set(blockedDomains);
  }
  return blockedSet;
}

async function getKeywordSet() {
  if (!keywordSet) {
    const { blockedKeywords } = await chrome.storage.local.get({
      blockedKeywords: [],
    });
    keywordSet = new Set(blockedKeywords);
  }
  return keywordSet;
}

/** Persist the current sets to storage and re-apply rules. */
async function syncAndApply() {
  const domainArr = [...(await getBlockedSet())];
  const keywordArr = [...(await getKeywordSet())];
  await chrome.storage.local.set({
    blockedDomains: domainArr,
    blockedKeywords: keywordArr,
  });
  await applyRules(domainArr, keywordArr);
  return { domains: domainArr, keywords: keywordArr };
}

// Handle messages from the popup
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    const set = await getBlockedSet();
    const kSet = await getKeywordSet();

    switch (msg.type) {
      case "getDomains":
        return { domains: [...set] };

      case "addDomains":
        for (const d of msg.domains) set.add(d);
        return await syncAndApply();

      case "removeDomain":
        set.delete(msg.domain);
        return await syncAndApply();

      case "toggleDomain": {
        if (set.has(msg.domain)) set.delete(msg.domain);
        else set.add(msg.domain);
        return await syncAndApply();
      }

      case "getKeywords":
        return { keywords: [...kSet] };

      case "addKeywords":
        for (const k of msg.keywords) kSet.add(k);
        return await syncAndApply();

      case "removeKeyword":
        kSet.delete(msg.keyword);
        return await syncAndApply();

      case "clearAll":
        set.clear();
        kSet.clear();
        return await syncAndApply();

      case "hasPassword": {
        const { passwordHash } = await chrome.storage.local.get({ passwordHash: null });
        return { hasPassword: !!passwordHash };
      }

      case "setPassword": {
        await chrome.storage.local.set({ passwordHash: msg.hash });
        return { ok: true };
      }

      case "checkPassword": {
        const { passwordHash: stored } = await chrome.storage.local.get({ passwordHash: null });
        return { match: stored === msg.hash };
      }

      default:
        return {};
    }
  })().then(sendResponse);

  return true; // keep the message channel open for async response
});

/**
 * Applies declarativeNetRequest rules from the given domain and keyword lists.
 * Domain rules: IDs 1..N using requestDomains
 * Keyword rules: IDs 10001..10001+M using urlFilter
 */
async function applyRules(domains, keywords) {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.map((r) => r.id);

  const domainRules = domains.map((domain, i) => ({
    id: i + 1,
    priority: 1,
    action: { type: "block" },
    condition: {
      requestDomains: [domain],
      resourceTypes: RESOURCE_TYPES,
    },
  }));

  const keywordRules = keywords.map((keyword, i) => ({
    id: KEYWORD_RULE_ID_OFFSET + i + 1,
    priority: 1,
    action: { type: "block" },
    condition: {
      urlFilter: `*${keyword}*`,
      resourceTypes: RESOURCE_TYPES,
    },
  }));

  // Single atomic call — no gap where rules are missing
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules: [...domainRules, ...keywordRules],
  });
}

// Initialize on browser start AND extension install/update
async function init() {
  const domains = [...(await getBlockedSet())];
  const keywords = [...(await getKeywordSet())];
  await applyRules(domains, keywords);

  // Show blocked-request count as badge text (zero cost, handled by Chrome)
  chrome.declarativeNetRequest.setExtensionActionOptions({
    displayActionCountAsBadgeText: true,
  });
}

chrome.runtime.onStartup.addListener(init);
chrome.runtime.onInstalled.addListener(init);
