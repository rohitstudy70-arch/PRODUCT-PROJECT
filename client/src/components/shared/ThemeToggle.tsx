import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { Button } from '../ui/button';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useUIStore();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 rounded-full cursor-pointer"
      title="Toggle Dark/Light Mode"
    >
      {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
};
