import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Terminal,
  Folder,
  Cpu,
  Network,
  Info,
  Camera,
  Play,
  Skull,
  Loader2,
  Wifi,
  WifiOff,
  Clock,
  Monitor,
  User,
  Server,
  Globe,
  Shield,
  ArrowRightLeft,
  Variable,
  Database,
  Chrome,
  Code,
  Key,
  Cog,
  Wrench,
  Activity,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { ShellTerminal } from '@/components/terminal';
import { FileBrowser } from '@/components/files';
import { ProcessList } from '@/components/process';
import { PortForwardManager, ReversePortForwardManager, SocksProxyManager } from '@/components/network';
import { PrivilegePanel } from '@/components/privilege';
import { RegistryEditor } from '@/components/registry';
import { CursedPanel } from '@/components/cursed';
import { ExecutePanel } from '@/components/execute';
import { ScreenshotPanel } from '@/components/screenshot';
import { TasksPanel } from '@/components/tasks';
import { EnvironmentPanel } from '@/components/environment';
import { SSHPanel } from '@/components/ssh';
import { PivotsPanel } from '@/components/pivots';
import { ServicesPanel } from '@/components/services';
import { AdvancedOperationsPanel } from '@/components/advanced';
import type { NetworkInterface, SockTabEntry, ExecuteResult } from '@/types';

