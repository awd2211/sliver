import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
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
  Globe,
  Plus,
  Trash2,
  RefreshCw,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';
import api from '@/lib/api';
import type { SocksProxy, SocksProxyRequest } from '@/types';

interface SocksProxyManagerProps {
  sessionId: string;
}

export function SocksProxyManager({ sessionId }: SocksProxyManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bindAddress, setBindAddress] = useState('127.0.0.1:1080');
  const [useAuth, setUseAuth] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['socks', sessionId],
    queryFn: () => api.getSocksProxies(sessionId),
    enabled: !!sessionId,
  });

  const createMutation = useMutation({
    mutationFn: (req: SocksProxyRequest) => api.createSocksProxy(sessionId, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['socks', sessionId] });
      setDialogOpen(false);
      resetForm();
      toast.success('SOCKS proxy started', {
        description: `Listening on ${bindAddress}`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to start SOCKS proxy', {
        description: error.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteSocksProxy(sessionId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['socks', sessionId] });
      toast.success('SOCKS proxy stopped');
    },
    onError: (error: Error) => {
      toast.error('Failed to stop SOCKS proxy', {
        description: error.message,
      });
    },
  });

  const resetForm = () => {
    setBindAddress('127.0.0.1:1080');
    setUseAuth(false);
    setUsername('');
    setPassword('');
  };

  const handleCreate = () => {
    createMutation.mutate({
      bindAddress,
      username: useAuth ? username : undefined,
      password: useAuth ? password : undefined,
    });
  };

  const copyToClipboard = (proxy: SocksProxy) => {
    const proxyUrl = proxy.username
      ? `socks5://${proxy.username}:****@${proxy.bindAddress}`
      : `socks5://${proxy.bindAddress}`;
    navigator.clipboard.writeText(proxyUrl);
    setCopied(proxy.id);
    setTimeout(() => setCopied(null), 2000);
  };

  const socksProxies = data?.socksProxies ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-5 w-5" />
              SOCKS Proxies
            </CardTitle>
            <CardDescription>
              Route traffic through the implant via SOCKS5 proxy
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
                  <DialogTitle>Create SOCKS5 Proxy</DialogTitle>
                  <DialogDescription>
                    Start a SOCKS5 proxy server that routes traffic through the implant.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="bind">Bind Address</Label>
                    <Input
                      id="bind"
                      placeholder="127.0.0.1:1080"
                      value={bindAddress}
                      onChange={(e) => setBindAddress(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      The local address to run the SOCKS5 server on
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="auth"
                      checked={useAuth}
                      onCheckedChange={setUseAuth}
                    />
                    <Label htmlFor="auth">Enable authentication</Label>
                  </div>

                  {useAuth && (
                    <>
                      <div className="grid gap-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          placeholder="Enter username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="Enter password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={createMutation.isPending || !bindAddress || (useAuth && (!username || !password))}
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
        ) : socksProxies.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No SOCKS proxies running</p>
          </div>
        ) : (
          <ScrollArea className="h-[200px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Bind Address</TableHead>
                  <TableHead>Auth</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {socksProxies.map((proxy: SocksProxy) => (
                  <TableRow key={proxy.id}>
                    <TableCell>
                      <Badge variant="outline">#{proxy.id}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {proxy.bindAddress}
                    </TableCell>
                    <TableCell>
                      {proxy.username ? (
                        <Badge variant="secondary">{proxy.username}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => copyToClipboard(proxy)}
                          title="Copy proxy URL"
                        >
                          {copied === proxy.id ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => deleteMutation.mutate(proxy.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
