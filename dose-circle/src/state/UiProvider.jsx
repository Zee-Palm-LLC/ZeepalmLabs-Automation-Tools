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

export function UiProvider({ children }) {
  const [theme, setThemeState] = useState(() => read('dc.theme', 'light'));
  const [person, setPersonState] = useState(() => read('dc.person', 'p1'));
  const [navOpen, setNavOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#101122' : '#f2f3f8');
    write('dc.theme', theme);
  }, [theme]);

  const setPerson = useCallback(id => {
    setPersonState(id);
    write('dc.person', id);
  }, []);

  const toggleTheme = useCallback(() => setThemeState(t => (t === 'dark' ? 'light' : 'dark')), []);

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') {
        setBellOpen(false);
        setNavOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const value = { theme, setTheme: setThemeState, toggleTheme, person, setPerson, navOpen, setNavOpen, bellOpen, setBellOpen };
  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}
