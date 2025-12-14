import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Server,
  Plus,
  Search,
  RefreshCw,
  MoreHorizontal,
  Trash2,
  Loader2,
  Shield,
  Globe,
  Radio,
  Lock,
  Wifi,
  Package,
} from 'lucide-react';
import api from '@/lib/api';
import type {
  Job,
  MTLSListenerRequest,
  HTTPListenerRequest,
  DNSListenerRequest,
  WGListenerRequest,
  StageListenerRequest,
} from '@/types';

export function Jobs() {
  const [search, setSearch] = useState('');
  const [newListenerOpen, setNewListenerOpen] = useState(false);
  const [killDialogOpen, setKillDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [activeTab, setActiveTab] = useState('mtls');
  const queryClient = useQueryClient();

  // Form states
  const [mtlsForm, setMtlsForm] = useState<MTLSListenerRequest>({
    host: '0.0.0.0',
    port: 8888,
    persistent: false,
  });

  const [httpForm, setHttpForm] = useState<HTTPListenerRequest>({
    domain: '',
    host: '0.0.0.0',
    port: 80,
    secure: false,
    website: '',
    persistent: false,
  });

  const [dnsForm, setDnsForm] = useState<DNSListenerRequest>({
    domains: [],
    canaries: false,
    host: '0.0.0.0',
    port: 53,
    persistent: false,
  });

  const [dnsDomainsInput, setDnsDomainsInput] = useState('');

  const [wgForm, setWgForm] = useState<WGListenerRequest>({
    host: '0.0.0.0',
    port: 53901,
    keyExchangePort: 1337,
    nPort: 8888,
    persistent: false,
  });

  const [stageForm, setStageForm] = useState<StageListenerRequest>({
    protocol: 'tcp',
    host: '0.0.0.0',
    port: 8443,
    profileName: '',
    compress: true,
    persistent: false,
  });

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => api.getJobs(),
    refetchInterval: 10000,
  });

  const killMutation = useMutation({
    mutationFn: (jobId: number) => api.killJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setKillDialogOpen(false);
      setSelectedJob(null);
    },
  });

  const mtlsMutation = useMutation({
    mutationFn: (req: MTLSListenerRequest) => api.startMTLSListener(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setNewListenerOpen(false);
      resetForms();
    },
  });

  const httpMutation = useMutation({
    mutationFn: (req: HTTPListenerRequest) =>
      req.secure ? api.startHTTPSListener(req) : api.startHTTPListener(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setNewListenerOpen(false);
      resetForms();
    },
  });

  const dnsMutation = useMutation({
    mutationFn: (req: DNSListenerRequest) => api.startDNSListener(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setNewListenerOpen(false);
      resetForms();
    },
  });

  const wgMutation = useMutation({
    mutationFn: (req: WGListenerRequest) => api.startWGListener(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setNewListenerOpen(false);
      resetForms();
    },
  });

  const stageMutation = useMutation({
    mutationFn: (req: StageListenerRequest) => api.startStageListener(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setNewListenerOpen(false);
      resetForms();
    },
  });

  const resetForms = () => {
    setMtlsForm({ host: '0.0.0.0', port: 8888, persistent: false });
    setHttpForm({ domain: '', host: '0.0.0.0', port: 80, secure: false, website: '', persistent: false });
    setDnsForm({ domains: [], canaries: false, host: '0.0.0.0', port: 53, persistent: false });
    setDnsDomainsInput('');
    setWgForm({ host: '0.0.0.0', port: 53901, keyExchangePort: 1337, nPort: 8888, persistent: false });
    setStageForm({ protocol: 'tcp', host: '0.0.0.0', port: 8443, profileName: '', compress: true, persistent: false });
    setActiveTab('mtls');
  };

  const jobs = data?.jobs ?? [];
  const filteredJobs = jobs.filter((job) => {
    const searchLower = search.toLowerCase();
    return (
      job.name.toLowerCase().includes(searchLower) ||
      job.protocol.toLowerCase().includes(searchLower) ||
      job.description.toLowerCase().includes(searchLower) ||
      job.port.toString().includes(searchLower)
    );
  });

  // Count jobs by protocol
  const mtlsCount = jobs.filter((j) => j.protocol.toLowerCase() === 'mtls').length;
  const httpCount = jobs.filter((j) =>
    j.protocol.toLowerCase() === 'http' || j.protocol.toLowerCase() === 'https'
  ).length;
  const dnsCount = jobs.filter((j) => j.protocol.toLowerCase() === 'dns').length;
  const wgCount = jobs.filter((j) => j.protocol.toLowerCase() === 'wg' || j.protocol.toLowerCase() === 'wireguard').length;
  const stageCount = jobs.filter((j) => j.protocol.toLowerCase() === 'stage' || j.protocol.toLowerCase() === 'stager').length;

  const handleKillJob = (job: Job) => {
    setSelectedJob(job);
    setKillDialogOpen(true);
  };

  const handleStartMTLS = () => {
    mtlsMutation.mutate(mtlsForm);
  };

  const handleStartHTTP = () => {
    httpMutation.mutate(httpForm);
  };

  const handleStartDNS = () => {
    const domains = dnsDomainsInput.split(',').map((d) => d.trim()).filter(Boolean);
    dnsMutation.mutate({ ...dnsForm, domains });
  };

  const handleStartWG = () => {
    wgMutation.mutate(wgForm);
  };

  const handleStartStage = () => {
    stageMutation.mutate(stageForm);
  };

  const getProtocolIcon = (protocol: string) => {
    const p = protocol.toLowerCase();
    if (p === 'mtls') return <Lock className="h-4 w-4 text-green-500" />;
    if (p === 'http') return <Globe className="h-4 w-4 text-blue-500" />;
    if (p === 'https') return <Shield className="h-4 w-4 text-purple-500" />;
    if (p === 'dns') return <Radio className="h-4 w-4 text-orange-500" />;
    if (p === 'wg' || p === 'wireguard') return <Wifi className="h-4 w-4 text-cyan-500" />;
    if (p === 'stage' || p === 'stager') return <Package className="h-4 w-4 text-pink-500" />;
    return <Server className="h-4 w-4 text-muted-foreground" />;
  };

  const getProtocolBadgeColor = (protocol: string) => {
    const p = protocol.toLowerCase();
    if (p === 'mtls') return 'bg-green-500/10 text-green-500 border-green-500/20';
    if (p === 'http') return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    if (p === 'https') return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    if (p === 'dns') return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    if (p === 'wg' || p === 'wireguard') return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
    if (p === 'stage' || p === 'stager') return 'bg-pink-500/10 text-pink-500 border-pink-500/20';
    return '';
  };

  const isCreating = mtlsMutation.isPending || httpMutation.isPending || dnsMutation.isPending || wgMutation.isPending || stageMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Jobs</h1>
          <p className="text-muted-foreground">Active listeners and background jobs</p>
        </div>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Failed to load jobs: {error.message}</p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Jobs</h1>
          <p className="text-muted-foreground">
            {jobs.length} active listener{jobs.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950"
            onClick={() => setNewListenerOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Listener
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Lock className="h-4 w-4 text-green-500" />
              MTLS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mtlsCount}</div>
            <p className="text-xs text-muted-foreground">listener{mtlsCount !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-500" />
              HTTP/S
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{httpCount}</div>
            <p className="text-xs text-muted-foreground">listener{httpCount !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Radio className="h-4 w-4 text-orange-500" />
              DNS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dnsCount}</div>
            <p className="text-xs text-muted-foreground">listener{dnsCount !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wifi className="h-4 w-4 text-cyan-500" />
              WireGuard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wgCount}</div>
            <p className="text-xs text-muted-foreground">listener{wgCount !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4 text-pink-500" />
              Stage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stageCount}</div>
            <p className="text-xs text-muted-foreground">listener{stageCount !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Jobs</CardTitle>
          <CardDescription>Running listeners and services</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredJobs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active jobs</p>
              <p className="text-sm">Start a listener to begin receiving connections</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Protocol</TableHead>
                  <TableHead>Port</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-mono text-sm">{job.id}</TableCell>
                    <TableCell className="font-medium">{job.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getProtocolBadgeColor(job.protocol)}>
                        <span className="flex items-center gap-1.5">
                          {getProtocolIcon(job.protocol)}
                          {job.protocol.toUpperCase()}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">{job.port}</TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {job.description}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleKillJob(job)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Kill Job
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* New Listener Dialog */}
      <Dialog open={newListenerOpen} onOpenChange={setNewListenerOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Start New Listener</DialogTitle>
            <DialogDescription>Configure and start a new C2 listener</DialogDescription>
          </DialogHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="mtls" className="flex items-center gap-1.5">
                <Lock className="h-3 w-3" />
                MTLS
              </TabsTrigger>
              <TabsTrigger value="http" className="flex items-center gap-1.5">
                <Globe className="h-3 w-3" />
                HTTP/S
              </TabsTrigger>
              <TabsTrigger value="dns" className="flex items-center gap-1.5">
                <Radio className="h-3 w-3" />
                DNS
              </TabsTrigger>
              <TabsTrigger value="wg" className="flex items-center gap-1.5">
                <Wifi className="h-3 w-3" />
                WG
              </TabsTrigger>
              <TabsTrigger value="stage" className="flex items-center gap-1.5">
                <Package className="h-3 w-3" />
                Stage
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mtls" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mtls-host">Host</Label>
                  <Input
                    id="mtls-host"
                    placeholder="0.0.0.0"
                    value={mtlsForm.host}
                    onChange={(e) => setMtlsForm({ ...mtlsForm, host: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mtls-port">Port</Label>
                  <Input
                    id="mtls-port"
                    type="number"
                    placeholder="8888"
                    value={mtlsForm.port}
                    onChange={(e) => setMtlsForm({ ...mtlsForm, port: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Persistent</Label>
                  <p className="text-xs text-muted-foreground">Save listener configuration</p>
                </div>
                <Switch
                  checked={mtlsForm.persistent}
                  onCheckedChange={(checked) => setMtlsForm({ ...mtlsForm, persistent: checked })}
                />
              </div>
            </TabsContent>

            <TabsContent value="http" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="http-domain">Domain</Label>
                <Input
                  id="http-domain"
                  placeholder="example.com"
                  value={httpForm.domain}
                  onChange={(e) => setHttpForm({ ...httpForm, domain: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="http-host">Host</Label>
                  <Input
                    id="http-host"
                    placeholder="0.0.0.0"
                    value={httpForm.host}
                    onChange={(e) => setHttpForm({ ...httpForm, host: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="http-port">Port</Label>
                  <Input
                    id="http-port"
                    type="number"
                    placeholder="80"
                    value={httpForm.port}
                    onChange={(e) => setHttpForm({ ...httpForm, port: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="http-website">Website (optional)</Label>
                <Input
                  id="http-website"
                  placeholder="Website name"
                  value={httpForm.website}
                  onChange={(e) => setHttpForm({ ...httpForm, website: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>HTTPS (TLS)</Label>
                  <p className="text-xs text-muted-foreground">Enable TLS encryption</p>
                </div>
                <Switch
                  checked={httpForm.secure}
                  onCheckedChange={(checked) => setHttpForm({ ...httpForm, secure: checked, port: checked ? 443 : 80 })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Persistent</Label>
                  <p className="text-xs text-muted-foreground">Save listener configuration</p>
                </div>
                <Switch
                  checked={httpForm.persistent}
                  onCheckedChange={(checked) => setHttpForm({ ...httpForm, persistent: checked })}
                />
              </div>
            </TabsContent>

            <TabsContent value="dns" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="dns-domains">Domains (comma-separated)</Label>
                <Input
                  id="dns-domains"
                  placeholder="1.example.com, 2.example.com"
                  value={dnsDomainsInput}
                  onChange={(e) => setDnsDomainsInput(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dns-host">Host</Label>
                  <Input
                    id="dns-host"
                    placeholder="0.0.0.0"
                    value={dnsForm.host}
                    onChange={(e) => setDnsForm({ ...dnsForm, host: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dns-port">Port</Label>
                  <Input
                    id="dns-port"
                    type="number"
                    placeholder="53"
                    value={dnsForm.port}
                    onChange={(e) => setDnsForm({ ...dnsForm, port: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Canaries</Label>
                  <p className="text-xs text-muted-foreground">Enable DNS canaries</p>
                </div>
                <Switch
                  checked={dnsForm.canaries}
                  onCheckedChange={(checked) => setDnsForm({ ...dnsForm, canaries: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Persistent</Label>
                  <p className="text-xs text-muted-foreground">Save listener configuration</p>
                </div>
                <Switch
                  checked={dnsForm.persistent}
                  onCheckedChange={(checked) => setDnsForm({ ...dnsForm, persistent: checked })}
                />
              </div>
            </TabsContent>

            <TabsContent value="wg" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="wg-host">Host</Label>
                  <Input
                    id="wg-host"
                    placeholder="0.0.0.0"
                    value={wgForm.host}
                    onChange={(e) => setWgForm({ ...wgForm, host: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wg-port">Port</Label>
                  <Input
                    id="wg-port"
                    type="number"
                    placeholder="53901"
                    value={wgForm.port}
                    onChange={(e) => setWgForm({ ...wgForm, port: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="wg-kex">Key Exchange Port</Label>
                  <Input
                    id="wg-kex"
                    type="number"
                    placeholder="1337"
                    value={wgForm.keyExchangePort}
                    onChange={(e) => setWgForm({ ...wgForm, keyExchangePort: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wg-nport">Virtual TUN Port</Label>
                  <Input
                    id="wg-nport"
                    type="number"
                    placeholder="8888"
                    value={wgForm.nPort}
                    onChange={(e) => setWgForm({ ...wgForm, nPort: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Persistent</Label>
                  <p className="text-xs text-muted-foreground">Save listener configuration</p>
                </div>
                <Switch
                  checked={wgForm.persistent}
                  onCheckedChange={(checked) => setWgForm({ ...wgForm, persistent: checked })}
                />
              </div>
            </TabsContent>

            <TabsContent value="stage" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="stage-protocol">Protocol</Label>
                <select
                  id="stage-protocol"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={stageForm.protocol}
                  onChange={(e) => setStageForm({ ...stageForm, protocol: e.target.value })}
                >
                  <option value="tcp">TCP</option>
                  <option value="http">HTTP</option>
                  <option value="https">HTTPS</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stage-host">Host</Label>
                  <Input
                    id="stage-host"
                    placeholder="0.0.0.0"
                    value={stageForm.host}
                    onChange={(e) => setStageForm({ ...stageForm, host: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stage-port">Port</Label>
                  <Input
                    id="stage-port"
                    type="number"
                    placeholder="8443"
                    value={stageForm.port}
                    onChange={(e) => setStageForm({ ...stageForm, port: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stage-profile">Profile Name (optional)</Label>
                <Input
                  id="stage-profile"
                  placeholder="default"
                  value={stageForm.profileName}
                  onChange={(e) => setStageForm({ ...stageForm, profileName: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Compress</Label>
                  <p className="text-xs text-muted-foreground">Compress stager payload</p>
                </div>
                <Switch
                  checked={stageForm.compress}
                  onCheckedChange={(checked) => setStageForm({ ...stageForm, compress: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Persistent</Label>
                  <p className="text-xs text-muted-foreground">Save listener configuration</p>
                </div>
                <Switch
                  checked={stageForm.persistent}
                  onCheckedChange={(checked) => setStageForm({ ...stageForm, persistent: checked })}
                />
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewListenerOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950"
              onClick={() => {
                if (activeTab === 'mtls') handleStartMTLS();
                else if (activeTab === 'http') handleStartHTTP();
                else if (activeTab === 'dns') handleStartDNS();
                else if (activeTab === 'wg') handleStartWG();
                else if (activeTab === 'stage') handleStartStage();
              }}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Start Listener
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kill Job Dialog */}
      <Dialog open={killDialogOpen} onOpenChange={setKillDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kill Job</DialogTitle>
            <DialogDescription>
              Are you sure you want to kill job "{selectedJob?.name}" (ID: {selectedJob?.id})?
              This will stop the listener and close all associated connections.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKillDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedJob && killMutation.mutate(selectedJob.id)}
              disabled={killMutation.isPending}
            >
              {killMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Killing...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Kill Job
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
