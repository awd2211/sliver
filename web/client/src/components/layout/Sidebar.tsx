import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Terminal,
  Radio,
  Server,
  Package,
  Users,
  FileBox,
  Key,
  Monitor,
  Globe,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  Store,
  FileJson,
  ShieldCheck,
  Bird,
  Network,
  Eye,
  Hammer,
  Zap,
  PlaySquare,
  FileCode,
  Puzzle,
  Cpu,
  Shuffle,
  Scale,
  Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useTranslation } from 'react-i18next';

interface NavItem {
  titleKey: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

// 概览 - Overview
const overviewNavItems: NavItem[] = [
  { titleKey: 'nav.dashboard', href: '/', icon: LayoutDashboard },
  { titleKey: 'nav.topology', href: '/topology', icon: Network },
  { titleKey: 'nav.monitor', href: '/monitor', icon: Eye },
];

// 访问控制 - Access (Sessions & Beacons)
const accessNavItems: NavItem[] = [
  { titleKey: 'nav.sessions', href: '/sessions', icon: Terminal },
  { titleKey: 'nav.beacons', href: '/beacons', icon: Radio },
  { titleKey: 'nav.taskmany', href: '/taskmany', icon: PlaySquare },
];

// 载荷管理 - Payloads
const payloadNavItems: NavItem[] = [
  { titleKey: 'nav.implants', href: '/implants', icon: Package },
  { titleKey: 'nav.profiles', href: '/profiles', icon: FileCode },
  { titleKey: 'nav.jobs', href: '/jobs', icon: Server },
  { titleKey: 'nav.builders', href: '/builders', icon: Hammer },
];

// 数据收集 - Collection
const dataNavItems: NavItem[] = [
  { titleKey: 'nav.hosts', href: '/hosts', icon: Monitor },
  { titleKey: 'nav.loot', href: '/loot', icon: FileBox },
  { titleKey: 'nav.credentials', href: '/credentials', icon: Key },
  { titleKey: 'nav.websites', href: '/websites', icon: Globe },
  { titleKey: 'nav.canaries', href: '/canaries', icon: Bird },
];

// 扩展与工具 - Arsenal
const arsenalNavItems: NavItem[] = [
  { titleKey: 'nav.armory', href: '/armory', icon: Store },
  { titleKey: 'nav.aliases', href: '/aliases', icon: Terminal },
  { titleKey: 'nav.extensions', href: '/extensions', icon: Puzzle },
  { titleKey: 'nav.crack', href: '/crack', icon: Cpu },
];

// 系统配置 - Configuration
const configNavItems: NavItem[] = [
  { titleKey: 'nav.c2profiles', href: '/c2profiles', icon: FileJson },
  { titleKey: 'nav.trafficEncoders', href: '/traffic-encoders', icon: Shuffle },
  { titleKey: 'nav.certificates', href: '/certificates', icon: ShieldCheck },
  { titleKey: 'nav.reactions', href: '/reactions', icon: Zap },
];

// 系统管理 - Administration
const systemNavItems: NavItem[] = [
  { titleKey: 'nav.operators', href: '/operators', icon: Users },
  { titleKey: 'nav.compiler', href: '/compiler', icon: Wrench },
  { titleKey: 'nav.settings', href: '/settings', icon: Settings },
  { titleKey: 'nav.licenses', href: '/licenses', icon: Scale },
];

// Reusable navigation section component
function NavSection({
  items,
  titleKey,
  collapsed = false,
  onNavigate,
}: {
  items: NavItem[];
  titleKey?: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <div className="space-y-1">
      {titleKey && !collapsed && (
        <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          {t(titleKey)}
        </h3>
      )}
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.href ||
          (item.href !== '/' && location.pathname.startsWith(item.href));
        const title = t(item.titleKey);

        return (
          <NavLink
            key={item.href}
            to={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              isActive
                ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-l-2 border-yellow-500'
                : 'text-muted-foreground',
              collapsed && 'justify-center px-2'
            )}
            title={collapsed ? title : undefined}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>{title}</span>}
            {!collapsed && item.badge !== undefined && item.badge > 0 && (
              <span className="ml-auto bg-yellow-500 text-yellow-950 text-xs font-bold px-2 py-0.5 rounded-full">
                {item.badge}
              </span>
            )}
          </NavLink>
        );
      })}
    </div>
  );
}

// Sidebar content (shared between desktop and mobile)
function SidebarContent({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const { logout, username } = useAuthStore();

  return (
    <>
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
        <NavSection items={overviewNavItems} titleKey="nav.overview" collapsed={collapsed} onNavigate={onNavigate} />
        <NavSection items={accessNavItems} titleKey="nav.access" collapsed={collapsed} onNavigate={onNavigate} />
        <NavSection items={payloadNavItems} titleKey="nav.payloads" collapsed={collapsed} onNavigate={onNavigate} />
        <NavSection items={dataNavItems} titleKey="nav.collection" collapsed={collapsed} onNavigate={onNavigate} />
        <NavSection items={arsenalNavItems} titleKey="nav.arsenal" collapsed={collapsed} onNavigate={onNavigate} />
        <NavSection items={configNavItems} titleKey="nav.configuration" collapsed={collapsed} onNavigate={onNavigate} />
        <NavSection items={systemNavItems} titleKey="nav.administration" collapsed={collapsed} onNavigate={onNavigate} />
      </nav>

      {/* User section */}
      <div className="border-t p-4">
        <div className={cn('flex items-center', collapsed ? 'justify-center' : 'gap-3')}>
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
            <span className="text-sm font-medium">
              {username?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{username}</p>
              <p className="text-xs text-muted-foreground">Operator</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => logout()}
            title="Logout"
            className={cn(collapsed && 'mt-2')}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}

// Mobile sidebar trigger button (exported for use in Header)
export function MobileSidebarTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-64">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                <span className="text-yellow-950 font-bold text-lg">S</span>
              </div>
              <span className="font-bold text-lg">Sliver</span>
            </div>
          </div>
          <SidebarContent onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Desktop sidebar
export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Hide desktop sidebar on mobile
  if (isMobile) {
    return null;
  }

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col h-screen bg-card border-r transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
              <span className="text-yellow-950 font-bold text-lg">S</span>
            </div>
            <span className="font-bold text-lg">Sliver</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(collapsed && 'mx-auto')}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <SidebarContent collapsed={collapsed} />
    </aside>
  );
}
