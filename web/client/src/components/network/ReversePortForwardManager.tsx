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
  ArrowLeft,
  Plus,
  Trash2,
  RefreshCw,
  Loader2,
  ArrowLeftRight,
} from 'lucide-react';
import api from '@/lib/api';
import type { ReversePortForward, ReversePortForwardRequest } from '@/types';

interface ReversePortForwardManagerProps {
  sessionId: string;
}

export function ReversePortForwardManager({ sessionId }: ReversePortForwardManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bindAddress, setBindAddress] = useState('0.0.0.0:8080');
  const [forwardAddress, setForwardAddress] = useState('127.0.0.1:80');
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['rportfwd', sessionId],
    queryFn: () => api.getReversePortForwards(sessionId),
    enabled: !!sessionId,
  });

  const createMutation = useMutation({
    mutationFn: (req: ReversePortForwardRequest) => api.createReversePortForward(sessionId, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rportfwd', sessionId] });
      setDialogOpen(false);
      resetForm();
      toast.success('Reverse port forward created', {
        description: `${bindAddress} ← ${forwardAddress}`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to create reverse port forward', {
        description: error.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteReversePortForward(sessionId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rportfwd', sessionId] });
      toast.success('Reverse port forward deleted');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete reverse port forward', {
        description: error.message,
      });
    },
  });

  const resetForm = () => {
    setBindAddress('0.0.0.0:8080');
    setForwardAddress('127.0.0.1:80');
  };

  const handleCreate = () => {
    createMutation.mutate({
      bindAddress,
      forwardAddress,
    });
  };

  const reversePortForwards = data?.reversePortForwards ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowLeft className="h-5 w-5" />
              Reverse Port Forwards
            </CardTitle>
            <CardDescription>
              Listen on the remote system and forward to local targets
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
                  <DialogTitle>Create Reverse Port Forward</DialogTitle>
                  <DialogDescription>
                    Listen on a port on the remote system and forward connections back to your machine.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="bind">Remote Bind Address</Label>
                    <Input
                      id="bind"
                      placeholder="0.0.0.0:8080"
                      value={bindAddress}
                      onChange={(e) => setBindAddress(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      The address on the remote system to listen on
                    </p>
                  </div>
                  <div className="flex items-center justify-center">
                    <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="forward">Local Forward Address</Label>
                    <Input
                      id="forward"
                      placeholder="127.0.0.1:80"
                      value={forwardAddress}
                      onChange={(e) => setForwardAddress(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      The local address to forward connections to
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={createMutation.isPending || !bindAddress || !forwardAddress}
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
        ) : reversePortForwards.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ArrowLeft className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No reverse port forwards configured</p>
          </div>
        ) : (
          <ScrollArea className="h-[200px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Remote Bind</TableHead>
                  <TableHead></TableHead>
                  <TableHead>Local Forward</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reversePortForwards.map((rpf: ReversePortForward) => (
                  <TableRow key={rpf.id}>
                    <TableCell>
                      <Badge variant="outline">#{rpf.id}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {rpf.bindAddress}
                    </TableCell>
                    <TableCell className="text-center">
                      <ArrowLeft className="h-4 w-4 text-muted-foreground inline" />
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {rpf.forwardAddress}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => deleteMutation.mutate(rpf.id)}
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
