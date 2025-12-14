import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { KeyboardShortcutsDialog, CommandPalette } from '@/components/keyboard';
import { useKeyboardShortcuts, useWebSocketNotifications } from '@/hooks';

export function MainLayout() {
  // Initialize keyboard shortcuts
  useKeyboardShortcuts();

  // Initialize WebSocket notifications
  useWebSocketNotifications();

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
      {/* Global keyboard components */}
      <KeyboardShortcutsDialog />
      <CommandPalette />
    </div>
  );
}
