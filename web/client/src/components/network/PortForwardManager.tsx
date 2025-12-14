import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  ArrowRight,
  Plus,
  Trash2,
  RefreshCw,
  Loader2,
  ArrowLeftRight,
} from 'lucide-react';
import api from '@/lib/api';
import type { PortForward, PortForwardRequest } from '@/types';

interface PortForwardManagerProps {
  sessionId: string;
}

export function PortForwardManager({ sessionId }: PortForwardManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bindAddress, setBindAddress] = useState('127.0.0.1:8080');
  const [remoteAddress, setRemoteAddress] = useState('127.0.0.1:80');
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['portfwd', sessionId],
    queryFn: () => api.getPortForwards(sessionId),
    enabled: !!sessionId,
  });

  const createMutation = useMutation({
    mutationFn: (req: PortForwardRequest) => api.createPortForward(sessionId, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfwd', sessionId] });
      setDialogOpen(false);
      resetForm();
      toast.success('Port forward created', {
        description: `${bindAddress} → ${remoteAddress}`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to create port forward', {
        description: error.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deletePortForward(sessionId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfwd', sessionId] });
      toast.success('Port forward deleted');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete port forward', {
        description: error.message,
      });
    },
  });

  const resetForm = () => {
    setBindAddress('127.0.0.1:8080');
    setRemoteAddress('127.0.0.1:80');
  };

  const handleCreate = () => {
    createMutation.mutate({
      bindAddress,
      remoteAddress,
    });
  };

  const portForwards = data?.portForwards ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowRight className="h-5 w-5" />
              Port Forwards
            </CardTitle>
            <CardDescription>
              Forward local ports to remote targets through the implant
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-8 w-8"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Port Forward</DialogTitle>
                  <DialogDescription>
                    Forward a local port to a remote address through the implant.
                    Traffic to the bind address will be forwarded to the remote address.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="bind">Local Bind Address</Label>
                    <Input
                      id="bind"
                      placeholder="127.0.0.1:8080"
                      value={bindAddress}
                      onChange={(e) => setBindAddress(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      The local address to listen on (host:port)
                    </p>
                  </div>
                  <div className="flex items-center justify-center">
                    <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="remote">Remote Target Address</Label>
                    <Input
                      id="remote"
                      placeholder="127.0.0.1:80"
                      value={remoteAddress}
                      onChange={(e) => setRemoteAddress(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      The remote address to forward to (host:port)
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={createMutation.isPending || !bindAddress || !remoteAddress}
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Create
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : portForwards.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ArrowRight className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No port forwards configured</p>
          </div>
        ) : (
          <ScrollArea className="h-[200px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Local Bind</TableHead>
                  <TableHead></TableHead>
                  <TableHead>Remote Target</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {portForwards.map((pf: PortForward) => (
                  <TableRow key={pf.id}>
                    <TableCell>
                      <Badge variant="outline">#{pf.id}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {pf.bindAddress}
                    </TableCell>
                    <TableCell className="text-center">
                      <ArrowRight className="h-4 w-4 text-muted-foreground inline" />
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {pf.remoteAddress}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => deleteMutation.mutate(pf.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
