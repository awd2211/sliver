import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ListTodo,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Eye,
  Ban,
  Send,
  AlertTriangle,
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import type { BeaconTask } from '@/types';
import { format } from 'date-fns';

interface BeaconTasksPanelProps {
  beaconId: string;
}

const taskStatusColors: Record<BeaconTask['status'], string> = {
  pending: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30',
  completed: 'bg-green-500/20 text-green-600 border-green-500/30',
  failed: 'bg-red-500/20 text-red-600 border-red-500/30',
  canceled: 'bg-gray-500/20 text-gray-600 border-gray-500/30',
};

const taskStatusIcons: Record<BeaconTask['status'], React.ReactNode> = {
  pending: <Clock className="h-4 w-4" />,
  completed: <CheckCircle2 className="h-4 w-4" />,
  failed: <XCircle className="h-4 w-4" />,
  canceled: <AlertCircle className="h-4 w-4" />,
};

export function BeaconTasksPanel({ beaconId }: BeaconTasksPanelProps) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<BeaconTask | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Fetch tasks
  const { data: tasksData, isLoading, refetch } = useQuery({
    queryKey: ['beacon-tasks', beaconId, statusFilter],
    queryFn: () => api.getBeaconTasks(beaconId, statusFilter !== 'all' ? { status: statusFilter } : undefined),
    refetchInterval: 5000,
  });

  // Cancel task mutation
  const cancelMutation = useMutation({
    mutationFn: (taskId: string) => api.cancelBeaconTask(beaconId, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beacon-tasks', beaconId] });
      toast.success('Task canceled');
    },
    onError: (error: Error) => {
      toast.error(`Failed to cancel task: ${error.message}`);
    },
  });

  const tasks = tasksData?.tasks || [];

  // Group tasks by status for summary
  const taskCounts = tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleViewDetails = (task: BeaconTask) => {
    setSelectedTask(task);
    setDetailsOpen(true);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-blue-500" />
              Task Queue
            </CardTitle>
            <CardDescription>
              Commands queued for execution on next beacon check-in
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-2 px-6 pb-4">
        {(['pending', 'completed', 'failed', 'canceled'] as const).map((status) => (
          <Card key={status} className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm capitalize text-muted-foreground">{status}</span>
              <Badge variant="outline" className={taskStatusColors[status]}>
                {taskCounts[status] || 0}
              </Badge>
            </div>
          </Card>
        ))}
      </div>

      <CardContent className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <ListTodo className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No tasks in queue</p>
            <p className="text-sm">Tasks will appear here when commands are sent to the beacon</p>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[150px]">Created</TableHead>
                  <TableHead className="w-[150px]">Completed</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-mono text-xs">
                      {task.id.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{task.type}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {task.description}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`gap-1 ${taskStatusColors[task.status]}`}>
                        {taskStatusIcons[task.status]}
                        {task.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(task.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {task.completedAt
                        ? format(new Date(task.completedAt), 'yyyy-MM-dd HH:mm:ss')
                        : task.sentAt
                        ? <span className="flex items-center gap-1"><Send className="h-3 w-3" /> Sent</span>
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDetails(task)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {task.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => cancelMutation.mutate(task.id)}
                            disabled={cancelMutation.isPending}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>

      {/* Task Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Task Details
              {selectedTask && (
                <Badge variant="outline" className={taskStatusColors[selectedTask.status]}>
                  {selectedTask.status}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedTask?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Type</p>
                    <p>{selectedTask.type}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <Badge variant="outline" className={taskStatusColors[selectedTask.status]}>
                      {taskStatusIcons[selectedTask.status]}
                      <span className="ml-1">{selectedTask.status}</span>
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Created</p>
                    <p>{format(new Date(selectedTask.createdAt), 'yyyy-MM-dd HH:mm:ss')}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Sent</p>
                    <p>
                      {selectedTask.sentAt
                        ? format(new Date(selectedTask.sentAt), 'yyyy-MM-dd HH:mm:ss')
                        : 'Not sent yet'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Completed</p>
                    <p>
                      {selectedTask.completedAt
                        ? format(new Date(selectedTask.completedAt), 'yyyy-MM-dd HH:mm:ss')
                        : '-'}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
                  <p className="bg-muted p-3 rounded-lg text-sm">{selectedTask.description}</p>
                </div>

                {selectedTask.result && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Result</p>
                    <pre className="bg-muted p-3 rounded-lg text-xs font-mono overflow-x-auto max-h-48">
                      {selectedTask.result}
                    </pre>
                  </div>
                )}

                {selectedTask.error && (
                  <div>
                    <p className="text-sm font-medium text-red-500 mb-2 flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" />
                      Error
                    </p>
                    <pre className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-xs font-mono text-red-400">
                      {selectedTask.error}
                    </pre>
                  </div>
                )}

                {selectedTask.status === 'pending' && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">
                      This task is pending and will be executed on the next beacon check-in.
                    </p>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        cancelMutation.mutate(selectedTask.id);
                        setDetailsOpen(false);
                      }}
                      disabled={cancelMutation.isPending}
                    >
                      {cancelMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Ban className="h-4 w-4 mr-2" />
                      )}
                      Cancel Task
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
