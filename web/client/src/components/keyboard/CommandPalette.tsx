import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard,
  Users,
  Radio,
  Briefcase,
  Package,
  Server,
  FileText,
  Key,
  Globe,
  User,
  Settings,
  Shield,
  Award,
  Bell,
  Keyboard,
} from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  keywords?: string[];
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const commands = useMemo<{ group: string; items: CommandItem[] }[]>(
    () => [
      {
        group: 'Navigation',
        items: [
          {
            id: 'dashboard',
            label: 'Dashboard',
            icon: LayoutDashboard,
            action: () => navigate('/'),
            keywords: ['home', 'overview'],
          },
          {
            id: 'sessions',
            label: 'Sessions',
            icon: Users,
            action: () => navigate('/sessions'),
            keywords: ['interactive', 'shell'],
          },
          {
            id: 'beacons',
            label: 'Beacons',
            icon: Radio,
            action: () => navigate('/beacons'),
            keywords: ['async', 'callback'],
          },
          {
            id: 'jobs',
            label: 'Jobs / Listeners',
            icon: Briefcase,
            action: () => navigate('/jobs'),
            keywords: ['mtls', 'http', 'https', 'dns', 'listener'],
          },
          {
            id: 'implants',
            label: 'Implants',
            icon: Package,
            action: () => navigate('/implants'),
            keywords: ['payload', 'generate', 'build'],
          },
          {
            id: 'hosts',
            label: 'Hosts',
            icon: Server,
            action: () => navigate('/hosts'),
            keywords: ['target', 'machine'],
          },
          {
            id: 'loot',
            label: 'Loot',
            icon: FileText,
            action: () => navigate('/loot'),
            keywords: ['files', 'data', 'exfil'],
          },
          {
            id: 'credentials',
            label: 'Credentials',
            icon: Key,
            action: () => navigate('/credentials'),
            keywords: ['password', 'hash', 'creds'],
          },
          {
            id: 'websites',
            label: 'Websites',
            icon: Globe,
            action: () => navigate('/websites'),
            keywords: ['http', 'content'],
          },
          {
            id: 'operators',
            label: 'Operators',
            icon: User,
            action: () => navigate('/operators'),
            keywords: ['users', 'team'],
          },
        ],
      },
      {
        group: 'Configuration',
        items: [
          {
            id: 'settings',
            label: 'Settings',
            icon: Settings,
            action: () => navigate('/settings'),
            keywords: ['preferences', 'config', 'terminal'],
          },
          {
            id: 'armory',
            label: 'Armory',
            icon: Shield,
            action: () => navigate('/armory'),
            keywords: ['extensions', 'aliases', 'plugins'],
          },
          {
            id: 'c2profiles',
            label: 'C2 Profiles',
            icon: Award,
            action: () => navigate('/c2profiles'),
            keywords: ['http', 'configuration'],
          },
          {
            id: 'certificates',
            label: 'Certificates',
            icon: Key,
            action: () => navigate('/certificates'),
            keywords: ['ssl', 'tls', 'ca'],
          },
          {
            id: 'canaries',
            label: 'Canaries',
            icon: Bell,
            action: () => navigate('/canaries'),
            keywords: ['dns', 'alert'],
          },
        ],
      },
      {
        group: 'Help',
        items: [
          {
            id: 'shortcuts',
            label: 'Keyboard Shortcuts',
            icon: Keyboard,
            action: () => {
              // Trigger Ctrl+Shift+? to open shortcuts dialog
              window.dispatchEvent(
                new KeyboardEvent('keydown', {
                  key: '?',
                  ctrlKey: true,
                  shiftKey: true,
                  bubbles: true,
                })
              );
            },
            keywords: ['keys', 'hotkeys', 'help'],
          },
        ],
      },
    ],
    [navigate]
  );

  const handleSelect = useCallback((item: CommandItem) => {
    setOpen(false);
    item.action();
  }, []);

  useEffect(() => {
    const handleOpenCommandPalette = () => setOpen(true);
    window.addEventListener('openCommandPalette', handleOpenCommandPalette);
    return () => window.removeEventListener('openCommandPalette', handleOpenCommandPalette);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {commands.map((group, index) => (
          <div key={group.group}>
            {index > 0 && <CommandSeparator />}
            <CommandGroup heading={group.group}>
              {group.items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.label} ${item.keywords?.join(' ') || ''}`}
                  onSelect={() => handleSelect(item)}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
