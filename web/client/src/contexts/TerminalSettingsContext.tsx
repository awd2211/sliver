import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface TerminalTheme {
  background: string;
  foreground: string;
  cursor: string;
  selectionBackground: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
}

export interface TerminalSettings {
  fontSize: number;
  fontFamily: string;
  cursorStyle: 'block' | 'underline' | 'bar';
  cursorBlink: boolean;
  scrollback: number;
  theme: 'tokyo-night' | 'dracula' | 'monokai' | 'github-dark' | 'custom';
  customTheme?: TerminalTheme;
}

const defaultSettings: TerminalSettings = {
  fontSize: 14,
  fontFamily: 'Menlo, Monaco, "Courier New", monospace',
  cursorStyle: 'block',
  cursorBlink: true,
  scrollback: 1000,
  theme: 'tokyo-night',
};

const themes: Record<string, TerminalTheme> = {
  'tokyo-night': {
    background: '#1a1b26',
    foreground: '#a9b1d6',
    cursor: '#c0caf5',
    selectionBackground: '#33467c',
    black: '#15161e',
    red: '#f7768e',
    green: '#9ece6a',
    yellow: '#e0af68',
    blue: '#7aa2f7',
    magenta: '#bb9af7',
    cyan: '#7dcfff',
    white: '#a9b1d6',
  },
  'dracula': {
    background: '#282a36',
    foreground: '#f8f8f2',
    cursor: '#f8f8f2',
    selectionBackground: '#44475a',
    black: '#21222c',
    red: '#ff5555',
    green: '#50fa7b',
    yellow: '#f1fa8c',
    blue: '#bd93f9',
    magenta: '#ff79c6',
    cyan: '#8be9fd',
    white: '#f8f8f2',
  },
  'monokai': {
    background: '#272822',
    foreground: '#f8f8f2',
    cursor: '#f8f8f0',
    selectionBackground: '#49483e',
    black: '#272822',
    red: '#f92672',
    green: '#a6e22e',
    yellow: '#f4bf75',
    blue: '#66d9ef',
    magenta: '#ae81ff',
    cyan: '#a1efe4',
    white: '#f8f8f2',
  },
  'github-dark': {
    background: '#0d1117',
    foreground: '#c9d1d9',
    cursor: '#58a6ff',
    selectionBackground: '#264f78',
    black: '#484f58',
    red: '#ff7b72',
    green: '#3fb950',
    yellow: '#d29922',
    blue: '#58a6ff',
    magenta: '#bc8cff',
    cyan: '#39c5cf',
    white: '#b1bac4',
  },
};

interface TerminalSettingsContextType {
  settings: TerminalSettings;
  updateSettings: (settings: Partial<TerminalSettings>) => void;
  getThemeColors: () => TerminalTheme;
  resetToDefaults: () => void;
}

const TerminalSettingsContext = createContext<TerminalSettingsContextType | null>(null);

const STORAGE_KEY = 'sliver-terminal-settings';

export function TerminalSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<TerminalSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...defaultSettings, ...JSON.parse(stored) };
      }
    } catch {
      // Ignore parse errors
    }
    return defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (newSettings: Partial<TerminalSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const getThemeColors = (): TerminalTheme => {
    if (settings.theme === 'custom' && settings.customTheme) {
      return settings.customTheme;
    }
    return themes[settings.theme] || themes['tokyo-night'];
  };

  const resetToDefaults = () => {
    setSettings(defaultSettings);
  };

  return (
    <TerminalSettingsContext.Provider value={{ settings, updateSettings, getThemeColors, resetToDefaults }}>
      {children}
    </TerminalSettingsContext.Provider>
  );
}

export function useTerminalSettings() {
  const context = useContext(TerminalSettingsContext);
  if (!context) {
    throw new Error('useTerminalSettings must be used within a TerminalSettingsProvider');
  }
  return context;
}

export { themes as terminalThemes };
