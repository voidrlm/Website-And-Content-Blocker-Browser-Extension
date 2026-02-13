/** Content script — hides search results that link to blocked domains */

let blockedDomains = [];

async function loadBlockedDomains() {
  const { blockedDomains: domains } = await chrome.storage.local.get({
    blockedDomains: [],
  });
  blockedDomains = domains;
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

function hideBlockedResults() {
  if (blockedDomains.length === 0) return;

  // All links on the page — covers Google, Bing, DuckDuckGo
  const links = document.querySelectorAll("a[href]");

  for (const link of links) {
    if (!isDomainBlocked(link.href)) continue;

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

// Run on page load
loadBlockedDomains().then(() => {
  hideBlockedResults();

  // Google dynamically loads results (infinite scroll, image panels)
  const observer = new MutationObserver(() => hideBlockedResults());
  observer.observe(document.body, { childList: true, subtree: true });
});

// Re-apply if blocked list changes while the page is open
chrome.storage.onChanged.addListener((changes) => {
  if (changes.blockedDomains) {
    blockedDomains = changes.blockedDomains.newValue || [];
    hideBlockedResults();
  }
});
