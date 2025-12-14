import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
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
  RefreshCw,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  Ban,
  Send,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import type { Task } from '@/types';
import { format } from 'date-fns';

interface TasksPanelProps {
  sessionId: string;
}

const taskStateColors: Record<Task['state'], string> = {
  pending: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30',
  sent: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
  completed: 'bg-green-500/20 text-green-600 border-green-500/30',
  failed: 'bg-red-500/20 text-red-600 border-red-500/30',
  canceled: 'bg-gray-500/20 text-gray-600 border-gray-500/30',
};

const taskStateIcons: Record<Task['state'], React.ReactNode> = {
  pending: <Clock className="h-4 w-4" />,
  sent: <Send className="h-4 w-4" />,
  completed: <CheckCircle className="h-4 w-4" />,
  failed: <XCircle className="h-4 w-4" />,
  canceled: <Ban className="h-4 w-4" />,
};

export function TasksPanel({ sessionId }: TasksPanelProps) {
  const queryClient = useQueryClient();
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Fetch tasks
  const { data: tasksData, isLoading, refetch } = useQuery({
    queryKey: ['tasks', sessionId, stateFilter],
    queryFn: () => api.listTasks(sessionId, stateFilter !== 'all' ? { state: stateFilter } : undefined),
    refetchInterval: 5000,
  });

  // Cancel task mutation
  const cancelMutation = useMutation({
    mutationFn: (taskId: string) => api.cancelTask(sessionId, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', sessionId] });
      toast.success('Task canceled');
    },
    onError: (error: Error) => {
      toast.error(`Failed to cancel task: ${error.message}`);
    },
  });

  const handleViewDetails = (task: Task) => {
    setSelectedTask(task);
    setDetailsOpen(true);
  };

  const tasks = tasksData?.tasks || [];

  // Group tasks by state for summary
  const taskCounts = tasks.reduce((acc, task) => {
    acc[task.state] = (acc[task.state] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <ListTodo className="h-5 w-5 text-yellow-500" />
          <div>
            <h2 className="text-lg font-semibold">Task History</h2>
            <p className="text-sm text-muted-foreground">
              View and manage pending and completed tasks
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={stateFilter} onValueChange={setStateFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="All states" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-2 p-4 border-b">
        {(['pending', 'sent', 'completed', 'failed', 'canceled'] as const).map((state) => (
          <Card key={state} className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm capitalize text-muted-foreground">{state}</span>
              <Badge variant="outline" className={taskStateColors[state]}>
                {taskCounts[state] || 0}
              </Badge>
            </div>
          </Card>
        ))}
      </div>

      {/* Task List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <ListTodo className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No tasks found</p>
            <p className="text-sm">Tasks will appear here when commands are executed</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[100px]">State</TableHead>
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
                    <Badge variant="outline" className={`gap-1 ${taskStateColors[task.state]}`}>
                      {taskStateIcons[task.state]}
                      {task.state}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(task.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {task.completedAt
                      ? format(new Date(task.completedAt), 'yyyy-MM-dd HH:mm:ss')
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
                      {(task.state === 'pending' || task.state === 'sent') && (
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
        )}
      </ScrollArea>

      {/* Task Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Task Details
              {selectedTask && (
                <Badge variant="outline" className={taskStateColors[selectedTask.state]}>
                  {selectedTask.state}
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
                    <p className="text-sm font-medium text-muted-foreground">State</p>
                    <Badge variant="outline" className={taskStateColors[selectedTask.state]}>
                      {taskStateIcons[selectedTask.state]}
                      <span className="ml-1">{selectedTask.state}</span>
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Created</p>
                    <p>{format(new Date(selectedTask.createdAt), 'yyyy-MM-dd HH:mm:ss')}</p>
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

                {selectedTask.request && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Request</p>
                    <pre className="bg-muted p-3 rounded-lg text-xs font-mono overflow-x-auto">
                      {selectedTask.request}
                    </pre>
                  </div>
                )}

                {selectedTask.response && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Response</p>
                    <pre className="bg-muted p-3 rounded-lg text-xs font-mono overflow-x-auto max-h-48">
                      {selectedTask.response}
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
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
