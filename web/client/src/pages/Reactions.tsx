import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Zap,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Play,
  Loader2,
  Terminal,
  Radio,
  Bird,
  FileBox,
  Key,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import type { Reaction, ReactionEventType, CreateReactionRequest } from '@/types';

const EVENT_TYPES: { value: ReactionEventType; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'session_opened', label: 'Session Opened', icon: Terminal, description: 'Triggered when a new session connects' },
  { value: 'session_closed', label: 'Session Closed', icon: XCircle, description: 'Triggered when a session disconnects' },
  { value: 'beacon_registered', label: 'Beacon Registered', icon: Radio, description: 'Triggered when a new beacon registers' },
  { value: 'beacon_checkin', label: 'Beacon Check-in', icon: CheckCircle, description: 'Triggered on each beacon check-in' },
  { value: 'canary_triggered', label: 'Canary Triggered', icon: Bird, description: 'Triggered when a DNS canary fires' },
  { value: 'loot_added', label: 'Loot Added', icon: FileBox, description: 'Triggered when new loot is collected' },
  { value: 'credential_added', label: 'Credential Added', icon: Key, description: 'Triggered when credentials are harvested' },
  { value: 'watchdog_triggered', label: 'Watchdog Triggered', icon: AlertTriangle, description: 'Triggered by watchdog alerts' },
];

function getEventConfig(eventType: ReactionEventType) {
  return EVENT_TYPES.find(e => e.value === eventType) || EVENT_TYPES[0];
}

interface ReactionFormData {
  name: string;
  eventType: ReactionEventType;
  commands: string;
  enabled: boolean;
}

function ReactionDialog({
  open,
  onOpenChange,
  reaction,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reaction?: Reaction;
  onSubmit: (data: ReactionFormData) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<ReactionFormData>({
    name: reaction?.name || '',
    eventType: reaction?.eventType || 'session_opened',
    commands: reaction?.commands.join('\n') || '',
    enabled: reaction?.enabled ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{reaction ? 'Edit Reaction' : 'Create Reaction'}</DialogTitle>
          <DialogDescription>
            {reaction
              ? 'Modify the reaction configuration and commands'
              : 'Create an automated reaction to respond to events'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Reaction Name</Label>
              <Input
                id="name"
                placeholder="e.g., Auto-enumerate on session"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eventType">Event Type</Label>
              <Select
                value={formData.eventType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, eventType: value as ReactionEventType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((event) => {
                    const Icon = event.icon;
                    return (
                      <SelectItem key={event.value} value={event.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{event.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="commands">Commands (one per line)</Label>
            <Textarea
              id="commands"
              placeholder={`whoami\nps\nifconfig\nnetstat`}
              value={formData.commands}
              onChange={(e) => setFormData(prev => ({ ...prev, commands: e.target.value }))}
              className="font-mono min-h-[200px]"
              required
            />
            <p className="text-xs text-muted-foreground">
              Enter Sliver commands to execute when the event triggers. Each line is a separate command.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="enabled"
              checked={formData.enabled}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enabled: checked }))}
            />
            <Label htmlFor="enabled">Enable this reaction</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {reaction ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function Reactions() {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingReaction, setEditingReaction] = useState<Reaction | null>(null);
  const [deletingReaction, setDeletingReaction] = useState<Reaction | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['reactions'],
    queryFn: () => api.getReactions(),
  });

  const createMutation = useMutation({
    mutationFn: (req: CreateReactionRequest) => api.createReaction(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reactions'] });
      setCreateDialogOpen(false);
      toast.success('Reaction created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create reaction: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateReactionRequest }) =>
      api.updateReaction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reactions'] });
      setEditingReaction(null);
      toast.success('Reaction updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update reaction: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteReaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reactions'] });
      setDeletingReaction(null);
      toast.success('Reaction deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete reaction: ${error.message}`);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      api.toggleReaction(id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reactions'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to toggle reaction: ${error.message}`);
    },
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => api.testReaction(id),
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Reaction test successful');
      } else {
        toast.warning('Reaction test completed with issues');
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to test reaction: ${error.message}`);
    },
  });

  const handleCreate = (formData: ReactionFormData) => {
    createMutation.mutate({
      name: formData.name,
      eventType: formData.eventType,
      commands: formData.commands.split('\n').filter(cmd => cmd.trim()),
      enabled: formData.enabled,
    });
  };

  const handleUpdate = (formData: ReactionFormData) => {
    if (!editingReaction) return;
    updateMutation.mutate({
      id: editingReaction.id,
      data: {
        name: formData.name,
        eventType: formData.eventType,
        commands: formData.commands.split('\n').filter(cmd => cmd.trim()),
        enabled: formData.enabled,
      },
    });
  };

  const reactions = data?.reactions ?? [];

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{(error as Error).message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reactions</h1>
          <p className="text-muted-foreground">
            Automated responses to events triggered by implants and operations
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Reaction
        </Button>
      </div>

      {/* Event Types Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {EVENT_TYPES.slice(0, 4).map((event) => {
          const Icon = event.icon;
          const count = reactions.filter(r => r.eventType === event.value && r.enabled).length;
          return (
            <Card key={event.value}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-yellow-500" />
                  <CardTitle className="text-sm">{event.label}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">active reaction{count !== 1 ? 's' : ''}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Reactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            All Reactions
          </CardTitle>
          <CardDescription>
            Manage your event-triggered automation rules
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : reactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No reactions configured</p>
              <p className="text-sm">Create a reaction to automate responses to events</p>
              <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Reaction
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Commands</TableHead>
                  <TableHead>Triggers</TableHead>
                  <TableHead>Last Triggered</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reactions.map((reaction) => {
                  const eventConfig = getEventConfig(reaction.eventType);
                  const EventIcon = eventConfig.icon;
                  return (
                    <TableRow key={reaction.id}>
                      <TableCell>
                        <Switch
                          checked={reaction.enabled}
                          onCheckedChange={(enabled) =>
                            toggleMutation.mutate({ id: reaction.id, enabled })
                          }
                          disabled={toggleMutation.isPending}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{reaction.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <EventIcon className="h-4 w-4 text-muted-foreground" />
                          <span>{eventConfig.label}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {reaction.commands.length} command{reaction.commands.length !== 1 ? 's' : ''}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{reaction.triggerCount}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {reaction.lastTriggered ? (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(reaction.lastTriggered), { addSuffix: true })}
                          </div>
                        ) : (
                          'Never'
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingReaction(reaction)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => testMutation.mutate(reaction.id)}
                              disabled={testMutation.isPending}
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Test
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeletingReaction(reaction)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <ReactionDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
      />

      {/* Edit Dialog */}
      {editingReaction && (
        <ReactionDialog
          open={!!editingReaction}
          onOpenChange={(open) => !open && setEditingReaction(null)}
          reaction={editingReaction}
          onSubmit={handleUpdate}
          isLoading={updateMutation.isPending}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingReaction} onOpenChange={(open) => !open && setDeletingReaction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingReaction?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingReaction && deleteMutation.mutate(deletingReaction.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
