import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Terminal,
  Radio,
  Server,
  Package,
  Monitor,
  Key,
  FileBox,
  Activity,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  Bird,
} from 'lucide-react';
import api from '@/lib/api';
import type { ActivityEvent } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  href?: string;
  trend?: { value: number; isUp: boolean };
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

function StatCard({ title, value, description, icon: Icon, href, trend, variant = 'default' }: StatCardProps) {
  const variantStyles = {
    default: 'text-muted-foreground',
    success: 'text-green-500',
    warning: 'text-yellow-500',
    danger: 'text-red-500',
  };

  const content = (
    <Card className={href ? 'hover:bg-accent/50 transition-colors cursor-pointer' : ''}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${variantStyles[variant]}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
        {trend && (
          <p className={`text-xs mt-1 ${trend.isUp ? 'text-green-500' : 'text-red-500'}`}>
            {trend.isUp ? '↑' : '↓'} {trend.value}% from last hour
          </p>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }

  return content;
}

function getEventIcon(type: ActivityEvent['type']) {
  switch (type) {
    case 'session_connect':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'session_disconnect':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'beacon_connect':
      return <Radio className="h-4 w-4 text-green-500" />;
    case 'beacon_disconnect':
      return <Radio className="h-4 w-4 text-red-500" />;
    case 'job_started':
      return <Zap className="h-4 w-4 text-blue-500" />;
    case 'job_stopped':
      return <XCircle className="h-4 w-4 text-yellow-500" />;
    case 'implant_built':
      return <Package className="h-4 w-4 text-purple-500" />;
    case 'canary_triggered':
      return <Bird className="h-4 w-4 text-red-500" />;
    default:
      return <Activity className="h-4 w-4 text-muted-foreground" />;
  }
}

function getEventBadge(type: ActivityEvent['type']) {
  const badges: Record<ActivityEvent['type'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    session_connect: { label: 'Session', variant: 'default' },
    session_disconnect: { label: 'Session', variant: 'destructive' },
    beacon_connect: { label: 'Beacon', variant: 'default' },
    beacon_disconnect: { label: 'Beacon', variant: 'destructive' },
    job_started: { label: 'Job', variant: 'secondary' },
    job_stopped: { label: 'Job', variant: 'outline' },
    implant_built: { label: 'Build', variant: 'secondary' },
    canary_triggered: { label: 'Canary', variant: 'destructive' },
  };

  const badge = badges[type];
  return <Badge variant={badge.variant}>{badge.label}</Badge>;
}

export function Dashboard() {
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats, isFetching: statsFetching } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.getDashboardStats(),
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const { data: activityData, isLoading: activityLoading, refetch: refetchActivity, isFetching: activityFetching } = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: () => api.getActivityFeed(20),
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const stats = statsData?.stats ?? {
    sessions: 0,
    beacons: 0,
    jobs: 0,
    implants: 0,
    hosts: 0,
    credentials: 0,
    loot: 0,
  };

  const events = activityData?.events ?? [];

  const handleRefresh = () => {
    refetchStats();
    refetchActivity();
  };

  const isRefreshing = statsFetching || activityFetching;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your Sliver C2 operations</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Active Implants Alert */}
      {(stats.sessions > 0 || stats.beacons > 0) && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardHeader className="py-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <CardTitle className="text-lg text-green-500">
                {stats.sessions + stats.beacons} Active Implant{stats.sessions + stats.beacons !== 1 ? 's' : ''}
              </CardTitle>
            </div>
            <CardDescription className="text-green-500/80">
              {stats.sessions} session{stats.sessions !== 1 ? 's' : ''}, {stats.beacons} beacon{stats.beacons !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Stats Grid */}
      {statsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Active Sessions"
              value={stats.sessions}
              description="Interactive shell sessions"
              icon={Terminal}
              href="/sessions"
              variant={stats.sessions > 0 ? 'success' : 'default'}
            />
            <StatCard
              title="Active Beacons"
              value={stats.beacons}
              description="Asynchronous implants"
              icon={Radio}
              href="/beacons"
              variant={stats.beacons > 0 ? 'success' : 'default'}
            />
            <StatCard
              title="Running Jobs"
              value={stats.jobs}
              description="Listeners and services"
              icon={Server}
              href="/jobs"
              variant={stats.jobs > 0 ? 'success' : 'default'}
            />
            <StatCard
              title="Implant Builds"
              value={stats.implants}
              description="Generated implants"
              icon={Package}
              href="/implants"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title="Hosts"
              value={stats.hosts}
              description="Compromised hosts"
              icon={Monitor}
              href="/hosts"
            />
            <StatCard
              title="Credentials"
              value={stats.credentials}
              description="Collected credentials"
              icon={Key}
              href="/credentials"
              variant={stats.credentials > 0 ? 'warning' : 'default'}
            />
            <StatCard
              title="Loot"
              value={stats.loot}
              description="Files and data"
              icon={FileBox}
              href="/loot"
            />
          </div>
        </>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Latest events from your operations</CardDescription>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No recent activity</p>
              <p className="text-sm">Events will appear here when implants connect</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {events.map((event) => (
                  <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="mt-0.5">
                      {getEventIcon(event.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getEventBadge(event.type)}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm">{event.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link to="/jobs">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Server className="h-4 w-4 text-yellow-500" />
                Start Listener
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Start a new MTLS, HTTP, HTTPS, or DNS listener</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/implants">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="h-4 w-4 text-yellow-500" />
                Generate Implant
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Build a new session or beacon implant</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/operators">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Operators
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">View connected operators and team status</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/canaries">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bird className="h-4 w-4 text-yellow-500" />
                Canaries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Monitor DNS canary triggers and alerts</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
