import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: () => void;
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const location = useLocation();

  // Define navigation shortcuts
  const shortcuts: KeyboardShortcut[] = [
    // Navigation shortcuts (Ctrl/Cmd + number or letter)
    {
      key: 'h',
      ctrl: true,
      description: 'Go to Dashboard',
      action: () => navigate('/'),
    },
    {
      key: 's',
      ctrl: true,
      shift: true,
      description: 'Go to Sessions',
      action: () => navigate('/sessions'),
    },
    {
      key: 'b',
      ctrl: true,
      shift: true,
      description: 'Go to Beacons',
      action: () => navigate('/beacons'),
    },
    {
      key: 'j',
      ctrl: true,
      shift: true,
      description: 'Go to Jobs',
      action: () => navigate('/jobs'),
    },
    {
      key: 'i',
      ctrl: true,
      shift: true,
      description: 'Go to Implants',
      action: () => navigate('/implants'),
    },
    {
      key: ',',
      ctrl: true,
      description: 'Go to Settings',
      action: () => navigate('/settings'),
    },
    // Utility shortcuts
    {
      key: 'k',
      ctrl: true,
      description: 'Open command palette',
      action: () => {
        // Dispatch custom event for command palette
        window.dispatchEvent(new CustomEvent('openCommandPalette'));
      },
    },
    {
      key: '/',
      ctrl: true,
      description: 'Focus search',
      action: () => {
        const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
        searchInput?.focus();
      },
    },
    {
      key: 'Escape',
      description: 'Close modal/dialog',
      action: () => {
        // Dispatch escape event for modals
        window.dispatchEvent(new CustomEvent('closeModal'));
      },
    },
  ];

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Only allow Escape to work in input fields
        if (event.key !== 'Escape') {
          return;
        }
      }

      // Find matching shortcut
      const shortcut = shortcuts.find((s) => {
        const keyMatch = s.key.toLowerCase() === event.key.toLowerCase();
        const ctrlMatch = s.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const shiftMatch = s.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = s.alt ? event.altKey : !event.altKey;

        return keyMatch && ctrlMatch && shiftMatch && altMatch;
      });

      if (shortcut) {
        event.preventDefault();
        shortcut.action();
      }
    },
    [shortcuts, navigate, location]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return shortcuts;
}

// Export shortcuts for display in help dialog
export const keyboardShortcuts = [
  { keys: ['Ctrl', 'H'], description: 'Go to Dashboard' },
  { keys: ['Ctrl', 'Shift', 'S'], description: 'Go to Sessions' },
  { keys: ['Ctrl', 'Shift', 'B'], description: 'Go to Beacons' },
  { keys: ['Ctrl', 'Shift', 'J'], description: 'Go to Jobs' },
  { keys: ['Ctrl', 'Shift', 'I'], description: 'Go to Implants' },
  { keys: ['Ctrl', ','], description: 'Go to Settings' },
  { keys: ['Ctrl', 'K'], description: 'Open command palette' },
  { keys: ['Ctrl', '/'], description: 'Focus search' },
  { keys: ['Escape'], description: 'Close dialog' },
];
