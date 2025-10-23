import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface AccessibilitySettings {
  fontSize: number; // 100, 125, 150, 200
  highContrast: boolean;
  reducedMotion: boolean;
  keyboardOnlyMode: boolean;
  screenReaderMode: boolean;
  focusVisible: boolean;
  announcements: boolean;
}

interface AccessibilityContextValue {
  settings: AccessibilitySettings;
  updateSettings: (settings: Partial<AccessibilitySettings>) => void;
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  resetSettings: () => void;
}

const defaultSettings: AccessibilitySettings = {
  fontSize: 100,
  highContrast: false,
  reducedMotion: false,
  keyboardOnlyMode: false,
  screenReaderMode: false,
  focusVisible: true,
  announcements: true,
};

const AccessibilityContext = createContext<AccessibilityContextValue | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    // Load from localStorage
    const saved = localStorage.getItem('a11y-settings');
    if (saved) {
      try {
        return { ...defaultSettings, ...JSON.parse(saved) };
      } catch {
        return defaultSettings;
      }
    }

    // Detect system preferences
    return {
      ...defaultSettings,
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      highContrast: window.matchMedia('(prefers-contrast: high)').matches,
    };
  });

  const [announcementQueue, setAnnouncementQueue] = useState<
    Array<{ id: string; message: string; priority: 'polite' | 'assertive' }>
  >([]);

  // Apply settings to document
  useEffect(() => {
    const root = document.documentElement;

    // Font size
    root.style.fontSize = `${settings.fontSize}%`;

    // High contrast
    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Reduced motion
    if (settings.reducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }

    // Focus visible
    if (settings.focusVisible) {
      root.classList.add('focus-visible');
    } else {
      root.classList.remove('focus-visible');
    }

    // Keyboard only mode
    if (settings.keyboardOnlyMode) {
      root.classList.add('keyboard-only');
    } else {
      root.classList.remove('keyboard-only');
    }

    // Save to localStorage
    localStorage.setItem('a11y-settings', JSON.stringify(settings));
  }, [settings]);

  // Listen for system preference changes
  useEffect(() => {
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');

    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      setSettings((prev) => ({ ...prev, reducedMotion: e.matches }));
    };

    const handleHighContrastChange = (e: MediaQueryListEvent) => {
      setSettings((prev) => ({ ...prev, highContrast: e.matches }));
    };

    reducedMotionQuery.addEventListener('change', handleReducedMotionChange);
    highContrastQuery.addEventListener('change', handleHighContrastChange);

    return () => {
      reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
      highContrastQuery.removeEventListener('change', handleHighContrastChange);
    };
  }, []);

  // Detect keyboard-only navigation
  useEffect(() => {
    let isKeyboardUser = false;

    const handleMouseDown = () => {
      isKeyboardUser = false;
      setSettings((prev) => ({ ...prev, keyboardOnlyMode: false }));
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && !isKeyboardUser) {
        isKeyboardUser = true;
        setSettings((prev) => ({ ...prev, keyboardOnlyMode: true }));
      }
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const updateSettings = (newSettings: Partial<AccessibilitySettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!settings.announcements) {
      return;
    }

    const id = `announcement-${Date.now()}-${Math.random()}`;
    setAnnouncementQueue((prev) => [...prev, { id, message, priority }]);

    // Remove announcement after it's been read
    setTimeout(() => {
      setAnnouncementQueue((prev) => prev.filter((a) => a.id !== id));
    }, 5000);
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem('a11y-settings');
  };

  return (
    <AccessibilityContext.Provider value={{ settings, updateSettings, announce, resetSettings }}>
      {children}

      {/* Screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcementQueue
          .filter((a) => a.priority === 'polite')
          .map((a) => (
            <div key={a.id}>{a.message}</div>
          ))}
      </div>
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {announcementQueue
          .filter((a) => a.priority === 'assertive')
          .map((a) => (
            <div key={a.id}>{a.message}</div>
          ))}
      </div>
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
}
