import React, { useState, useEffect } from 'react';
import Styleguide from './pages/Styleguide';

export const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const onLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', onLocationChange);
    return () => window.removeEventListener('popstate', onLocationChange);
  }, []);

  // For Step 9.1, /styleguide or root renders Styleguide
  if (currentPath === '/styleguide' || currentPath === '/' || currentPath === '') {
    return <Styleguide />;
  }

  return <Styleguide />;
};

export default App;
