(function () {
  "use strict";

  const STORAGE_KEY = "cq-pedia-theme-v1";
  const root = document.documentElement;
  const media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function readSavedTheme() {
    try {
      const value = window.localStorage.getItem(STORAGE_KEY);
      return value === "light" || value === "dark" ? value : null;
    } catch (_error) {
      return null;
    }
  }

  function preferredTheme() {
    return readSavedTheme() || (media && media.matches ? "dark" : "light");
  }

  function updateControls(theme) {
    const nextIsDark = theme !== "dark";
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      const icon = button.querySelector("[data-theme-icon]");
      const label = button.querySelector("[data-theme-label]");
      const action = nextIsDark ? "切换到深色模式" : "切换到浅色模式";

      if (icon) icon.textContent = nextIsDark ? "🌙" : "☀️";
      if (label) label.textContent = nextIsDark ? "深色模式" : "浅色模式";
      button.setAttribute("aria-label", action);
      button.setAttribute("title", action);
      button.setAttribute("aria-pressed", String(theme === "dark"));
    });
  }

  function applyTheme(theme, persist) {
    const normalized = theme === "dark" ? "dark" : "light";
    root.dataset.theme = normalized;
    root.style.colorScheme = normalized;

    if (persist) {
      try {
        window.localStorage.setItem(STORAGE_KEY, normalized);
      } catch (_error) {
        // The theme still works for this page when storage is unavailable.
      }
    }

    updateControls(normalized);
    window.dispatchEvent(new CustomEvent("cq-theme-change", { detail: { theme: normalized } }));
  }

  applyTheme(preferredTheme(), false);

  function bindControls() {
    updateControls(root.dataset.theme || preferredTheme());
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-theme-toggle]");
      if (!button) return;
      const next = root.dataset.theme === "dark" ? "light" : "dark";
      applyTheme(next, true);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindControls, { once: true });
  } else {
    bindControls();
  }

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) applyTheme(preferredTheme(), false);
  });

  if (media) {
    const handleSystemTheme = () => {
      if (!readSavedTheme()) applyTheme(preferredTheme(), false);
    };
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handleSystemTheme);
    } else if (typeof media.addListener === "function") {
      media.addListener(handleSystemTheme);
    }
  }
})();
