import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Network,
  GitBranch,
  Server,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { PivotListener, PivotType, StartPivotListenerRequest } from '@/types';

interface PivotsPanelProps {
  sessionId: string;
}

export function PivotsPanel({ sessionId }: PivotsPanelProps) {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedListener, setSelectedListener] = useState<PivotListener | null>(null);
  const [newListener, setNewListener] = useState<StartPivotListenerRequest>({
    type: 'tcp',
    bindAddress: '0.0.0.0:9898',
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['pivots', sessionId],
    queryFn: () => api.getPivotListeners(sessionId),
    refetchInterval: 5000,
  });

  const { data: pivotGraph } = useQuery({
    queryKey: ['pivot-graph'],
    queryFn: () => api.getPivotGraph(),
    refetchInterval: 10000,
  });

  const createMutation = useMutation({
    mutationFn: (req: StartPivotListenerRequest) => api.startPivotListener(sessionId, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pivots', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['pivot-graph'] });
      toast.success('Pivot listener started');
      setCreateDialogOpen(false);
      setNewListener({ type: 'tcp', bindAddress: '0.0.0.0:9898' });
    },
    onError: (err: Error) => {
      toast.error(`Failed to start pivot listener: ${err.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (listenerId: string) => api.stopPivotListener(sessionId, listenerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pivots', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['pivot-graph'] });
      toast.success('Pivot listener stopped');
      setDeleteDialogOpen(false);
      setSelectedListener(null);
    },
    onError: (err: Error) => {
      toast.error(`Failed to stop pivot listener: ${err.message}`);
    },
  });

  const getPivotTypeLabel = (type: PivotType) => {
    switch (type) {
      case 'tcp':
        return 'TCP';
      case 'named-pipe':
        return 'Named Pipe';
      case 'smb':
        return 'SMB';
      default:
        return type;
    }
  };

  const getPivotTypeBadgeVariant = (type: PivotType) => {
    switch (type) {
      case 'tcp':
        return 'default';
      case 'named-pipe':
        return 'secondary';
      case 'smb':
        return 'outline';
      default:
        return 'default';
    }
  };

  const listeners = data?.listeners || [];
  const graph = pivotGraph;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-yellow-500" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Error loading pivots</CardTitle>
          <CardDescription>{(error as Error).message}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pivot Graph Overview */}
      {graph && (graph.peers?.length > 0 || graph.edges?.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <GitBranch className="h-4 w-4" />
              Pivot Graph
            </CardTitle>
            <CardDescription>
              Connected pivot peers and routes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Connected Peers</Label>
                <p className="font-medium">{graph.peers?.length || 0}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Active Routes</Label>
                <p className="font-medium">{graph.edges?.length || 0}</p>
              </div>
            </div>
            {graph.peers && graph.peers.length > 0 && (
              <div className="mt-4">
                <Label className="text-muted-foreground">Peers</Label>
                <div className="mt-2 space-y-2">
                  {graph.peers.map((peer) => (
                    <div key={peer.peerId} className="flex items-center gap-2 text-sm">
                      <Server className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono">{peer.name}</span>
                      <span className="text-muted-foreground">({peer.peerId.slice(0, 8)}...)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pivot Listeners */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Network className="h-4 w-4" />
                Pivot Listeners ({listeners.length})
              </CardTitle>
              <CardDescription>
                Manage pivot listeners for lateral movement
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New Listener
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {listeners.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No pivot listeners active
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Bind Address</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listeners.map((listener) => (
                  <TableRow key={listener.id}>
                    <TableCell className="font-mono text-xs">
                      {listener.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPivotTypeBadgeVariant(listener.type) as 'default' | 'secondary' | 'outline'}>
                        {getPivotTypeLabel(listener.type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">{listener.bindAddress}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedListener(listener);
                          setDeleteDialogOpen(true);
                        }}
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

      {/* Create Listener Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Pivot Listener</DialogTitle>
            <DialogDescription>
              Create a new pivot listener for incoming implant connections
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Pivot Type</Label>
              <Select
                value={newListener.type}
                onValueChange={(v: PivotType) =>
                  setNewListener({ ...newListener, type: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tcp">TCP Listener</SelectItem>
                  <SelectItem value="named-pipe">Named Pipe (Windows)</SelectItem>
                  <SelectItem value="smb">SMB Pipe (Windows)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bindAddress">
                {newListener.type === 'tcp' ? 'Bind Address (host:port)' : 'Pipe Name'}
              </Label>
              <Input
                id="bindAddress"
                placeholder={newListener.type === 'tcp' ? '0.0.0.0:9898' : '\\\\.\\pipe\\mypipe'}
                value={newListener.bindAddress}
                onChange={(e) =>
                  setNewListener({ ...newListener, bindAddress: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                {newListener.type === 'tcp'
                  ? 'The address and port to listen on for incoming pivot connections'
                  : 'The named pipe path for incoming pivot connections'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(newListener)}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Start Listener
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stop Pivot Listener</DialogTitle>
            <DialogDescription>
              Are you sure you want to stop this pivot listener? Connected implants may lose
              connectivity.
            </DialogDescription>
          </DialogHeader>
          {selectedListener && (
            <div className="space-y-2 py-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <p className="font-medium">{getPivotTypeLabel(selectedListener.type)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Bind Address</Label>
                  <p className="font-mono">{selectedListener.bindAddress}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedListener && deleteMutation.mutate(selectedListener.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Stop Listener
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
