import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  User,
  FolderOpen,
  FileText,
  List,
  Network,
  Cpu,
  Download,
  Terminal,
  Loader2,
  CheckCircle,
  HelpCircle,
  Play,
  ArrowRight,
} from 'lucide-react';
import api from '@/lib/api';
import type { BeaconTask } from '@/types';

interface BeaconCommandsPanelProps {
  beaconId: string;
  isDead?: boolean;
}

interface QuickCommand {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  requiresInput?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
}

const quickCommands: QuickCommand[] = [
  {
    id: 'whoami',
    name: 'Whoami',
    description: 'Get current user identity',
    icon: User,
    color: 'text-blue-500',
  },
  {
    id: 'pwd',
    name: 'PWD',
    description: 'Print working directory',
    icon: FolderOpen,
    color: 'text-yellow-500',
  },
  {
    id: 'ps',
    name: 'Process List',
    description: 'List running processes',
    icon: Cpu,
    color: 'text-purple-500',
  },
  {
    id: 'ifconfig',
    name: 'Network Info',
    description: 'Get network interfaces',
    icon: Network,
    color: 'text-green-500',
  },
  {
    id: 'netstat',
    name: 'Netstat',
    description: 'List network connections',
    icon: Network,
    color: 'text-cyan-500',
  },
  {
    id: 'cd',
    name: 'Change Dir',
    description: 'Change working directory',
    icon: ArrowRight,
    color: 'text-amber-500',
    requiresInput: true,
    inputLabel: 'Path',
    inputPlaceholder: 'C:\\Users or /home',
  },
  {
    id: 'ls',
    name: 'List Files',
    description: 'List directory contents',
    icon: List,
    color: 'text-orange-500',
    requiresInput: true,
    inputLabel: 'Path',
    inputPlaceholder: 'C:\\ or /home',
  },
  {
    id: 'cat',
    name: 'Read File',
    description: 'Read file contents',
    icon: FileText,
    color: 'text-pink-500',
    requiresInput: true,
    inputLabel: 'File Path',
    inputPlaceholder: '/etc/passwd',
  },
  {
    id: 'download',
    name: 'Download',
    description: 'Download file from target',
    icon: Download,
    color: 'text-emerald-500',
    requiresInput: true,
    inputLabel: 'File Path',
    inputPlaceholder: '/path/to/file',
  },
];

