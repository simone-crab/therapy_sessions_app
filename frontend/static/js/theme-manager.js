(function () {
  const STORAGE_KEY = "solu-notes-theme";
  const DEFAULT_THEME = "dark";
  const THEMES = new Set(["dark", "light"]);

  function normalizeTheme(theme) {
    return THEMES.has(theme) ? theme : DEFAULT_THEME;
  }

  function getStoredTheme() {
    try {
      return normalizeTheme(localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME);
    } catch (_error) {
      return DEFAULT_THEME;
    }
  }

  const ThemeManager = {
    getTheme() {
      const domTheme = document.documentElement.dataset.theme;
      if (THEMES.has(domTheme)) {
        return domTheme;
      }
      return getStoredTheme();
    },

    applyThemeToDOM(theme) {
      const normalized = normalizeTheme(theme);
      document.documentElement.dataset.theme = normalized;
      document.dispatchEvent(new CustomEvent("solu-theme-changed", {
        detail: { theme: normalized }
      }));
      return normalized;
    },

    persistTheme(theme) {
      const normalized = normalizeTheme(theme);
      try {
        localStorage.setItem(STORAGE_KEY, normalized);
      } catch (_error) {
        // Ignore storage failures in restricted environments.
      }
      return normalized;
    },

    setTheme(theme) {
      const normalized = this.applyThemeToDOM(theme);
      this.persistTheme(normalized);
      return normalized;
    },

    toggleTheme() {
      const next = this.getTheme() === "dark" ? "light" : "dark";
      return this.setTheme(next);
    },

    init() {
      const initial = getStoredTheme();
      return this.setTheme(initial);
    }
  };

  window.ThemeManager = ThemeManager;
})();
