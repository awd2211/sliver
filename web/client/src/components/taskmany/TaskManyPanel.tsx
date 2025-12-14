import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  Play,
  Loader2,
  Terminal,
  Radio,
  CheckCircle,
  XCircle,
  Clock,
  StopCircle,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import type { TaskManyCommandType, TaskManyRequest, TaskManyResponse } from '@/types';

const COMMAND_TYPES: { value: TaskManyCommandType; label: string; description: string }[] = [
  { value: 'whoami', label: 'Whoami', description: 'Get current user information' },
  { value: 'pwd', label: 'PWD', description: 'Print working directory' },
  { value: 'ps', label: 'Process List', description: 'List running processes' },
  { value: 'netstat', label: 'Netstat', description: 'Network connections' },
  { value: 'ifconfig', label: 'Ifconfig', description: 'Network interfaces' },
  { value: 'env', label: 'Environment', description: 'Environment variables' },
  { value: 'screenshot', label: 'Screenshot', description: 'Capture screen' },
  { value: 'execute', label: 'Execute', description: 'Execute a custom command' },
  { value: 'download', label: 'Download', description: 'Download a file' },
  { value: 'upload', label: 'Upload', description: 'Upload a file' },
  { value: 'kill', label: 'Kill', description: 'Kill the implant' },
];

function getStatusIcon(status: string) {
  switch (status) {
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'running':
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

function getStatusBadge(status: string) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    success: 'default',
    failed: 'destructive',
    running: 'secondary',
    pending: 'outline',
    completed: 'default',
  };
  return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
}

