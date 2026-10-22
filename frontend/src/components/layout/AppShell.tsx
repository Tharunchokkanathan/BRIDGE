import React, { useState, useEffect, useCallback } from 'react';
import { NavRail } from './NavRail';
import { TopBar, UiDensity } from './TopBar';
import { CommandPalette } from './CommandPalette';
import { ShortcutSheet } from './ShortcutSheet';
import { ApiDownBanner } from './ApiDownBanner';
import { ToastProvider } from '../common/ToastProvider';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { api } from '../../api/client';
import { HealthResponse } from '../../api/types';
import { toast } from 'sonner';

export interface AppShellProps {
  children?: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('bridge_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  // Density state
  const [density, setDensity] = useState<UiDensity>(() => {
    try {
      const saved = localStorage.getItem('bridge_density') as UiDensity;
      if (saved === 'compact' || saved === 'default' || saved === 'comfortable') return saved;
      return 'default';
    } catch {
      return 'default';
    }
  });

  // Nav collapse state
  const [navCollapsed, setNavCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('bridge_nav_collapsed');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  // Routing state
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/command-center';
  });

  // Overlay states
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutSheetOpen, setShortcutSheetOpen] = useState(false);

  // Health and Model status state
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [isApiHealthy, setIsApiHealthy] = useState(true);
  const [latencyMs, setLatencyMs] = useState<number | undefined>(undefined);
  const [isRetrying, setIsRetrying] = useState(false);

  // Apply theme to document element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('bridge_theme', theme);
    } catch (e) {
      console.warn('Unable to persist theme to localStorage', e);
    }
  }, [theme]);

  // Apply density
  const handleDensityChange = (newDensity: UiDensity) => {
    setDensity(newDensity);
    try {
      localStorage.setItem('bridge_density', newDensity);
    } catch (e) {
      console.warn('Unable to persist density', e);
    }
  };

  // Toggle collapse
  const handleToggleCollapse = () => {
    setNavCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('bridge_nav_collapsed', String(next));
      } catch (e) {
        console.warn('Unable to persist collapse state', e);
      }
      return next;
    });
  };

  // Navigation handler
  const handleNavigate = useCallback((path: string) => {
    if (path !== currentPath) {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
    }
  }, [currentPath]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(window.location.pathname || '/command-center');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Fetch health data
  const checkHealth = useCallback(async () => {
    const start = performance.now();
    try {
      const health = await api.getHealth();
      const duration = Math.round(performance.now() - start);
      setHealthData(health);
      setIsApiHealthy(true);
      setLatencyMs(duration);
    } catch (err) {
      console.warn('Health check failed:', err);
      setIsApiHealthy(false);
      setLatencyMs(undefined);
    } finally {
      setIsRetrying(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 15000); // Check every 15s
    return () => clearInterval(interval);
  }, [checkHealth]);

  // Model switch quick-action
  const handleQuickModelSwitch = async () => {
    if (!healthData) return;
    const targetModel = healthData.is_champion_active
      ? 'LightGBM Candidate'
      : 'Logistic Regression';
    try {
      const res = await api.switchModel(targetModel);
      toast.success(res.message);
      checkHealth();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Model switch failed';
      toast.error(msg);
    }
  };

  // Reset manifest quick-action
  const handleResetManifest = async () => {
    try {
      const res = await api.resetManifest();
      toast.success(res.message);
      checkHealth();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Manifest reset failed';
      toast.error(msg);
    }
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.key === '[') {
        e.preventDefault();
        handleToggleCollapse();
      } else if (e.key === '?' && (e.shiftKey || !e.metaKey)) {
        e.preventDefault();
        setShortcutSheetOpen((prev) => !prev);
      } else if (e.altKey && e.key >= '1' && e.key <= '9') {
        const screens = [
          '/command-center',
          '/risk-queue',
          '/route-optimizer',
          '/interventions',
          '/zone-priors',
          '/batch-scoring',
          '/model-governance',
          '/audit',
          '/settings',
        ];
        const index = parseInt(e.key, 10) - 1;
        if (screens[index]) {
          e.preventDefault();
          handleNavigate(screens[index]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNavigate]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--canvas)] text-[var(--ink)] font-sans antialiased">
      {/* Collapsible Left Rail */}
      <NavRail
        currentPath={currentPath}
        onNavigate={handleNavigate}
        collapsed={navCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <TopBar
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
          density={density}
          onChangeDensity={handleDensityChange}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onNavigate={handleNavigate}
          activeModelName={healthData?.active_model || 'Logistic Regression'}
          isChampionActive={healthData?.is_champion_active ?? true}
          isApiHealthy={isApiHealthy}
          manifestId={healthData?.manifest_id}
          latencyMs={latencyMs}
        />

        {/* API Down Warning Banner if offline */}
        {!isApiHealthy && (
          <ApiDownBanner
            onRetry={() => {
              setIsRetrying(true);
              checkHealth();
            }}
            isRetrying={isRetrying}
          />
        )}

        {/* Primary Screen Viewport */}
        <main
          id="main-content"
          tabIndex={0}
          aria-label="Main content"
          className="flex-1 overflow-y-auto p-4 lg:p-6 min-w-0 focus:outline-none"
        >
          <div className="max-w-[1600px] mx-auto w-full">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onNavigate={handleNavigate}
        onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
        onSwitchModel={handleQuickModelSwitch}
        onResetManifest={handleResetManifest}
        activeModelName={healthData?.active_model}
        theme={theme}
      />

      {/* Keyboard Shortcuts Sheet */}
      <ShortcutSheet
        open={shortcutSheetOpen}
        onClose={() => setShortcutSheetOpen(false)}
      />

      {/* Toast Notification Container */}
      <ToastProvider />
    </div>
  );
};

export default AppShell;
