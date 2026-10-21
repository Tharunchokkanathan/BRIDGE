import React, { useState, useEffect } from 'react';
import AppShell from './components/layout/AppShell';
import CommandCenter from './pages/CommandCenter';
import RiskQueue from './pages/RiskQueue';
import RouteOptimizer from './pages/RouteOptimizer';
import Interventions from './pages/Interventions';
import ZonePriors from './pages/ZonePriors';
import BatchScoring from './pages/BatchScoring';
import ModelGovernance from './pages/ModelGovernance';
import AuditDisclosures from './pages/AuditDisclosures';
import Settings from './pages/Settings';
import Styleguide from './pages/Styleguide';

export const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState(() => {
    return window.location.pathname || '/command-center';
  });

  useEffect(() => {
    const onLocationChange = () => {
      setCurrentPath(window.location.pathname || '/command-center');
    };

    window.addEventListener('popstate', onLocationChange);
    return () => window.removeEventListener('popstate', onLocationChange);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  const renderScreen = () => {
    switch (currentPath) {
      case '/':
      case '/command-center':
        return <CommandCenter onNavigate={navigate} />;
      case '/risk-queue':
        return <RiskQueue />;
      case '/route-optimizer':
        return <RouteOptimizer />;
      case '/interventions':
        return <Interventions />;
      case '/zone-priors':
        return <ZonePriors />;
      case '/batch-scoring':
        return <BatchScoring />;
      case '/model-governance':
        return <ModelGovernance />;
      case '/audit':
        return <AuditDisclosures />;
      case '/settings':
        return <Settings />;
      case '/styleguide':
        return <Styleguide />;
      default:
        return <CommandCenter onNavigate={navigate} />;
    }
  };

  return <AppShell>{renderScreen()}</AppShell>;
};

export default App;