export function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('info');
  const [killDialogOpen, setKillDialogOpen] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const [pingLoading, setPingLoading] = useState(false);
  const [pingLatency, setPingLatency] = useState<number | null>(null);

  // Command execution state
  const [executeCmd, setExecuteCmd] = useState('');
  const [executeResult, setExecuteResult] = useState<ExecuteResult | null>(null);
  const [executeLoading, setExecuteLoading] = useState(false);


  const { data: sessionData, isLoading, error } = useQuery({
    queryKey: ['session', id],
    queryFn: () => api.getSession(id!),
    enabled: !!id,
    refetchInterval: 5000,
  });

  const { data: networkData } = useQuery({
    queryKey: ['network-interfaces', id],
    queryFn: () => api.getNetworkInterfaces(id!),
    enabled: !!id && activeTab === 'network',
  });

  const { data: netstatData } = useQuery({
    queryKey: ['netstat', id],
    queryFn: () => api.getNetstat(id!),
    enabled: !!id && activeTab === 'network',
  });

  const { data: sysInfoData } = useQuery({
    queryKey: ['system-info', id],
    queryFn: () => api.getSystemInfo(id!),
    enabled: !!id && activeTab === 'info',
  });


  const killMutation = useMutation({
    mutationFn: () => api.killSession(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      navigate('/sessions');
    },
  });

  const session = sessionData?.session;
  const networkInterfaces = networkData?.interfaces ?? [];
  const netstatEntries = netstatData?.entries ?? [];
  const systemInfo = sysInfoData?.info;

  const handlePing = async () => {
    if (!id) return;
    setPingLoading(true);
    setPingLatency(null);
    try {
      const startTime = Date.now();
      await api.ping(id);
      const latency = Date.now() - startTime;
      setPingLatency(latency);
      toast.success('Session responded', {
        description: `Latency: ${latency}ms`,
      });
    } catch (err) {
      toast.error('Ping failed', {
        description: err instanceof Error ? err.message : 'Session not responding',
      });
    } finally {
      setPingLoading(false);
    }
  };

  const handleTakeScreenshot = async () => {
    if (!id) return;
    setScreenshotLoading(true);
    try {
      const url = await api.takeScreenshot(id);
      setScreenshotUrl(url);
    } catch (err) {
      console.error('Screenshot failed:', err);
    } finally {
      setScreenshotLoading(false);
    }
  };

  const handleExecuteCommand = async () => {
    if (!id || !executeCmd.trim()) return;
    setExecuteLoading(true);
    setExecuteResult(null);
    try {
      const parts = executeCmd.trim().split(/\s+/);
      const path = parts[0];
      const args = parts.slice(1);
      const result = await api.executeCommand(id, path, args);
      setExecuteResult(result);
    } catch (err) {
      console.error('Execute failed:', err);
      setExecuteResult({
        stdout: '',
        stderr: err instanceof Error ? err.message : 'Command failed',
        status: -1,
      });
    } finally {
      setExecuteLoading(false);
    }
  };

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/sessions')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sessions
        </Button>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Failed to load session</p>
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
          <Button variant="ghost" onClick={() => navigate('/sessions')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getOsIcon(session.os)}</span>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                {session.name}
                {session.isDead ? (
                  <WifiOff className="h-5 w-5 text-destructive" />
                ) : (
                  <Wifi className="h-5 w-5 text-green-500" />
                )}
              </h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                {session.hostname}
                <span className="text-muted-foreground">|</span>
                <User className="h-4 w-4" />
                {session.username}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePing}
            disabled={session.isDead || pingLoading}
          >
            {pingLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Activity className="h-4 w-4 mr-2" />
            )}
            {pingLatency !== null ? `${pingLatency}ms` : 'Ping'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTakeScreenshot}
            disabled={session.isDead || screenshotLoading}
          >
            {screenshotLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Camera className="h-4 w-4 mr-2" />
            )}
            Screenshot
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setKillDialogOpen(true)}
            disabled={session.isDead}
          >
            <Skull className="h-4 w-4 mr-2" />
            Kill Session
          </Button>
        </div>
      </div>

      {/* Quick Info Bar */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">
          {session.os}/{session.arch}
        </Badge>
        <Badge variant="outline">{session.transport}</Badge>
        <Badge variant="outline" className="font-mono">
          PID: {session.pid}
        </Badge>
        <Badge variant="outline" className="font-mono">
          {session.remoteAddress}
        </Badge>
        <Badge variant="outline" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatLastCheckin(session.lastCheckin)}
        </Badge>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-fit flex-wrap">
          <TabsTrigger value="info" className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            Info
          </TabsTrigger>
          <TabsTrigger value="shell" className="flex items-center gap-2" disabled={session.isDead}>
            <Terminal className="h-4 w-4" />
            Shell
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-2" disabled={session.isDead}>
            <Folder className="h-4 w-4" />
            Files
          </TabsTrigger>
          <TabsTrigger value="processes" className="flex items-center gap-2" disabled={session.isDead}>
            <Cpu className="h-4 w-4" />
            Processes
          </TabsTrigger>
          <TabsTrigger value="network" className="flex items-center gap-2" disabled={session.isDead}>
            <Network className="h-4 w-4" />
            Network
          </TabsTrigger>
          <TabsTrigger value="pivots" className="flex items-center gap-2" disabled={session.isDead}>
            <ArrowRightLeft className="h-4 w-4" />
            Pivots
          </TabsTrigger>
          <TabsTrigger value="privesc" className="flex items-center gap-2" disabled={session.isDead}>
            <Shield className="h-4 w-4" />
            PrivEsc
          </TabsTrigger>
          <TabsTrigger value="execute" className="flex items-center gap-2" disabled={session.isDead}>
            <Play className="h-4 w-4" />
            Execute
          </TabsTrigger>
          <TabsTrigger value="code-exec" className="flex items-center gap-2" disabled={session.isDead}>
            <Code className="h-4 w-4" />
            Code Exec
          </TabsTrigger>
          {session.os.toLowerCase().includes('windows') && (
            <TabsTrigger value="registry" className="flex items-center gap-2" disabled={session.isDead}>
              <Database className="h-4 w-4" />
              Registry
            </TabsTrigger>
          )}
          <TabsTrigger value="cursed" className="flex items-center gap-2" disabled={session.isDead}>
            <Chrome className="h-4 w-4" />
            Cursed
          </TabsTrigger>
          {session.os.toLowerCase().includes('windows') && (
            <TabsTrigger value="services" className="flex items-center gap-2" disabled={session.isDead}>
              <Cog className="h-4 w-4" />
              Services
            </TabsTrigger>
          )}
          <TabsTrigger value="screenshots" className="flex items-center gap-2" disabled={session.isDead}>
            <Camera className="h-4 w-4" />
            Screenshots
          </TabsTrigger>
          <TabsTrigger value="environment" className="flex items-center gap-2" disabled={session.isDead}>
            <Variable className="h-4 w-4" />
            Env
          </TabsTrigger>
          <TabsTrigger value="ssh" className="flex items-center gap-2" disabled={session.isDead}>
            <Key className="h-4 w-4" />
            SSH
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2" disabled={session.isDead}>
            <Wrench className="h-4 w-4" />
            Advanced
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Tasks
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 mt-4 min-h-0">
          {/* Info Tab */}
          <TabsContent value="info" className="h-full m-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Session Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Session ID</p>
                      <p className="font-mono text-xs break-all">{session.id}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <Badge variant={session.isDead ? 'destructive' : 'default'}>
                        {session.isDead ? 'Dead' : 'Active'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Hostname</p>
                      <p>{session.hostname}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Username</p>
                      <p>{session.username}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">OS</p>
                      <p>{session.os}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Architecture</p>
                      <p>{session.arch}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Transport</p>
                      <p>{session.transport}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Process ID</p>
                      <p>{session.pid}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Remote Address</p>
                      <p className="font-mono text-xs">{session.remoteAddress}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Check-in</p>
                      <p>{new Date(session.lastCheckin).toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {systemInfo && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">System Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">UID</p>
                        <p className="font-mono">{systemInfo.uid}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">GID</p>
                        <p className="font-mono">{systemInfo.gid}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Screenshot Preview */}
              {screenshotUrl && (
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg">Latest Screenshot</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <img
                      src={screenshotUrl}
                      alt="Screenshot"
                      className="max-w-full rounded border"
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Shell Tab */}
          <TabsContent value="shell" className="h-full m-0">
            <ShellTerminal sessionId={id!} />
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="h-full m-0">
            <FileBrowser sessionId={id!} />
          </TabsContent>

          {/* Processes Tab */}
          <TabsContent value="processes" className="h-full m-0">
            <ProcessList sessionId={id!} currentPid={session.pid} />
          </TabsContent>

          {/* Network Tab */}
          <TabsContent value="network" className="h-full m-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    Network Interfaces
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="space-y-4">
                      {networkInterfaces.map((iface: NetworkInterface) => (
                        <div key={iface.index} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{iface.name}</span>
                            <Badge variant="outline">#{iface.index}</Badge>
                          </div>
                          <div className="text-sm space-y-1">
                            <p className="text-muted-foreground font-mono text-xs">
                              MAC: {iface.mac || 'N/A'}
                            </p>
                            {iface.ipAddresses.map((ip, idx) => (
                              <p key={idx} className="font-mono text-xs">
                                {ip}
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                      {networkInterfaces.length === 0 && (
                        <p className="text-muted-foreground text-center py-8">
                          No network interfaces found
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Active Connections
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="space-y-2">
                      {netstatEntries.map((entry: SockTabEntry, idx) => (
                        <div key={idx} className="p-2 border rounded text-xs font-mono">
                          <div className="flex justify-between">
                            <span>{entry.protocol.toUpperCase()}</span>
                            <Badge variant={entry.state === 'ESTABLISHED' ? 'default' : 'secondary'} className="text-xs">
                              {entry.state}
                            </Badge>
                          </div>
                          <div className="text-muted-foreground mt-1">
                            <p>{entry.localAddr} → {entry.remoteAddr}</p>
                            {entry.process && (
                              <p className="text-xs">
                                PID: {entry.pid} ({entry.process})
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      {netstatEntries.length === 0 && (
                        <p className="text-muted-foreground text-center py-8">
                          No active connections found
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Pivots Tab (Port Forwarding, SOCKS, Pivot Listeners) */}
          <TabsContent value="pivots" className="h-full m-0">
            <div className="grid grid-cols-1 gap-4">
              <PivotsPanel sessionId={id!} />
              <PortForwardManager sessionId={id!} />
              <ReversePortForwardManager sessionId={id!} />
              <SocksProxyManager sessionId={id!} />
            </div>
          </TabsContent>

          {/* Privilege Escalation Tab */}
          <TabsContent value="privesc" className="h-full m-0">
            <PrivilegePanel sessionId={id!} os={session.os} />
          </TabsContent>

          {/* Execute Tab */}
          <TabsContent value="execute" className="h-full m-0">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg">Execute Command</CardTitle>
                <CardDescription>
                  Execute a command on the remote system
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter command (e.g., whoami or /bin/ls -la)"
                    value={executeCmd}
                    onChange={(e) => setExecuteCmd(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleExecuteCommand();
                      }
                    }}
                    className="font-mono"
                  />
                  <Button
                    onClick={handleExecuteCommand}
                    disabled={executeLoading || !executeCmd.trim()}
                  >
                    {executeLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {executeResult && (
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-muted-foreground">Exit code:</span>
                      <Badge variant={executeResult.status === 0 ? 'default' : 'destructive'}>
                        {executeResult.status}
                      </Badge>
                    </div>
                    <ScrollArea className="h-[calc(100%-2rem)] bg-[#1a1b26] rounded-lg p-4">
                      {executeResult.stdout && (
                        <div className="mb-4">
                          <p className="text-xs text-green-400 mb-1">stdout:</p>
                          <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                            {executeResult.stdout}
                          </pre>
                        </div>
                      )}
                      {executeResult.stderr && (
                        <div>
                          <p className="text-xs text-red-400 mb-1">stderr:</p>
                          <pre className="text-sm text-red-300 whitespace-pre-wrap font-mono">
                            {executeResult.stderr}
                          </pre>
                        </div>
                      )}
                      {!executeResult.stdout && !executeResult.stderr && (
                        <p className="text-muted-foreground text-sm">No output</p>
                      )}
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Code Execution Tab */}
          <TabsContent value="code-exec" className="h-full m-0">
            <ExecutePanel sessionId={id!} os={session.os} arch={session.arch} />
          </TabsContent>

          {/* Registry Tab (Windows only) */}
          {session.os.toLowerCase().includes('windows') && (
            <TabsContent value="registry" className="h-full m-0">
              <RegistryEditor sessionId={id!} />
            </TabsContent>
          )}

          {/* Cursed Tab - Browser Manipulation */}
          <TabsContent value="cursed" className="h-full m-0">
            <CursedPanel sessionId={id!} />
          </TabsContent>

          {/* Services Tab (Windows only) */}
          {session.os.toLowerCase().includes('windows') && (
            <TabsContent value="services" className="h-full m-0">
              <ServicesPanel sessionId={id!} isWindows={true} />
            </TabsContent>
          )}

          {/* Screenshots Tab */}
          <TabsContent value="screenshots" className="h-full m-0">
            <ScreenshotPanel sessionId={id!} />
          </TabsContent>

          {/* Environment Tab */}
          <TabsContent value="environment" className="h-full m-0">
            <EnvironmentPanel sessionId={id!} />
          </TabsContent>

          {/* SSH Tab */}
          <TabsContent value="ssh" className="h-full m-0">
            <SSHPanel sessionId={id!} />
          </TabsContent>

          {/* Advanced Operations Tab */}
          <TabsContent value="advanced" className="h-full m-0">
            <AdvancedOperationsPanel
              sessionId={id!}
              isWindows={session.os.toLowerCase().includes('windows')}
            />
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="h-full m-0">
            <TasksPanel sessionId={id!} />
          </TabsContent>
        </div>
      </Tabs>

      {/* Kill Session Dialog */}
      <Dialog open={killDialogOpen} onOpenChange={setKillDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kill Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to kill session "{session.name}"? This action cannot be undone.
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
                  Kill Session
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
