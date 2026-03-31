import React, { createContext, useContext } from 'react';

// Dark mode is permanent — ReverSound enforces the DAW-inspired dark aesthetic.
// Light mode has been removed. This context is kept for compatibility.

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  // Always dark — no toggle
  return (
    <ThemeContext.Provider value={{ theme: 'dark', isDark: true, toggleTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

export default ThemeContext;
