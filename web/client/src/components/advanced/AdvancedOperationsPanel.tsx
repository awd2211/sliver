import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Plus,
  Trash2,
  HardDrive,
  FileSymlink,
  Settings2,
  Syringe,
  Server,
  Shield,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import type {
  Memfile,
  MountInfo,
  ReconfigRequest,
  BackdoorRequest,
  DllHijackRequest,
  PsExecRequest,
} from '@/types';

interface AdvancedOperationsPanelProps {
  sessionId: string;
  isWindows: boolean;
}

export function AdvancedOperationsPanel({ sessionId, isWindows }: AdvancedOperationsPanelProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('memfiles');

  // Memfiles state
  const [addMemfileDialogOpen, setAddMemfileDialogOpen] = useState(false);

  // Reconfig state
  const [reconnectInterval, setReconnectInterval] = useState('60');
  const [beaconInterval, setBeaconInterval] = useState('60');
  const [beaconJitter, setBeaconJitter] = useState('30');

  // Backdoor state
  const [backdoorFilePath, setBackdoorFilePath] = useState('');
  const [backdoorProfile, setBackdoorProfile] = useState('');

  // DLL Hijack state
  const [dllHijackTargetPath, setDllHijackTargetPath] = useState('');
  const [dllHijackReferencePath, setDllHijackReferencePath] = useState('');
  const [dllHijackReferenceDll, setDllHijackReferenceDll] = useState('');
  const [dllHijackProfile, setDllHijackProfile] = useState('');

  // PsExec state
  const [psExecHostname, setPsExecHostname] = useState('');
  const [psExecExePath, setPsExecExePath] = useState('');
  const [psExecServiceName, setPsExecServiceName] = useState('');
  const [psExecProfile, setPsExecProfile] = useState('');

  // Queries
  const { data: memfilesData, isLoading: memfilesLoading, refetch: refetchMemfiles } = useQuery({
    queryKey: ['memfiles', sessionId],
    queryFn: () => api.getMemfiles(sessionId),
    enabled: activeTab === 'memfiles',
  });

  const { data: mountsData, isLoading: mountsLoading, refetch: refetchMounts } = useQuery({
    queryKey: ['mounts', sessionId],
    queryFn: () => api.getMounts(sessionId),
    enabled: activeTab === 'mounts',
  });

  const { data: profilesData } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => api.getProfiles(),
  });

  // Mutations
  const addMemfileMutation = useMutation({
    mutationFn: () => api.createMemfile(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memfiles', sessionId] });
      toast.success('Memfile created successfully');
      setAddMemfileDialogOpen(false);
    },
    onError: (err: Error) => {
      toast.error(`Failed to create memfile: ${err.message}`);
    },
  });

  const removeMemfileMutation = useMutation({
    mutationFn: (fd: number) => api.deleteMemfile(sessionId, fd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memfiles', sessionId] });
      toast.success('Memfile removed');
    },
    onError: (err: Error) => {
      toast.error(`Failed to remove memfile: ${err.message}`);
    },
  });

  const reconfigMutation = useMutation({
    mutationFn: (req: ReconfigRequest) => api.reconfig(sessionId, req),
    onSuccess: () => {
      toast.success('Implant reconfigured successfully');
    },
    onError: (err: Error) => {
      toast.error(`Reconfig failed: ${err.message}`);
    },
  });

  const backdoorMutation = useMutation({
    mutationFn: (req: BackdoorRequest) => api.backdoor(sessionId, req),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Backdoor injected successfully at ${result.path}`);
      } else {
        toast.error('Backdoor injection failed');
      }
    },
    onError: (err: Error) => {
      toast.error(`Backdoor failed: ${err.message}`);
    },
  });

  const dllHijackMutation = useMutation({
    mutationFn: (req: DllHijackRequest) => api.dllHijack(sessionId, req),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`DLL Hijack successful: ${result.hijackedPath}`);
      } else {
        toast.error('DLL Hijack failed');
      }
    },
    onError: (err: Error) => {
      toast.error(`DLL Hijack failed: ${err.message}`);
    },
  });

  const psExecMutation = useMutation({
    mutationFn: (req: PsExecRequest) => api.psexec(sessionId, req),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`PsExec successful! Session: ${result.sessionId}`);
      } else {
        toast.error(`PsExec failed: ${result.error}`);
      }
    },
    onError: (err: Error) => {
      toast.error(`PsExec failed: ${err.message}`);
    },
  });

  const memfiles = memfilesData?.memfiles || [];
  const mounts = mountsData?.mounts || [];
  const profiles = profilesData?.profiles || [];

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="memfiles" className="flex items-center gap-2">
            <FileSymlink className="h-4 w-4" />
            Memfiles
          </TabsTrigger>
          <TabsTrigger value="mounts" className="flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            Mounts
          </TabsTrigger>
          <TabsTrigger value="reconfig" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Reconfig
          </TabsTrigger>
          {isWindows && (
            <>
              <TabsTrigger value="backdoor" className="flex items-center gap-2">
                <Syringe className="h-4 w-4" />
                Backdoor
              </TabsTrigger>
              <TabsTrigger value="dllhijack" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                DLL Hijack
              </TabsTrigger>
              <TabsTrigger value="psexec" className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                PsExec
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* Memfiles Tab */}
        <TabsContent value="memfiles">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileSymlink className="h-4 w-4" />
                    Memory Files ({memfiles.length})
                  </CardTitle>
                  <CardDescription>
                    In-memory file descriptors for stealthy file operations
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => refetchMemfiles()}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button size="sm" onClick={() => setAddMemfileDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {memfilesLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : memfiles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No memory files loaded
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>FD</TableHead>
                      <TableHead>Path</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {memfiles.map((mf: Memfile) => (
                      <TableRow key={mf.fd}>
                        <TableCell className="font-mono">{mf.fd}</TableCell>
                        <TableCell className="font-mono text-xs max-w-[300px] truncate">
                          {mf.path}
                        </TableCell>
                        <TableCell>{formatBytes(mf.size)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeMemfileMutation.mutate(mf.fd)}
                            disabled={removeMemfileMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mounts Tab */}
        <TabsContent value="mounts">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <HardDrive className="h-4 w-4" />
                    Mounted Filesystems ({mounts.length})
                  </CardTitle>
                  <CardDescription>
                    View mounted drives and disk usage
                  </CardDescription>
                </div>
                <Button variant="outline" size="icon" onClick={() => refetchMounts()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {mountsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : mounts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No mount information available
                </div>
              ) : (
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-4">
                    {mounts.map((mount: MountInfo, idx: number) => {
                      const usedPercent = mount.total > 0 ? (mount.used / mount.total) * 100 : 0;
                      return (
                        <div key={idx} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-medium">{mount.mountPoint}</p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {mount.device} ({mount.fsType})
                              </p>
                            </div>
                            <Badge variant="outline">{mount.options.join(', ')}</Badge>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Used</span>
                              <span>{formatBytes(mount.used)} / {formatBytes(mount.total)}</span>
                            </div>
                            <Progress value={usedPercent} className="h-2" />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>{usedPercent.toFixed(1)}% used</span>
                              <span>{formatBytes(mount.free)} free</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reconfig Tab */}
        <TabsContent value="reconfig">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings2 className="h-4 w-4" />
                Implant Reconfiguration
              </CardTitle>
              <CardDescription>
                Modify implant communication intervals on-the-fly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="reconnectInterval">Reconnect Interval (seconds)</Label>
                  <Input
                    id="reconnectInterval"
                    type="number"
                    value={reconnectInterval}
                    onChange={(e) => setReconnectInterval(e.target.value)}
                    placeholder="60"
                  />
                  <p className="text-xs text-muted-foreground">
                    Time between reconnection attempts
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="beaconInterval">Beacon Interval (seconds)</Label>
                  <Input
                    id="beaconInterval"
                    type="number"
                    value={beaconInterval}
                    onChange={(e) => setBeaconInterval(e.target.value)}
                    placeholder="60"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="beaconJitter">Beacon Jitter (%)</Label>
                  <Input
                    id="beaconJitter"
                    type="number"
                    value={beaconJitter}
                    onChange={(e) => setBeaconJitter(e.target.value)}
                    placeholder="30"
                    min="0"
                    max="100"
                  />
                </div>
                <Button
                  onClick={() =>
                    reconfigMutation.mutate({
                      reconnectInterval: parseInt(reconnectInterval),
                      beaconInterval: parseInt(beaconInterval),
                      beaconJitter: parseInt(beaconJitter),
                    })
                  }
                  disabled={reconfigMutation.isPending}
                >
                  {reconfigMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Apply Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backdoor Tab (Windows) */}
        {isWindows && (
          <TabsContent value="backdoor">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Syringe className="h-4 w-4" />
                  Backdoor Injection
                </CardTitle>
                <CardDescription>
                  Inject an implant into an existing executable file
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-w-md">
                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm">
                    <p className="font-medium text-yellow-500">Warning</p>
                    <p className="text-muted-foreground mt-1">
                      This operation will modify the target file. Ensure you have a backup.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="backdoorFilePath">Target File Path</Label>
                    <Input
                      id="backdoorFilePath"
                      value={backdoorFilePath}
                      onChange={(e) => setBackdoorFilePath(e.target.value)}
                      placeholder="C:\Windows\notepad.exe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="backdoorProfile">Implant Profile</Label>
                    <Select value={backdoorProfile} onValueChange={setBackdoorProfile}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a profile" />
                      </SelectTrigger>
                      <SelectContent>
                        {profiles.map((p) => (
                          <SelectItem key={p.name} value={p.name}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() =>
                      backdoorMutation.mutate({
                        remotePath: backdoorFilePath,
                        profileName: backdoorProfile,
                      })
                    }
                    disabled={backdoorMutation.isPending || !backdoorFilePath || !backdoorProfile}
                  >
                    {backdoorMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Inject Backdoor
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* DLL Hijack Tab (Windows) */}
        {isWindows && (
          <TabsContent value="dllhijack">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-4 w-4" />
                  DLL Hijacking
                </CardTitle>
                <CardDescription>
                  Plant a malicious DLL for privilege escalation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label htmlFor="dllHijackTargetPath">Target Executable Path</Label>
                    <Input
                      id="dllHijackTargetPath"
                      value={dllHijackTargetPath}
                      onChange={(e) => setDllHijackTargetPath(e.target.value)}
                      placeholder="C:\Program Files\App\app.exe"
                    />
                    <p className="text-xs text-muted-foreground">
                      The executable that loads the target DLL
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dllHijackReferencePath">Reference DLL Path</Label>
                    <Input
                      id="dllHijackReferencePath"
                      value={dllHijackReferencePath}
                      onChange={(e) => setDllHijackReferencePath(e.target.value)}
                      placeholder="C:\Program Files\App\"
                    />
                    <p className="text-xs text-muted-foreground">
                      Directory where the hijacked DLL will be placed
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dllHijackReferenceDll">Reference DLL Name</Label>
                    <Input
                      id="dllHijackReferenceDll"
                      value={dllHijackReferenceDll}
                      onChange={(e) => setDllHijackReferenceDll(e.target.value)}
                      placeholder="version.dll"
                    />
                    <p className="text-xs text-muted-foreground">
                      A legitimate DLL to proxy exports from
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dllHijackProfile">Implant Profile</Label>
                    <Select value={dllHijackProfile} onValueChange={setDllHijackProfile}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a profile" />
                      </SelectTrigger>
                      <SelectContent>
                        {profiles.map((p) => (
                          <SelectItem key={p.name} value={p.name}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() =>
                      dllHijackMutation.mutate({
                        targetPath: dllHijackTargetPath,
                        referencePath: dllHijackReferencePath,
                        referenceDll: dllHijackReferenceDll,
                        profileName: dllHijackProfile,
                      })
                    }
                    disabled={
                      dllHijackMutation.isPending ||
                      !dllHijackTargetPath ||
                      !dllHijackReferencePath ||
                      !dllHijackReferenceDll ||
                      !dllHijackProfile
                    }
                  >
                    {dllHijackMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Hijack DLL
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* PsExec Tab (Windows) */}
        {isWindows && (
          <TabsContent value="psexec">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Server className="h-4 w-4" />
                  PsExec - Remote Execution
                </CardTitle>
                <CardDescription>
                  Execute an implant on a remote host via SMB
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label htmlFor="psExecHostname">Target Hostname/IP</Label>
                    <Input
                      id="psExecHostname"
                      value={psExecHostname}
                      onChange={(e) => setPsExecHostname(e.target.value)}
                      placeholder="192.168.1.100 or WORKSTATION01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="psExecExePath">Executable Path</Label>
                    <Input
                      id="psExecExePath"
                      value={psExecExePath}
                      onChange={(e) => setPsExecExePath(e.target.value)}
                      placeholder="C:\Windows\Temp\implant.exe"
                    />
                    <p className="text-xs text-muted-foreground">
                      Path to the executable on the remote host
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="psExecServiceName">Service Name (optional)</Label>
                    <Input
                      id="psExecServiceName"
                      value={psExecServiceName}
                      onChange={(e) => setPsExecServiceName(e.target.value)}
                      placeholder="SliverSvc"
                    />
                    <p className="text-xs text-muted-foreground">
                      Custom service name for the remote execution
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="psExecProfile">Implant Profile (optional)</Label>
                    <Select value={psExecProfile} onValueChange={setPsExecProfile}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a profile" />
                      </SelectTrigger>
                      <SelectContent>
                        {profiles.map((p) => (
                          <SelectItem key={p.name} value={p.name}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() =>
                      psExecMutation.mutate({
                        hostname: psExecHostname,
                        exe: psExecExePath,
                        service: psExecServiceName || undefined,
                        profile: psExecProfile || undefined,
                      })
                    }
                    disabled={psExecMutation.isPending || !psExecHostname || !psExecExePath}
                    className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950"
                  >
                    {psExecMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Execute Remotely
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Add Memfile Dialog */}
      <Dialog open={addMemfileDialogOpen} onOpenChange={setAddMemfileDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Memory File</DialogTitle>
            <DialogDescription>
              Create a new in-memory file descriptor for stealthy file operations
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will create an empty memory-backed file descriptor that can be used
              for file operations without touching the disk.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMemfileDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => addMemfileMutation.mutate()}
              disabled={addMemfileMutation.isPending}
            >
              {addMemfileMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Memfile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