export function TaskManyPanel() {
  const queryClient = useQueryClient();
  const [targetType, setTargetType] = useState<'session' | 'beacon'>('session');
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [commandType, setCommandType] = useState<TaskManyCommandType>('whoami');
  const [customCommand, setCustomCommand] = useState('');
  const [customArgs, setCustomArgs] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTask, setActiveTask] = useState<TaskManyResponse | null>(null);

  // Fetch sessions
  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.getSessions(),
    enabled: targetType === 'session',
  });

  // Fetch beacons
  const { data: beaconsData, isLoading: beaconsLoading } = useQuery({
    queryKey: ['beacons'],
    queryFn: () => api.getBeacons(),
    enabled: targetType === 'beacon',
  });

  // Fetch task history
  const { data: historyData, refetch: refetchHistory } = useQuery({
    queryKey: ['taskmany-history'],
    queryFn: () => api.listTaskManyHistory(),
  });

  const sessions = sessionsData?.sessions ?? [];
  const beacons = beaconsData?.beacons ?? [];
  const history = historyData?.tasks ?? [];

  // Filter targets
  const filteredTargets = useMemo(() => {
    const targets = targetType === 'session' ? sessions : beacons;
    if (!searchQuery) return targets;
    const query = searchQuery.toLowerCase();
    return targets.filter((t) =>
      t.name.toLowerCase().includes(query) ||
      t.hostname.toLowerCase().includes(query) ||
      t.username.toLowerCase().includes(query)
    );
  }, [targetType, sessions, beacons, searchQuery]);

  // Task execution mutation
  const taskMutation = useMutation({
    mutationFn: async () => {
      const req: TaskManyRequest = {
        targets: selectedTargets,
        targetType,
        commandType,
      };

      if (commandType === 'execute' && customCommand) {
        req.command = customCommand;
        if (customArgs) {
          req.args = { args: customArgs.split(' ') };
        }
      } else if (commandType === 'download' && customCommand) {
        req.args = { path: customCommand };
      } else if (commandType === 'upload' && customCommand) {
        req.args = { path: customCommand };
      }

      return api.taskMany(req);
    },
    onSuccess: (data) => {
      setActiveTask(data);
      toast.success(`Batch task started on ${data.totalTargets} targets`);
      queryClient.invalidateQueries({ queryKey: ['taskmany-history'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to start batch task: ${error.message}`);
    },
  });

  // Cancel task mutation
  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.cancelTaskMany(id),
    onSuccess: () => {
      toast.success('Batch task cancelled');
      setActiveTask(null);
      queryClient.invalidateQueries({ queryKey: ['taskmany-history'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to cancel task: ${error.message}`);
    },
  });

  // Poll active task status
  const { data: taskStatus } = useQuery({
    queryKey: ['taskmany-status', activeTask?.id],
    queryFn: () => api.getTaskManyStatus(activeTask!.id),
    enabled: !!activeTask && activeTask.status === 'running',
    refetchInterval: 2000,
  });

  // Update active task with polling result
  const currentTask = taskStatus || activeTask;

  const handleSelectAll = () => {
    if (selectedTargets.length === filteredTargets.length) {
      setSelectedTargets([]);
    } else {
      setSelectedTargets(filteredTargets.map(t => t.id));
    }
  };

  const handleTargetToggle = (id: string) => {
    setSelectedTargets(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const isLoading = targetType === 'session' ? sessionsLoading : beaconsLoading;
  const needsCustomInput = ['execute', 'download', 'upload'].includes(commandType);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Batch Tasks</h1>
          <p className="text-muted-foreground">
            Execute commands across multiple implants simultaneously
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Target Selection */}
        <Card className="lg:row-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Select Targets
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant={targetType === 'session' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setTargetType('session');
                    setSelectedTargets([]);
                  }}
                >
                  <Terminal className="h-4 w-4 mr-1" />
                  Sessions
                </Button>
                <Button
                  variant={targetType === 'beacon' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setTargetType('beacon');
                    setSelectedTargets([]);
                  }}
                >
                  <Radio className="h-4 w-4 mr-1" />
                  Beacons
                </Button>
              </div>
            </div>
            <CardDescription>
              {selectedTargets.length} of {filteredTargets.length} targets selected
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, hostname, or user..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="icon" onClick={handleSelectAll}>
                <Filter className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="h-[400px] border rounded-md">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredTargets.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center p-4">
                    {targetType === 'session' ? (
                      <Terminal className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    ) : (
                      <Radio className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    )}
                    <p>No {targetType}s available</p>
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">
                        <Checkbox
                          checked={selectedTargets.length === filteredTargets.length}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Host</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>OS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTargets.map((target) => (
                      <TableRow
                        key={target.id}
                        className={target.isDead ? 'opacity-50' : ''}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedTargets.includes(target.id)}
                            onCheckedChange={() => handleTargetToggle(target.id)}
                            disabled={target.isDead}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{target.name}</TableCell>
                        <TableCell>{target.hostname}</TableCell>
                        <TableCell>{target.username}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{target.os}/{target.arch}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Command Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Command</CardTitle>
            <CardDescription>
              Select the command to execute on all selected targets
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Command Type</Label>
              <Select value={commandType} onValueChange={(v) => setCommandType(v as TaskManyCommandType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMAND_TYPES.map((cmd) => (
                    <SelectItem key={cmd.value} value={cmd.value}>
                      <div>
                        <span className="font-medium">{cmd.label}</span>
                        <span className="text-muted-foreground ml-2">- {cmd.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {needsCustomInput && (
              <div className="space-y-2">
                <Label>
                  {commandType === 'execute' ? 'Command' :
                   commandType === 'download' ? 'Remote Path' :
                   'Local Path'}
                </Label>
                <Input
                  placeholder={
                    commandType === 'execute' ? '/usr/bin/id' :
                    commandType === 'download' ? '/etc/passwd' :
                    '/tmp/payload.exe'
                  }
                  value={customCommand}
                  onChange={(e) => setCustomCommand(e.target.value)}
                />
              </div>
            )}

            {commandType === 'execute' && (
              <div className="space-y-2">
                <Label>Arguments (optional)</Label>
                <Input
                  placeholder="-a -l"
                  value={customArgs}
                  onChange={(e) => setCustomArgs(e.target.value)}
                />
              </div>
            )}

            {commandType === 'kill' && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">Warning</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  This will terminate all selected implants. This action cannot be undone.
                </p>
              </div>
            )}

            <Button
              onClick={() => taskMutation.mutate()}
              disabled={selectedTargets.length === 0 || taskMutation.isPending || (needsCustomInput && !customCommand)}
              className="w-full"
              variant={commandType === 'kill' ? 'destructive' : 'default'}
            >
              {taskMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Execute on {selectedTargets.length} Target{selectedTargets.length !== 1 ? 's' : ''}
            </Button>
          </CardContent>
        </Card>

        {/* Active Task Progress */}
        {currentTask && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon(currentTask.status)}
                  Active Task
                </CardTitle>
                {currentTask.status === 'running' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => cancelMutation.mutate(currentTask.id)}
                    disabled={cancelMutation.isPending}
                  >
                    <StopCircle className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                )}
              </div>
              <CardDescription>
                {currentTask.completedTargets} of {currentTask.totalTargets} completed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress
                value={(currentTask.completedTargets / currentTask.totalTargets) * 100}
              />
              <ScrollArea className="h-[200px] border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">Status</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Result</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentTask.results.map((result) => (
                      <TableRow key={result.targetId}>
                        <TableCell>{getStatusIcon(result.status)}</TableCell>
                        <TableCell className="font-medium">{result.targetName}</TableCell>
                        <TableCell className="truncate max-w-[200px]">
                          {result.error || result.result || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Task History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Task History</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => refetchHistory()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>Recent batch task executions</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No batch tasks executed yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Targets</TableHead>
                  <TableHead>Success</TableHead>
                  <TableHead>Failed</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.slice(0, 10).map((task) => {
                  const successCount = task.results.filter(r => r.status === 'success').length;
                  const failedCount = task.results.filter(r => r.status === 'failed').length;
                  return (
                    <TableRow
                      key={task.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setActiveTask(task)}
                    >
                      <TableCell>{getStatusBadge(task.status)}</TableCell>
                      <TableCell>{task.totalTargets}</TableCell>
                      <TableCell className="text-green-500">{successCount}</TableCell>
                      <TableCell className="text-red-500">{failedCount}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
