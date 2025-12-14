import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Activity,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Shield,
  Eye,
  Wifi,
  WifiOff,
  Radio,
  Bird,
  Server,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Skull,
  UserCheck,
  UserX,
} from 'lucide-react';
import api from '@/lib/api';
import { format, formatDistanceToNow } from 'date-fns';
import type { ActivityEvent, Canary } from '@/types';

export function Monitor() {
  // Fetch canaries for threat alerts
  const { data: canariesData, isLoading: canariesLoading } = useQuery({
    queryKey: ['canaries'],
    queryFn: () => api.getCanaries(),
    refetchInterval: 10000,
  });

  // Fetch activity feed
  const { data: activityData, isLoading: activityLoading, refetch } = useQuery({
    queryKey: ['activity-feed'],
    queryFn: () => api.getActivityFeed(50),
    refetchInterval: 5000,
  });

  // Fetch dashboard stats
  const { data: statsData } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.getDashboardStats(),
    refetchInterval: 10000,
  });

  const canaries = canariesData?.canaries ?? [];
  const events = activityData?.events ?? [];
  const stats = statsData?.stats;

  const triggeredCanaries = canaries.filter((c: Canary) => c.triggered);
  const recentEvents = events.slice(0, 20);

  // Calculate threat level
  const getThreatLevel = () => {
    if (triggeredCanaries.length > 0) return 'critical';
    const recentDisconnects = events.filter(
      (e: ActivityEvent) =>
        (e.type === 'session_disconnect' || e.type === 'beacon_disconnect') &&
        new Date(e.timestamp).getTime() > Date.now() - 3600000
    ).length;
    if (recentDisconnects >= 3) return 'warning';
    return 'normal';
  };

  const threatLevel = getThreatLevel();

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'session_connect':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'session_disconnect':
        return <WifiOff className="h-4 w-4 text-red-500" />;
      case 'beacon_connect':
        return <Radio className="h-4 w-4 text-blue-500" />;
      case 'beacon_disconnect':
        return <Radio className="h-4 w-4 text-red-500" />;
      case 'job_started':
        return <Server className="h-4 w-4 text-green-500" />;
      case 'job_stopped':
        return <Server className="h-4 w-4 text-muted-foreground" />;
      case 'implant_built':
        return <Shield className="h-4 w-4 text-purple-500" />;
      case 'canary_triggered':
        return <Bird className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getEventBadgeVariant = (type: string) => {
    if (type.includes('disconnect') || type === 'canary_triggered') return 'destructive';
    if (type.includes('connect') || type === 'job_started') return 'default';
    return 'secondary';
  };

  const isLoading = canariesLoading || activityLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Eye className="h-8 w-8 text-yellow-500" />
            Threat Monitor
          </h1>
          <p className="text-muted-foreground">
            Real-time security monitoring and threat intelligence
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Threat Level Indicator */}
      <Card className={`border-2 ${
        threatLevel === 'critical'
          ? 'border-red-500 bg-red-500/5'
          : threatLevel === 'warning'
          ? 'border-yellow-500 bg-yellow-500/5'
          : 'border-green-500 bg-green-500/5'
      }`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className={`flex items-center gap-2 ${
              threatLevel === 'critical'
                ? 'text-red-600'
                : threatLevel === 'warning'
                ? 'text-yellow-600'
                : 'text-green-600'
            }`}>
              {threatLevel === 'critical' ? (
                <>
                  <AlertTriangle className="h-6 w-6" />
                  CRITICAL THREAT DETECTED
                </>
              ) : threatLevel === 'warning' ? (
                <>
                  <AlertCircle className="h-6 w-6" />
                  WARNING - Anomalous Activity
                </>
              ) : (
                <>
                  <CheckCircle className="h-6 w-6" />
                  NORMAL - No Threats Detected
                </>
              )}
            </CardTitle>
            <Badge variant={
              threatLevel === 'critical'
                ? 'destructive'
                : threatLevel === 'warning'
                ? 'outline'
                : 'default'
            } className="text-lg px-4 py-1">
              {threatLevel.toUpperCase()}
            </Badge>
          </div>
          <CardDescription className={
            threatLevel === 'critical'
              ? 'text-red-600/80'
              : threatLevel === 'warning'
              ? 'text-yellow-600/80'
              : 'text-green-600/80'
          }>
            {threatLevel === 'critical'
              ? `${triggeredCanaries.length} canary alert${triggeredCanaries.length > 1 ? 's' : ''} - Possible implant analysis detected`
              : threatLevel === 'warning'
              ? 'Multiple session disconnections detected recently'
              : 'All systems operating normally'}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              Active Sessions
            </CardDescription>
            <CardTitle className="text-2xl">{stats?.sessions ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Radio className="h-4 w-4" />
              Active Beacons
            </CardDescription>
            <CardTitle className="text-2xl">{stats?.beacons ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Bird className="h-4 w-4" />
              Canary Alerts
            </CardDescription>
            <CardTitle className={`text-2xl ${triggeredCanaries.length > 0 ? 'text-red-600' : ''}`}>
              {triggeredCanaries.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Events (24h)
            </CardDescription>
            <CardTitle className="text-2xl">{events.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Canary Alerts */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bird className="h-5 w-5 text-yellow-500" />
              Canary Alerts
            </CardTitle>
            <CardDescription>
              DNS canary triggers indicating potential implant analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {canariesLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : triggeredCanaries.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mb-4 text-green-500 opacity-50" />
                <p className="font-medium">No Canary Alerts</p>
                <p className="text-sm">All canaries are safe</p>
              </div>
            ) : (
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {triggeredCanaries.map((canary: Canary) => (
                    <div
                      key={canary.id}
                      className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          TRIGGERED
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {canary.triggeredCount}x
                        </span>
                      </div>
                      <p className="font-medium text-sm">{canary.implantName}</p>
                      <code className="text-xs text-muted-foreground">{canary.domain}</code>
                      {canary.latestTrigger && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Last triggered: {formatDistanceToNow(new Date(canary.latestTrigger))} ago
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Connection Monitor */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              Connection Monitor
            </CardTitle>
            <CardDescription>
              Real-time session and beacon connections
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {activityLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {recentEvents
                    .filter((e: ActivityEvent) =>
                      e.type.includes('session') || e.type.includes('beacon')
                    )
                    .slice(0, 15)
                    .map((event: ActivityEvent) => (
                      <div
                        key={event.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                      >
                        {event.type.includes('connect') && !event.type.includes('disconnect') ? (
                          <UserCheck className="h-4 w-4 text-green-500" />
                        ) : (
                          <UserX className="h-4 w-4 text-red-500" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{event.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(event.timestamp))} ago
                          </p>
                        </div>
                        <Badge variant={getEventBadgeVariant(event.type)} className="text-xs">
                          {event.type.includes('session') ? 'Session' : 'Beacon'}
                        </Badge>
                      </div>
                    ))}
                  {recentEvents.filter((e: ActivityEvent) =>
                    e.type.includes('session') || e.type.includes('beacon')
                  ).length === 0 && (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                      <Activity className="h-12 w-12 mb-4 opacity-50" />
                      <p className="font-medium">No Connection Activity</p>
                      <p className="text-sm">Waiting for connections...</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Activity Log
          </CardTitle>
          <CardDescription>
            Complete event history for monitoring and forensics
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {activityLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No events recorded</p>
              <p className="text-sm">Events will appear here as activity occurs</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Type</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead className="w-[200px]">Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event: ActivityEvent) => (
                    <TableRow
                      key={event.id}
                      className={
                        event.type === 'canary_triggered'
                          ? 'bg-red-500/5'
                          : event.type.includes('disconnect')
                          ? 'bg-red-500/5'
                          : ''
                      }
                    >
                      <TableCell>
                        {getEventIcon(event.type)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={getEventBadgeVariant(event.type)} className="text-xs">
                            {event.type.replace(/_/g, ' ').toUpperCase()}
                          </Badge>
                          <span className="text-sm">{event.message}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(event.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Security Best Practices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-blue-500" />
            Security Monitoring Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Bird className="h-4 w-4 text-yellow-500" />
                Canary Alerts
              </h4>
              <ul className="space-y-1 text-xs">
                <li>- Investigate triggered canaries immediately</li>
                <li>- May indicate sandbox analysis or reverse engineering</li>
                <li>- Consider rotating affected implants</li>
              </ul>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Skull className="h-4 w-4 text-red-500" />
                Session Loss
              </h4>
              <ul className="space-y-1 text-xs">
                <li>- Multiple disconnects may indicate detection</li>
                <li>- Check for EDR/AV alerts on target</li>
                <li>- Consider using more covert techniques</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