export function BeaconCommandsPanel({ beaconId, isDead = false }: BeaconCommandsPanelProps) {
  const queryClient = useQueryClient();
  const [selectedCommand, setSelectedCommand] = useState<QuickCommand | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [executingCommand, setExecutingCommand] = useState<string | null>(null);
  const [recentTasks, setRecentTasks] = useState<BeaconTask[]>([]);

  // Execute command states
  const [execPath, setExecPath] = useState('');
  const [execArgs, setExecArgs] = useState('');
  const [execOutput, setExecOutput] = useState(true);

  const invalidateTasks = () => {
    queryClient.invalidateQueries({ queryKey: ['beacon-tasks', beaconId] });
  };

  const handleCommandSuccess = (task: BeaconTask, commandName: string) => {
    toast.success(`${commandName} task queued`, {
      description: `Task will execute on next check-in`,
    });
    setRecentTasks((prev) => [task, ...prev.slice(0, 4)]);
    invalidateTasks();
    setInputValue('');
    setSelectedCommand(null);
  };

  const handleCommandError = (error: Error, commandName: string) => {
    toast.error(`Failed to queue ${commandName}`, {
      description: error.message,
    });
  };

  // Quick command mutations
  const whoamiMutation = useMutation({
    mutationFn: () => api.beaconWhoami(beaconId),
    onSuccess: (data) => handleCommandSuccess(data.task, 'Whoami'),
    onError: (error: Error) => handleCommandError(error, 'Whoami'),
  });

  const pwdMutation = useMutation({
    mutationFn: () => api.beaconPwd(beaconId),
    onSuccess: (data) => handleCommandSuccess(data.task, 'PWD'),
    onError: (error: Error) => handleCommandError(error, 'PWD'),
  });

  const psMutation = useMutation({
    mutationFn: () => api.beaconPs(beaconId),
    onSuccess: (data) => handleCommandSuccess(data.task, 'Process List'),
    onError: (error: Error) => handleCommandError(error, 'Process List'),
  });

  const ifconfigMutation = useMutation({
    mutationFn: () => api.beaconIfconfig(beaconId),
    onSuccess: (data) => handleCommandSuccess(data.task, 'Network Info'),
    onError: (error: Error) => handleCommandError(error, 'Network Info'),
  });

  const netstatMutation = useMutation({
    mutationFn: () => api.beaconNetstat(beaconId),
    onSuccess: (data) => handleCommandSuccess(data.task, 'Netstat'),
    onError: (error: Error) => handleCommandError(error, 'Netstat'),
  });

  const cdMutation = useMutation({
    mutationFn: (path: string) => api.beaconCd(beaconId, path),
    onSuccess: (data) => handleCommandSuccess(data.task, 'Change Dir'),
    onError: (error: Error) => handleCommandError(error, 'Change Dir'),
  });

  const lsMutation = useMutation({
    mutationFn: (path: string) => api.beaconLs(beaconId, path),
    onSuccess: (data) => handleCommandSuccess(data.task, 'List Files'),
    onError: (error: Error) => handleCommandError(error, 'List Files'),
  });

  const catMutation = useMutation({
    mutationFn: (path: string) => api.beaconCat(beaconId, path),
    onSuccess: (data) => handleCommandSuccess(data.task, 'Read File'),
    onError: (error: Error) => handleCommandError(error, 'Read File'),
  });

  const downloadMutation = useMutation({
    mutationFn: (path: string) => api.beaconDownload(beaconId, path),
    onSuccess: (data) => handleCommandSuccess(data.task, 'Download'),
    onError: (error: Error) => handleCommandError(error, 'Download'),
  });

  const executeMutation = useMutation({
    mutationFn: () =>
      api.beaconExecute(beaconId, {
        path: execPath,
        args: execArgs.split(' ').filter((a) => a.trim()),
        output: execOutput,
      }),
    onSuccess: (data) => {
      handleCommandSuccess(data.task, 'Execute');
      setExecPath('');
      setExecArgs('');
    },
    onError: (error: Error) => handleCommandError(error, 'Execute'),
  });

  const handleQuickCommand = async (cmd: QuickCommand) => {
    if (isDead) {
      toast.error('Beacon is dead');
      return;
    }

    if (cmd.requiresInput) {
      setSelectedCommand(cmd);
      return;
    }

    setExecutingCommand(cmd.id);
    try {
      switch (cmd.id) {
        case 'whoami':
          await whoamiMutation.mutateAsync();
          break;
        case 'pwd':
          await pwdMutation.mutateAsync();
          break;
        case 'ps':
          await psMutation.mutateAsync();
          break;
        case 'ifconfig':
          await ifconfigMutation.mutateAsync();
          break;
        case 'netstat':
          await netstatMutation.mutateAsync();
          break;
      }
    } finally {
      setExecutingCommand(null);
    }
  };

  const handleInputCommand = async () => {
    if (!selectedCommand || !inputValue.trim()) return;

    setExecutingCommand(selectedCommand.id);
    try {
      switch (selectedCommand.id) {
        case 'cd':
          await cdMutation.mutateAsync(inputValue.trim());
          break;
        case 'ls':
          await lsMutation.mutateAsync(inputValue.trim());
          break;
        case 'cat':
          await catMutation.mutateAsync(inputValue.trim());
          break;
        case 'download':
          await downloadMutation.mutateAsync(inputValue.trim());
          break;
      }
    } finally {
      setExecutingCommand(null);
    }
  };

  const handleExecute = async () => {
    if (!execPath.trim()) {
      toast.error('Path is required');
      return;
    }
    await executeMutation.mutateAsync();
  };

  const isAnyMutationPending =
    whoamiMutation.isPending ||
    pwdMutation.isPending ||
    psMutation.isPending ||
    ifconfigMutation.isPending ||
    netstatMutation.isPending ||
    cdMutation.isPending ||
    lsMutation.isPending ||
    catMutation.isPending ||
    downloadMutation.isPending ||
    executeMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Quick Commands */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Terminal className="h-5 w-5 text-yellow-500" />
            Quick Commands
          </CardTitle>
          <CardDescription>
            Queue commands for execution on next beacon check-in
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickCommands.map((cmd) => {
              const Icon = cmd.icon;
              const isExecuting = executingCommand === cmd.id;
              return (
                <Button
                  key={cmd.id}
                  variant="outline"
                  className="h-auto py-3 flex flex-col items-center gap-1 hover:border-yellow-500/50"
                  onClick={() => handleQuickCommand(cmd)}
                  disabled={isDead || isAnyMutationPending}
                >
                  {isExecuting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Icon className={`h-5 w-5 ${cmd.color}`} />
                  )}
                  <span className="text-sm font-medium">{cmd.name}</span>
                  <span className="text-xs text-muted-foreground">{cmd.description}</span>
                </Button>
              );
            })}
          </div>

          {/* Input dialog for commands that require input */}
          {selectedCommand && (
            <div className="mt-4 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 mb-3">
                <selectedCommand.icon className={`h-5 w-5 ${selectedCommand.color}`} />
                <span className="font-medium">{selectedCommand.name}</span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="cmd-input" className="text-sm">
                    {selectedCommand.inputLabel}
                  </Label>
                  <Input
                    id="cmd-input"
                    placeholder={selectedCommand.inputPlaceholder}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleInputCommand()}
                    autoFocus
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button
                    onClick={handleInputCommand}
                    disabled={!inputValue.trim() || isAnyMutationPending}
                    className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950"
                  >
                    {executingCommand === selectedCommand.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedCommand(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Execute Command */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Terminal className="h-5 w-5 text-green-500" />
            Execute Command
          </CardTitle>
          <CardDescription>Run an executable on the target system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="exec-path">Executable Path</Label>
              <Input
                id="exec-path"
                placeholder="/bin/ls or C:\Windows\System32\cmd.exe"
                value={execPath}
                onChange={(e) => setExecPath(e.target.value)}
                disabled={isDead}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exec-args">Arguments</Label>
              <Input
                id="exec-args"
                placeholder="-la or /c dir"
                value={execArgs}
                onChange={(e) => setExecArgs(e.target.value)}
                disabled={isDead}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch id="exec-output" checked={execOutput} onCheckedChange={setExecOutput} />
              <Label htmlFor="exec-output" className="font-normal">
                Capture output
              </Label>
            </div>
            <Button
              onClick={handleExecute}
              disabled={isDead || !execPath.trim() || executeMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {executeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Queueing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Execute
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recently Queued Tasks */}
      {recentTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Recently Queued
            </CardTitle>
            <CardDescription>Tasks waiting for next check-in</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      {task.type}
                    </Badge>
                    <span className="text-sm">{task.description}</span>
                  </div>
                  <Badge
                    variant={task.status === 'pending' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {task.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            About Beacon Commands
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Beacons operate asynchronously. Commands are queued as tasks and execute when the beacon
            checks in (interval: varies per beacon). To see real-time command output, switch to the{' '}
            <strong>Tasks</strong> tab after queueing commands. For immediate interaction, consider
            opening an interactive session.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
