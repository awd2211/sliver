import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Info,
  Skull,
  Loader2,
  Radio,
  WifiOff,
  Clock,
  Monitor,
  User,
  Timer,
  ListTodo,
  RefreshCw,
  Play,
  Terminal,
  Zap,
  Settings2,
} from 'lucide-react';
import api from '@/lib/api';
import { BeaconTasksPanel } from '@/components/beacon-tasks';
import { BeaconCommandsPanel } from '@/components/beacon-commands';
import type { BeaconTask, ReconfigRequest } from '@/types';

export function BeaconDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('info');
  const [killDialogOpen, setKillDialogOpen] = useState(false);
  const [reconfigDialogOpen, setReconfigDialogOpen] = useState(false);
  const [reconfigData, setReconfigData] = useState<ReconfigRequest>({
    beaconInterval: 0,
    beaconJitter: 0,
    reconnectInterval: 0,
  });

  const { data: beaconData, isLoading, error } = useQuery({
    queryKey: ['beacon', id],
    queryFn: () => api.getBeacon(id!),
    enabled: !!id,
    refetchInterval: 5000,
  });

  // Used to get pending task count for the tab badge
  const { data: tasksData } = useQuery({
    queryKey: ['beacon-tasks', id],
    queryFn: () => api.getBeaconTasks(id!),
    enabled: !!id,
    refetchInterval: 5000,
  });

  const killMutation = useMutation({
    mutationFn: () => api.killBeacon(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beacons'] });
      navigate('/beacons');
    },
  });

  const interactiveMutation = useMutation({
    mutationFn: () => api.beaconInteractive(id!),
    onSuccess: (data) => {
      toast.success('Interactive session started', {
        description: 'Session will be available after next beacon check-in',
      });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      if (data.sessionId) {
        navigate(`/sessions/${data.sessionId}`);
      }
    },
    onError: (error: Error) => {
      toast.error('Failed to start interactive session', {
        description: error.message,
      });
    },
  });

  const reconfigMutation = useMutation({
    mutationFn: (req: ReconfigRequest) => api.reconfigBeacon(id!, req),
    onSuccess: () => {
      toast.success('Reconfig task queued', {
        description: 'Beacon will be reconfigured on next check-in',
      });
      setReconfigDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['beacon', id] });
      queryClient.invalidateQueries({ queryKey: ['beacon-tasks', id] });
    },
    onError: (error: Error) => {
      toast.error('Failed to queue reconfig task', {
        description: error.message,
      });
    },
  });

  const openReconfigDialog = () => {
    if (beacon) {
      setReconfigData({
        beaconInterval: beacon.interval,
        beaconJitter: beacon.jitter,
        reconnectInterval: beacon.interval,
      });
    }
    setReconfigDialogOpen(true);
  };

  const handleReconfig = () => {
    reconfigMutation.mutate(reconfigData);
  };

  const beacon = beaconData?.beacon;
  const tasks = tasksData?.tasks ?? [];

  const getOsIcon = (os: string) => {
    const osLower = os.toLowerCase();
    if (osLower.includes('windows')) return '🪟';
    if (osLower.includes('linux')) return '🐧';
    if (osLower.includes('darwin') || osLower.includes('macos')) return '🍎';
    return '💻';
  };

  const formatLastCheckin = (lastCheckin: string) => {
    const date = new Date(lastCheckin);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);

    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    return `${Math.floor(diffSeconds / 86400)}d ago`;
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const formatNextCheckin = (nextCheckin: string) => {
    const date = new Date(nextCheckin);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);

    if (diffSeconds < 0) return 'Overdue';
    if (diffSeconds < 60) return `in ${diffSeconds}s`;
    if (diffSeconds < 3600) return `in ${Math.floor(diffSeconds / 60)}m`;
    return `in ${Math.floor(diffSeconds / 3600)}h`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  if (error || !beacon) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/beacons')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Beacons
        </Button>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Failed to load beacon</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/beacons')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getOsIcon(beacon.os)}</span>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                {beacon.name}
                {beacon.isDead ? (
                  <WifiOff className="h-5 w-5 text-destructive" />
                ) : (
                  <Radio className="h-5 w-5 text-blue-500 animate-pulse" />
                )}
              </h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                {beacon.hostname}
                <span className="text-muted-foreground">|</span>
                <User className="h-4 w-4" />
                {beacon.username}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={openReconfigDialog}
            disabled={beacon.isDead}
          >
            <Settings2 className="h-4 w-4 mr-2" />
            Reconfig
          </Button>
          <Button
            size="sm"
            onClick={() => interactiveMutation.mutate()}
            disabled={beacon.isDead || interactiveMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {interactiveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            Interactive
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setKillDialogOpen(true)}
            disabled={beacon.isDead}
          >
            <Skull className="h-4 w-4 mr-2" />
            Kill Beacon
          </Button>
        </div>
      </div>

      {/* Quick Info Bar */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">
          {beacon.os}/{beacon.arch}
        </Badge>
        <Badge variant="outline">{beacon.transport}</Badge>
        <Badge variant="outline" className="font-mono">
          PID: {beacon.pid}
        </Badge>
        <Badge variant="outline" className="font-mono">
          {beacon.remoteAddress}
        </Badge>
        <Badge variant="outline" className="flex items-center gap-1">
          <Timer className="h-3 w-3" />
          {formatDuration(beacon.interval)} ± {beacon.jitter}%
        </Badge>
        <Badge variant="outline" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatLastCheckin(beacon.lastCheckin)}
        </Badge>
        <Badge variant={beacon.isDead ? 'destructive' : 'default'} className="flex items-center gap-1">
          <RefreshCw className="h-3 w-3" />
          Next: {formatNextCheckin(beacon.nextCheckin)}
        </Badge>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-fit">
          <TabsTrigger value="info" className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            Info
          </TabsTrigger>
          <TabsTrigger value="commands" className="flex items-center gap-2" disabled={beacon.isDead}>
            <Terminal className="h-4 w-4" />
            Commands
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2" disabled={beacon.isDead}>
            <ListTodo className="h-4 w-4" />
            Tasks
            {tasks.filter((t: BeaconTask) => t.status === 'pending').length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {tasks.filter((t: BeaconTask) => t.status === 'pending').length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 mt-4 min-h-0">
          {/* Info Tab */}
          <TabsContent value="info" className="h-full m-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Beacon Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Beacon ID</p>
                      <p className="font-mono text-xs break-all">{beacon.id}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <Badge variant={beacon.isDead ? 'destructive' : 'default'}>
                        {beacon.isDead ? 'Dead' : 'Active'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Hostname</p>
                      <p>{beacon.hostname}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Username</p>
                      <p>{beacon.username}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">OS</p>
                      <p>{beacon.os}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Architecture</p>
                      <p>{beacon.arch}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Transport</p>
                      <p>{beacon.transport}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Process ID</p>
                      <p>{beacon.pid}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Remote Address</p>
                      <p className="font-mono text-xs">{beacon.remoteAddress}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Check-in</p>
                      <p>{new Date(beacon.lastCheckin).toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Timing Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Interval</p>
                      <p className="text-lg font-medium">{formatDuration(beacon.interval)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Jitter</p>
                      <p className="text-lg font-medium">{beacon.jitter}%</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Next Check-in</p>
                      <p className="text-lg font-medium">{new Date(beacon.nextCheckin).toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">
                        ({formatNextCheckin(beacon.nextCheckin)})
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Radio className="h-5 w-5 text-blue-500" />
                    Beacon vs Session
                  </CardTitle>
                  <CardDescription>
                    Understanding beacon behavior
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Radio className="h-4 w-4 text-blue-500" />
                        Beacon Mode
                      </h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• Commands are queued as tasks</li>
                        <li>• Tasks execute on next check-in</li>
                        <li>• Lower network traffic footprint</li>
                        <li>• Better for stealth operations</li>
                        <li>• Interval: {formatDuration(beacon.interval)}</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Play className="h-4 w-4 text-green-500" />
                        Interactive Session
                      </h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• Real-time command execution</li>
                        <li>• Immediate response to commands</li>
                        <li>• Constant network connection</li>
                        <li>• Best for active engagement</li>
                        <li>• Use "Interactive" to convert</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Commands Tab */}
          <TabsContent value="commands" className="h-full m-0 overflow-auto">
            <BeaconCommandsPanel beaconId={id!} isDead={beacon.isDead} />
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="h-full m-0">
            <BeaconTasksPanel beaconId={id!} />
          </TabsContent>
        </div>
      </Tabs>

      {/* Kill Beacon Dialog */}
      <Dialog open={killDialogOpen} onOpenChange={setKillDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kill Beacon</DialogTitle>
            <DialogDescription>
              Are you sure you want to kill beacon "{beacon.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKillDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => killMutation.mutate()}
              disabled={killMutation.isPending}
            >
              {killMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Killing...
                </>
              ) : (
                <>
                  <Skull className="h-4 w-4 mr-2" />
                  Kill Beacon
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reconfig Beacon Dialog */}
      <Dialog open={reconfigDialogOpen} onOpenChange={setReconfigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reconfigure Beacon</DialogTitle>
            <DialogDescription>
              Change beacon timing parameters. Changes will take effect on the next check-in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="beaconInterval">Beacon Interval (seconds)</Label>
                <Input
                  id="beaconInterval"
                  type="number"
                  min={1}
                  value={reconfigData.beaconInterval}
                  onChange={(e) =>
                    setReconfigData((prev) => ({
                      ...prev,
                      beaconInterval: parseInt(e.target.value) || 0,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Current: {formatDuration(beacon.interval)}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="beaconJitter">Jitter (%)</Label>
                <Input
                  id="beaconJitter"
                  type="number"
                  min={0}
                  max={100}
                  value={reconfigData.beaconJitter}
                  onChange={(e) =>
                    setReconfigData((prev) => ({
                      ...prev,
                      beaconJitter: parseInt(e.target.value) || 0,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Current: {beacon.jitter}%
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reconnectInterval">Reconnect Interval (seconds)</Label>
              <Input
                id="reconnectInterval"
                type="number"
                min={1}
                value={reconfigData.reconnectInterval}
                onChange={(e) =>
                  setReconfigData((prev) => ({
                    ...prev,
                    reconnectInterval: parseInt(e.target.value) || 0,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Time to wait before reconnecting after connection loss
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReconfigDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReconfig}
              disabled={reconfigMutation.isPending}
            >
              {reconfigMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Queuing...
                </>
              ) : (
                <>
                  <Settings2 className="h-4 w-4 mr-2" />
                  Queue Reconfig
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
