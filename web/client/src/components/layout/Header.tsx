import { Moon, Sun, Search, Command } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { MobileSidebarTrigger } from './Sidebar';
import { Kbd } from '@/components/keyboard';
import { NotificationCenter } from '@/components/notifications';

export function Header() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    document.documentElement.classList.toggle('dark', newIsDark);
    localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
  };

  return (
    <header className="h-16 border-b bg-card px-4 md:px-6 flex items-center justify-between gap-4">
      {/* Mobile menu trigger */}
      <MobileSidebarTrigger />

      {/* Search - hidden on mobile, shown on tablet+ */}
      <div className="hidden sm:flex items-center gap-4 flex-1">
        <Button
          variant="outline"
          className="relative max-w-md flex-1 justify-start text-muted-foreground font-normal bg-muted/50 h-9"
          onClick={() => window.dispatchEvent(new CustomEvent('openCommandPalette'))}
        >
          <Search className="mr-2 h-4 w-4" />
          <span>Search or type command...</span>
          <div className="ml-auto flex items-center gap-1">
            <Kbd>Ctrl</Kbd>
            <Kbd>K</Kbd>
          </div>
        </Button>
      </div>

      {/* Mobile logo - shown only on mobile */}
      <div className="flex md:hidden items-center gap-2 flex-1">
        <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
          <span className="text-yellow-950 font-bold text-lg">S</span>
        </div>
        <span className="font-bold text-lg">Sliver</span>
      </div>

      <div className="flex items-center gap-2">
        {/* Search button for mobile */}
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden"
          onClick={() => window.dispatchEvent(new CustomEvent('openCommandPalette'))}
        >
          <Command className="h-5 w-5" />
        </Button>

        <NotificationCenter />

        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </div>
    </header>
  );
}
