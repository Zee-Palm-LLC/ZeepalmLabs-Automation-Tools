import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const UiContext = createContext(null);

export function useUi() {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('useUi must be used inside UiProvider');
  return ctx;
}

const read = (key, fallback) => {
  try {
    const v = window.localStorage.getItem(key);
    return v === null ? fallback : JSON.parse(v);
  } catch (e) {
    return fallback;
  }
};

const write = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    return undefined;
  }
  return undefined;
};

const systemTheme = () => {
  try {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  } catch (e) {
    return 'dark';
  }
};

export function UiProvider({ children }) {
  const [theme, setThemeState] = useState(() => read('nss.theme', systemTheme()));
  const [collapsed, setCollapsed] = useState(() => read('nss.sidebar', false));
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [stageOpen, setStageOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#081214' : '#eef4f2');
    write('nss.theme', theme);
  }, [theme]);

  useEffect(() => {
    write('nss.sidebar', collapsed);
  }, [collapsed]);

  const setTheme = useCallback(t => setThemeState(t), []);
  const toggleTheme = useCallback(() => setThemeState(t => (t === 'dark' ? 'light' : 'dark')), []);

  useEffect(() => {
    const onKey = e => {
      const k = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && k === 'k') {
        e.preventDefault();
        setPaletteOpen(o => !o);
      }
      if (k === 'escape') {
        setBellOpen(false);
        setNavOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const value = {
    theme,
    setTheme,
    toggleTheme,
    collapsed,
    setCollapsed,
    paletteOpen,
    setPaletteOpen,
    stageOpen,
    setStageOpen,
    navOpen,
    setNavOpen,
    bellOpen,
    setBellOpen
  };
  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}
