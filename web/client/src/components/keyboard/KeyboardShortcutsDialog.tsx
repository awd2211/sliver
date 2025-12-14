import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Kbd } from './Kbd';
import { keyboardShortcuts } from '@/hooks';
import { Keyboard } from 'lucide-react';

export function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Open help with Ctrl/Cmd + ?
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === '?') {
        event.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Quick navigation and actions
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Navigation Section */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Navigation</h4>
            <div className="space-y-2">
              {keyboardShortcuts
                .filter((s) => s.description.startsWith('Go to'))
                .map((shortcut, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, kidx) => (
                        <Kbd key={kidx}>{key}</Kbd>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Actions Section */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Actions</h4>
            <div className="space-y-2">
              {keyboardShortcuts
                .filter((s) => !s.description.startsWith('Go to'))
                .map((shortcut, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, kidx) => (
                        <Kbd key={kidx}>{key}</Kbd>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="pt-4 border-t text-center">
            <span className="text-xs text-muted-foreground">
              Press <Kbd>Ctrl</Kbd> + <Kbd>Shift</Kbd> + <Kbd>?</Kbd> to show this dialog
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
