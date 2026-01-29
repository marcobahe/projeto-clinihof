'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-14 h-7 rounded-full bg-gray-300 dark:bg-gray-600 relative">
        <div className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white"></div>
      </div>
    );
  }

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={
        `relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
          isDark ? 'bg-purple-600' : 'bg-gray-300'
        }`
      }
      aria-label="Toggle theme"
    >
      <span
        className={
          `inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform duration-300 flex items-center justify-center ${
            isDark ? 'translate-x-7' : 'translate-x-0.5'
          }`
        }
      >
        {isDark ? (
          <Moon className="h-4 w-4 text-purple-600" />
        ) : (
          <Sun className="h-4 w-4 text-amber-500" />
        )}
      </span>
    </button>
  );
}
