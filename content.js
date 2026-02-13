/** Content script — hides search results that link to blocked domains or match keywords,
 *  and enforces SafeSearch UI when enabled. */

let blockedDomains = [];
let blockedKeywords = [];
let safeSearchEnabled = false;

async function loadSettings() {
  const data = await chrome.storage.local.get({
    blockedDomains: [],
    blockedKeywords: [],
    safeSearchEnabled: false,
  });
  blockedDomains = data.blockedDomains;
  blockedKeywords = data.blockedKeywords;
  safeSearchEnabled = data.safeSearchEnabled;
}

function isDomainBlocked(url) {
  try {
    const hostname = new URL(url).hostname;
    return blockedDomains.some(
      (d) => hostname === d || hostname.endsWith("." + d)
    );
  } catch {
    return false;
  }
}

function containsBlockedKeyword(text) {
  if (blockedKeywords.length === 0 || !text) return false;
  const lower = text.toLowerCase();
  return blockedKeywords.some((kw) => lower.includes(kw.toLowerCase()));
}

function isBlocked(url, title) {
  return isDomainBlocked(url) || containsBlockedKeyword(url) || containsBlockedKeyword(title);
}

function hideBlockedResults() {
  if (blockedDomains.length === 0 && blockedKeywords.length === 0) return;

  // All links on the page — covers Google, Bing, DuckDuckGo
  const links = document.querySelectorAll("a[href]");

  for (const link of links) {
    if (!isBlocked(link.href, link.textContent)) continue;

    // Walk up to find the search result container to hide the whole card
    let el = link;
    for (let i = 0; i < 8; i++) {
      if (!el.parentElement) break;
      const parent = el.parentElement;

      // Google: divs with class "g" or data-hveid, image grid items
      // Bing: li.b_algo
      // DuckDuckGo: article[data-testid="result"]
      if (
        (parent.tagName === "DIV" && parent.classList.contains("g")) ||
        (parent.tagName === "LI" && parent.classList.contains("b_algo")) ||
        (parent.tagName === "ARTICLE") ||
        (parent.dataset && parent.dataset.hveid) ||
        // Google Images: the grid items
        (parent.dataset && parent.dataset.ri !== undefined) ||
        parent.classList.contains("isv-r")
      ) {
        parent.style.display = "none";
        break;
      }
      el = parent;
    }

    // Fallback: if we didn't find a known container, hide the closest
    // block-level ancestor that looks like a result wrapper
    if (link.closest("[data-hveid]")) {
      link.closest("[data-hveid]").style.display = "none";
    }
  }
}

/**
 * Hide Google's SafeSearch "Off" and "Blur" options so the user
 * can only keep "Filter" active. Targets the settings bar on
 * Google search results pages (the chip/pill row).
 */
function enforceSafeSearchUI() {
  if (!safeSearchEnabled) return;

  const host = location.hostname;

  // Google: hide "Off" and "Blur" chips in the SafeSearch toggle bar
  if (host.includes("google")) {
    // Google uses div[role="listbox"] or a group of div[role="option"] for the SafeSearch picker.
    // Also targets the /safesearch settings page chips and the search bar chips.
    const options = document.querySelectorAll('[role="option"], [role="listbox"] [role="presentation"], [data-safesearch]');
    for (const opt of options) {
      const text = opt.textContent.trim().toLowerCase();
      if (text === "off" || text === "blur") {
        opt.style.display = "none";
      }
    }

    // Also target links/buttons with SafeSearch off/blur in the settings page
    const allElements = document.querySelectorAll('a, button, div[role="button"], div[jsname]');
    for (const el of allElements) {
      const text = el.textContent.trim().toLowerCase();
      // Only hide exact short matches to avoid hiding unrelated content
      if ((text === "off" || text === "blur") && el.closest('[data-safesearch], [jscontroller], .safesearch')) {
        el.style.display = "none";
      }
    }

    // Inject CSS to hide safe search controls broadly (Google changes markup often)
    if (!document.getElementById("ext-safesearch-css")) {
      const style = document.createElement("style");
      style.id = "ext-safesearch-css";
      style.textContent = `
        /* Hide Off and Blur options in Google SafeSearch settings */
        [data-safesearch="0"], [data-safesearch="1"] { display: none !important; }
      `;
      document.head.appendChild(style);
    }
  }

  // Bing: hide the SafeSearch dropdown options for "Moderate" and "Off"
  if (host.includes("bing")) {
    const opts = document.querySelectorAll('#base_safesearch option, [id*="safesearch"] option');
    for (const opt of opts) {
      const val = opt.value?.toLowerCase();
      if (val === "moderate" || val === "off" || val === "demote") {
        opt.disabled = true;
        opt.style.display = "none";
      }
    }
  }
}

function removeSafeSearchCSS() {
  const style = document.getElementById("ext-safesearch-css");
  if (style) style.remove();
}

// Run on page load
loadSettings().then(() => {
  hideBlockedResults();
  enforceSafeSearchUI();

  // Google dynamically loads results (infinite scroll, image panels)
  const observer = new MutationObserver(() => {
    hideBlockedResults();
    enforceSafeSearchUI();
  });
  observer.observe(document.body, { childList: true, subtree: true });
});

// Re-apply if settings change while the page is open
chrome.storage.onChanged.addListener((changes) => {
  if (changes.blockedDomains) {
    blockedDomains = changes.blockedDomains.newValue || [];
  }
  if (changes.blockedKeywords) {
    blockedKeywords = changes.blockedKeywords.newValue || [];
  }
  if (changes.safeSearchEnabled) {
    safeSearchEnabled = changes.safeSearchEnabled.newValue || false;
    if (safeSearchEnabled) {
      enforceSafeSearchUI();
    } else {
      removeSafeSearchCSS();
    }
  }
  if (changes.blockedDomains || changes.blockedKeywords) {
    hideBlockedResults();
  }
});
