import React, { createContext, useState, useEffect } from 'react';

export const ThemeContext = createContext();

/**
 * Proveedor de tema dinámico (Claro/Oscuro) para la aplicación.
 */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Buscar la selección guardada, o por defecto usar 'dark' (elegido en Fase 5)
    const savedTheme = localStorage.getItem('theme');
    return savedTheme ? savedTheme : 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    localStorage.setItem('theme', theme);
  }, [theme]);

  /**
   * Cambia alternadamente el tema de claro a oscuro y viceversa.
   */
  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
