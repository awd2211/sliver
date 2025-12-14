import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package,
  Search,
  Plus,
  RefreshCw,
  MoreHorizontal,
  Trash2,
  Info,
  Loader2,
  Download,
  Bug,
  Shield,
  Radio,
  Terminal,
  Clock,
  Zap,
  Network,
  Globe,
  Lock,
  AlertTriangle,
  X,
} from 'lucide-react';
import api from '@/lib/api';
import type { Implant, GenerateImplantRequest, GenerateStagerRequest, C2Config } from '@/types';

export function Implants() {
  const [search, setSearch] = useState('');
  const [selectedImplant, setSelectedImplant] = useState<Implant | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [stagerDialogOpen, setStagerDialogOpen] = useState(false);
  const [downloadingImplant, setDownloadingImplant] = useState<string | null>(null);
  const [generatingStager, setGeneratingStager] = useState(false);
  const queryClient = useQueryClient();

  // Form state for generating implant
  const [formData, setFormData] = useState<GenerateImplantRequest>({
    name: '',
    os: 'windows',
    arch: 'amd64',
    format: 'exe',
    isBeacon: false,
    beaconInterval: 60,
    beaconJitter: 30,
    reconnectInterval: 60,
    maxConnectionErrors: 1000,
    pollTimeout: 360,
    connectionStrategy: 'sequential',
    debug: false,
    evasion: true,
    obfuscateSymbols: true,
    sgn: false,
    limitDomainJoined: false,
    limitDatetime: '',
    limitHostname: '',
    limitUsername: '',
    limitFileExists: '',
    limitLocale: '',
    isService: false,
    runAtLoad: false,
    netGoEnabled: false,
    trafficEncodersEnabled: false,
  });

  // C2 configuration state
  const [mtlsC2, setMtlsC2] = useState<C2Config[]>([]);
  const [httpC2, setHttpC2] = useState<C2Config[]>([]);
  const [dnsC2, setDnsC2] = useState<C2Config[]>([]);
  const [wgC2, setWgC2] = useState<C2Config[]>([]);
  const [tcpPivotC2, setTcpPivotC2] = useState<C2Config[]>([]);
  const [namedPipeC2, setNamedPipeC2] = useState<C2Config[]>([]);
  const [canaryDomains, setCanaryDomains] = useState<string[]>([]);
  const [trafficEncoders, setTrafficEncoders] = useState<string[]>([]);

  const [newMtlsUrl, setNewMtlsUrl] = useState('');
  const [newHttpUrl, setNewHttpUrl] = useState('');
  const [newDnsUrl, setNewDnsUrl] = useState('');
  const [newWgUrl, setNewWgUrl] = useState('');
  const [newTcpPivotUrl, setNewTcpPivotUrl] = useState('');
  const [newNamedPipeUrl, setNewNamedPipeUrl] = useState('');
  const [newCanaryDomain, setNewCanaryDomain] = useState('');
  const [newTrafficEncoder, setNewTrafficEncoder] = useState('');

  // Stager form state
  const [stagerData, setStagerData] = useState<GenerateStagerRequest>({
    protocol: 'tcp',
    lhost: '',
    lport: 8443,
    arch: 'amd64',
    format: 'shellcode',
  });

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['implants'],
    queryFn: () => api.getImplants(),
  });

  const generateMutation = useMutation({
    mutationFn: (req: GenerateImplantRequest) => api.generateImplant(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['implants'] });
      setGenerateDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (name: string) => api.deleteImplant(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['implants'] });
      setDeleteDialogOpen(false);
      setSelectedImplant(null);
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: (name: string) => api.regenerateImplant(name),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['implants'] });
      toast.success('Implant regenerated', {
        description: `${data.implant.name} has been regenerated successfully`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to regenerate implant', {
        description: error.message,
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      os: 'windows',
      arch: 'amd64',
      format: 'exe',
      isBeacon: false,
      beaconInterval: 60,
      beaconJitter: 30,
      reconnectInterval: 60,
      maxConnectionErrors: 1000,
      pollTimeout: 360,
      connectionStrategy: 'sequential',
      debug: false,
      evasion: true,
      obfuscateSymbols: true,
      sgn: false,
      limitDomainJoined: false,
      limitDatetime: '',
      limitHostname: '',
      limitUsername: '',
      limitFileExists: '',
      limitLocale: '',
      isService: false,
      runAtLoad: false,
      netGoEnabled: false,
      trafficEncodersEnabled: false,
    });
    setMtlsC2([]);
    setHttpC2([]);
    setDnsC2([]);
    setWgC2([]);
    setTcpPivotC2([]);
    setNamedPipeC2([]);
    setCanaryDomains([]);
    setTrafficEncoders([]);
    setNewMtlsUrl('');
    setNewHttpUrl('');
    setNewDnsUrl('');
    setNewWgUrl('');
    setNewTcpPivotUrl('');
    setNewNamedPipeUrl('');
    setNewCanaryDomain('');
    setNewTrafficEncoder('');
  };

  const implants = data?.implants ?? [];
  const filteredImplants = implants.filter((implant) => {
    const searchLower = search.toLowerCase();
    return (
      implant.name.toLowerCase().includes(searchLower) ||
      implant.os.toLowerCase().includes(searchLower) ||
      implant.arch.toLowerCase().includes(searchLower) ||
      implant.format.toLowerCase().includes(searchLower)
    );
  });

  const sessionImplants = filteredImplants.filter((i) => !i.isBeacon);
  const beaconImplants = filteredImplants.filter((i) => i.isBeacon);

  const handleDelete = (implant: Implant) => {
    setSelectedImplant(implant);
    setDeleteDialogOpen(true);
  };

  const handleViewDetails = (implant: Implant) => {
    setSelectedImplant(implant);
    setDetailsOpen(true);
  };

  const handleDownload = useCallback(async (implant: Implant) => {
    setDownloadingImplant(implant.name);
    try {
      await api.downloadImplant(implant.name);
      toast.success(`Downloaded ${implant.name}`);
    } catch (error) {
      toast.error(`Failed to download: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDownloadingImplant(null);
    }
  }, []);

  const handleGenerateStager = async () => {
    if (!stagerData.lhost) {
      toast.error('Listener Host (LHOST) is required');
      return;
    }
    setGeneratingStager(true);
    try {
      await api.downloadStager(stagerData);
      toast.success('Stager downloaded successfully');
      setStagerDialogOpen(false);
      setStagerData({
        protocol: 'tcp',
        lhost: '',
        lport: 8443,
        arch: 'amd64',
        format: 'shellcode',
      });
    } catch (error) {
      toast.error(`Failed to generate stager: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGeneratingStager(false);
    }
  };

  const handleGenerate = () => {
    const request: GenerateImplantRequest = {
      ...formData,
      mtlsC2: mtlsC2.length > 0 ? mtlsC2 : undefined,
      httpC2: httpC2.length > 0 ? httpC2 : undefined,
      dnsC2: dnsC2.length > 0 ? dnsC2 : undefined,
      wgC2: wgC2.length > 0 ? wgC2 : undefined,
      tcpPivotC2: tcpPivotC2.length > 0 ? tcpPivotC2 : undefined,
      namedPipeC2: namedPipeC2.length > 0 ? namedPipeC2 : undefined,
      canaryDomains: canaryDomains.length > 0 ? canaryDomains : undefined,
      trafficEncoders: trafficEncoders.length > 0 ? trafficEncoders : undefined,
    };
    generateMutation.mutate(request);
  };

  // C2 helper functions
  const addC2 = (type: 'mtls' | 'http' | 'dns' | 'wg' | 'tcp' | 'pipe') => {
    const configs: Record<string, { list: C2Config[]; setList: React.Dispatch<React.SetStateAction<C2Config[]>>; url: string; setUrl: React.Dispatch<React.SetStateAction<string>> }> = {
      mtls: { list: mtlsC2, setList: setMtlsC2, url: newMtlsUrl, setUrl: setNewMtlsUrl },
      http: { list: httpC2, setList: setHttpC2, url: newHttpUrl, setUrl: setNewHttpUrl },
      dns: { list: dnsC2, setList: setDnsC2, url: newDnsUrl, setUrl: setNewDnsUrl },
      wg: { list: wgC2, setList: setWgC2, url: newWgUrl, setUrl: setNewWgUrl },
      tcp: { list: tcpPivotC2, setList: setTcpPivotC2, url: newTcpPivotUrl, setUrl: setNewTcpPivotUrl },
      pipe: { list: namedPipeC2, setList: setNamedPipeC2, url: newNamedPipeUrl, setUrl: setNewNamedPipeUrl },
    };
    const config = configs[type];
    if (config.url.trim()) {
      config.setList([...config.list, { priority: config.list.length, url: config.url.trim() }]);
      config.setUrl('');
    }
  };

  const removeC2 = (type: 'mtls' | 'http' | 'dns' | 'wg' | 'tcp' | 'pipe', index: number) => {
    const configs: Record<string, { list: C2Config[]; setList: React.Dispatch<React.SetStateAction<C2Config[]>> }> = {
      mtls: { list: mtlsC2, setList: setMtlsC2 },
      http: { list: httpC2, setList: setHttpC2 },
      dns: { list: dnsC2, setList: setDnsC2 },
      wg: { list: wgC2, setList: setWgC2 },
      tcp: { list: tcpPivotC2, setList: setTcpPivotC2 },
      pipe: { list: namedPipeC2, setList: setNamedPipeC2 },
    };
    const config = configs[type];
    config.setList(config.list.filter((_, i) => i !== index));
  };

  const addCanaryDomain = () => {
    if (newCanaryDomain.trim()) {
      setCanaryDomains([...canaryDomains, newCanaryDomain.trim()]);
      setNewCanaryDomain('');
    }
  };

  const removeCanaryDomain = (index: number) => {
    setCanaryDomains(canaryDomains.filter((_, i) => i !== index));
  };

  const addTrafficEncoder = () => {
    if (newTrafficEncoder.trim()) {
      setTrafficEncoders([...trafficEncoders, newTrafficEncoder.trim()]);
      setNewTrafficEncoder('');
    }
  };

  const removeTrafficEncoder = (index: number) => {
    setTrafficEncoders(trafficEncoders.filter((_, i) => i !== index));
  };

  const hasAnyC2 = mtlsC2.length > 0 || httpC2.length > 0 || dnsC2.length > 0 || wgC2.length > 0 || tcpPivotC2.length > 0 || namedPipeC2.length > 0;

  const getOsIcon = (os: string) => {
    const osLower = os.toLowerCase();
    if (osLower.includes('windows')) return '🪟';
    if (osLower.includes('linux')) return '🐧';
    if (osLower.includes('darwin') || osLower.includes('macos')) return '🍎';
    return '💻';
  };

  const getFormatColor = (format: string) => {
    switch (format.toLowerCase()) {
      case 'exe':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'dll':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'shellcode':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'shared':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getAvailableFormats = (os: string) => {
    switch (os) {
      case 'windows':
        return ['exe', 'dll', 'shellcode', 'service'];
      case 'linux':
        return ['executable', 'shared', 'shellcode'];
      case 'darwin':
        return ['executable', 'shared', 'shellcode'];
      default:
        return ['executable'];
    }
  };

  const getAvailableArchs = (os: string) => {
    switch (os) {
      case 'windows':
        return ['amd64', '386'];
      case 'linux':
        return ['amd64', '386', 'arm64', 'arm'];
      case 'darwin':
        return ['amd64', 'arm64'];
      default:
        return ['amd64'];
    }
  };

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
          <h1 className="text-3xl font-bold">Implants</h1>
          <p className="text-muted-foreground">Generated implant builds</p>
        </div>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Failed to load implants: {error.message}</p>
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
          <h1 className="text-3xl font-bold">Implants</h1>
          <p className="text-muted-foreground">
            {sessionImplants.length} sessions, {beaconImplants.length} beacons
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            variant="outline"
            onClick={() => setStagerDialogOpen(true)}
          >
            <Zap className="h-4 w-4 mr-2" />
            Generate Stager
          </Button>
          <Button
            className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950"
            onClick={() => setGenerateDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Generate Implant
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Implants</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{implants.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Session Mode</CardTitle>
            <Terminal className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessionImplants.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Beacon Mode</CardTitle>
            <Radio className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{beaconImplants.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Evasion</CardTitle>
            <Shield className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {implants.filter((i) => i.evasion).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search implants..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Implants</CardTitle>
          <CardDescription>Previously generated implant configurations</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredImplants.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No implants generated</p>
              <p className="text-sm">Generate an implant to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>OS/Arch</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Features</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredImplants.map((implant) => (
                  <TableRow
                    key={implant.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewDetails(implant)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{getOsIcon(implant.os)}</span>
                        <span>{implant.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {implant.os}/{implant.arch}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getFormatColor(implant.format)}>
                        {implant.format}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {implant.isBeacon ? (
                        <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                          <Radio className="h-3 w-3 mr-1" />
                          Beacon
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-green-500 text-green-500">
                          <Terminal className="h-3 w-3 mr-1" />
                          Session
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {implant.debug && (
                          <Badge variant="outline" className="text-xs">
                            <Bug className="h-3 w-3 mr-1" />
                            Debug
                          </Badge>
                        )}
                        {implant.evasion && (
                          <Badge variant="outline" className="text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            Evasion
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span className="text-xs">
                          {new Date(implant.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(implant)}>
                            <Info className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(implant);
                            }}
                            disabled={downloadingImplant === implant.name}
                          >
                            {downloadingImplant === implant.name ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4 mr-2" />
                            )}
                            {downloadingImplant === implant.name ? 'Downloading...' : 'Download'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              regenerateMutation.mutate(implant.name);
                            }}
                            disabled={regenerateMutation.isPending}
                          >
                            {regenerateMutation.isPending ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4 mr-2" />
                            )}
                            Regenerate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(implant)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
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

      {/* Generate Implant Dialog */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Implant</DialogTitle>
            <DialogDescription>Configure and generate a new implant build</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="c2">C2</TabsTrigger>
              <TabsTrigger value="connection">Connection</TabsTrigger>
              <TabsTrigger value="limits">Limits</TabsTrigger>
              <TabsTrigger value="evasion">Evasion</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            {/* Basic Tab */}
            <TabsContent value="basic" className="space-y-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Implant Name</Label>
                  <Input
                    id="name"
                    placeholder="my-implant"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="os">Operating System</Label>
                    <Select
                      value={formData.os}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          os: value,
                          format: getAvailableFormats(value)[0],
                          arch: getAvailableArchs(value)[0],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="windows">🪟 Windows</SelectItem>
                        <SelectItem value="linux">🐧 Linux</SelectItem>
                        <SelectItem value="darwin">🍎 macOS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="arch">Architecture</Label>
                    <Select
                      value={formData.arch}
                      onValueChange={(value) => setFormData({ ...formData, arch: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableArchs(formData.os).map((arch) => (
                          <SelectItem key={arch} value={arch}>
                            {arch}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="format">Output Format</Label>
                    <Select
                      value={formData.format}
                      onValueChange={(value) => setFormData({ ...formData, format: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableFormats(formData.os).map((format) => (
                          <SelectItem key={format} value={format}>
                            {format.toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Implant Mode</Label>
                    <div className="flex items-center gap-4 h-10">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="beacon-mode"
                          checked={formData.isBeacon}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, isBeacon: checked })
                          }
                        />
                        <Label htmlFor="beacon-mode" className="font-normal">
                          {formData.isBeacon ? 'Beacon Mode' : 'Session Mode'}
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>

                {formData.isBeacon && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="interval">Beacon Interval (seconds)</Label>
                      <Input
                        id="interval"
                        type="number"
                        min={1}
                        value={formData.beaconInterval}
                        onChange={(e) =>
                          setFormData({ ...formData, beaconInterval: parseInt(e.target.value) || 60 })
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="jitter">Jitter (%)</Label>
                      <Input
                        id="jitter"
                        type="number"
                        min={0}
                        max={100}
                        value={formData.beaconJitter}
                        onChange={(e) =>
                          setFormData({ ...formData, beaconJitter: parseInt(e.target.value) || 30 })
                        }
                      />
                    </div>
                  </div>
                )}

                {/* Output Format Options */}
                {formData.os === 'windows' && (
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Windows Service</Label>
                      <p className="text-xs text-muted-foreground">Build as Windows service</p>
                    </div>
                    <Switch
                      checked={formData.isService}
                      onCheckedChange={(checked) => setFormData({ ...formData, isService: checked })}
                    />
                  </div>
                )}

                {formData.os === 'darwin' && (
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Run At Load</Label>
                      <p className="text-xs text-muted-foreground">Execute when loaded (macOS dylib)</p>
                    </div>
                    <Switch
                      checked={formData.runAtLoad}
                      onCheckedChange={(checked) => setFormData({ ...formData, runAtLoad: checked })}
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            {/* C2 Configuration Tab */}
            <TabsContent value="c2" className="space-y-4">
              <div className="space-y-4">
                {/* MTLS */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Lock className="h-4 w-4" /> MTLS C2
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="mtls://192.168.1.1:8888"
                      value={newMtlsUrl}
                      onChange={(e) => setNewMtlsUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addC2('mtls')}
                    />
                    <Button variant="outline" onClick={() => addC2('mtls')}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {mtlsC2.map((c2, index) => (
                    <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                      <span className="text-sm font-mono">{c2.url}</span>
                      <Button variant="ghost" size="sm" onClick={() => removeC2('mtls', index)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* HTTP(S) */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Globe className="h-4 w-4" /> HTTP(S) C2
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://example.com"
                      value={newHttpUrl}
                      onChange={(e) => setNewHttpUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addC2('http')}
                    />
                    <Button variant="outline" onClick={() => addC2('http')}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {httpC2.map((c2, index) => (
                    <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                      <span className="text-sm font-mono">{c2.url}</span>
                      <Button variant="ghost" size="sm" onClick={() => removeC2('http', index)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* DNS */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Network className="h-4 w-4" /> DNS C2
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="dns://ns1.example.com"
                      value={newDnsUrl}
                      onChange={(e) => setNewDnsUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addC2('dns')}
                    />
                    <Button variant="outline" onClick={() => addC2('dns')}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {dnsC2.map((c2, index) => (
                    <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                      <span className="text-sm font-mono">{c2.url}</span>
                      <Button variant="ghost" size="sm" onClick={() => removeC2('dns', index)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* WireGuard */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Shield className="h-4 w-4" /> WireGuard C2
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="wg://192.168.1.1:53"
                      value={newWgUrl}
                      onChange={(e) => setNewWgUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addC2('wg')}
                    />
                    <Button variant="outline" onClick={() => addC2('wg')}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {wgC2.map((c2, index) => (
                    <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                      <span className="text-sm font-mono">{c2.url}</span>
                      <Button variant="ghost" size="sm" onClick={() => removeC2('wg', index)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* TCP Pivot */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Network className="h-4 w-4" /> TCP Pivot
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="tcp-pivot://192.168.1.1:9898"
                      value={newTcpPivotUrl}
                      onChange={(e) => setNewTcpPivotUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addC2('tcp')}
                    />
                    <Button variant="outline" onClick={() => addC2('tcp')}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {tcpPivotC2.map((c2, index) => (
                    <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                      <span className="text-sm font-mono">{c2.url}</span>
                      <Button variant="ghost" size="sm" onClick={() => removeC2('tcp', index)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Named Pipe (Windows) */}
                {formData.os === 'windows' && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Terminal className="h-4 w-4" /> Named Pipe
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="namedpipe://./pipe/mypipe"
                        value={newNamedPipeUrl}
                        onChange={(e) => setNewNamedPipeUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addC2('pipe')}
                      />
                      <Button variant="outline" onClick={() => addC2('pipe')}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {namedPipeC2.map((c2, index) => (
                      <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                        <span className="text-sm font-mono">{c2.url}</span>
                        <Button variant="ghost" size="sm" onClick={() => removeC2('pipe', index)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {!hasAnyC2 && (
                  <div className="text-center py-4 text-muted-foreground border border-dashed rounded-lg">
                    <Network className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Add at least one C2 endpoint</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Connection Tab */}
            <TabsContent value="connection" className="space-y-4">
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Reconnect Interval (seconds)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.reconnectInterval}
                      onChange={(e) =>
                        setFormData({ ...formData, reconnectInterval: parseInt(e.target.value) || 60 })
                      }
                    />
                    <p className="text-xs text-muted-foreground">Time between reconnection attempts</p>
                  </div>
                  <div className="grid gap-2">
                    <Label>Max Connection Errors</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.maxConnectionErrors}
                      onChange={(e) =>
                        setFormData({ ...formData, maxConnectionErrors: parseInt(e.target.value) || 1000 })
                      }
                    />
                    <p className="text-xs text-muted-foreground">Max errors before giving up</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Poll Timeout (seconds)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.pollTimeout}
                      onChange={(e) =>
                        setFormData({ ...formData, pollTimeout: parseInt(e.target.value) || 360 })
                      }
                    />
                    <p className="text-xs text-muted-foreground">Long poll timeout for HTTP(S)</p>
                  </div>
                  <div className="grid gap-2">
                    <Label>Connection Strategy</Label>
                    <Select
                      value={formData.connectionStrategy}
                      onValueChange={(value: 'sequential' | 'random') =>
                        setFormData({ ...formData, connectionStrategy: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sequential">Sequential</SelectItem>
                        <SelectItem value="random">Random</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">How to try C2 endpoints</p>
                  </div>
                </div>

                {/* WireGuard Settings */}
                {wgC2.length > 0 && (
                  <>
                    <div className="border-t pt-4">
                      <Label className="text-base font-medium">WireGuard Settings</Label>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="grid gap-2">
                        <Label>Peer Tunnel IP</Label>
                        <Input
                          placeholder="100.64.0.2"
                          value={formData.wgPeerTunIP || ''}
                          onChange={(e) => setFormData({ ...formData, wgPeerTunIP: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Key Exchange Port</Label>
                        <Input
                          type="number"
                          placeholder="1337"
                          value={formData.wgKeyExchangePort || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, wgKeyExchangePort: parseInt(e.target.value) || undefined })
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>TCP Comms Port</Label>
                        <Input
                          type="number"
                          placeholder="8888"
                          value={formData.wgTcpCommsPort || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, wgTcpCommsPort: parseInt(e.target.value) || undefined })
                          }
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>

            {/* Execution Limits Tab */}
            <TabsContent value="limits" className="space-y-4">
              <div className="space-y-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Execution limits prevent the implant from running unless conditions are met
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Domain Joined Only</Label>
                    <p className="text-xs text-muted-foreground">Only run on domain-joined machines</p>
                  </div>
                  <Switch
                    checked={formData.limitDomainJoined}
                    onCheckedChange={(checked) => setFormData({ ...formData, limitDomainJoined: checked })}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Limit Hostname</Label>
                  <Input
                    placeholder="WORKSTATION-01"
                    value={formData.limitHostname || ''}
                    onChange={(e) => setFormData({ ...formData, limitHostname: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Only run on hosts matching this name (regex)</p>
                </div>

                <div className="grid gap-2">
                  <Label>Limit Username</Label>
                  <Input
                    placeholder="admin"
                    value={formData.limitUsername || ''}
                    onChange={(e) => setFormData({ ...formData, limitUsername: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Only run as this user (regex)</p>
                </div>

                <div className="grid gap-2">
                  <Label>Limit DateTime</Label>
                  <Input
                    placeholder="2024-12-31T23:59:59"
                    value={formData.limitDatetime || ''}
                    onChange={(e) => setFormData({ ...formData, limitDatetime: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Only run before this date/time</p>
                </div>

                <div className="grid gap-2">
                  <Label>Limit File Exists</Label>
                  <Input
                    placeholder="C:\\Windows\\Temp\\flag.txt"
                    value={formData.limitFileExists || ''}
                    onChange={(e) => setFormData({ ...formData, limitFileExists: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Only run if this file exists</p>
                </div>

                <div className="grid gap-2">
                  <Label>Limit Locale</Label>
                  <Input
                    placeholder="en-US"
                    value={formData.limitLocale || ''}
                    onChange={(e) => setFormData({ ...formData, limitLocale: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Only run on systems with this locale</p>
                </div>
              </div>
            </TabsContent>

            {/* Evasion Tab */}
            <TabsContent value="evasion" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Debug Mode</Label>
                    <p className="text-xs text-muted-foreground">Include debug symbols and logging</p>
                  </div>
                  <Switch
                    checked={formData.debug}
                    onCheckedChange={(checked) => setFormData({ ...formData, debug: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Evasion</Label>
                    <p className="text-xs text-muted-foreground">Enable anti-analysis techniques</p>
                  </div>
                  <Switch
                    checked={formData.evasion}
                    onCheckedChange={(checked) => setFormData({ ...formData, evasion: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Obfuscate Symbols</Label>
                    <p className="text-xs text-muted-foreground">Obfuscate Go symbols in binary</p>
                  </div>
                  <Switch
                    checked={formData.obfuscateSymbols}
                    onCheckedChange={(checked) => setFormData({ ...formData, obfuscateSymbols: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Shikata Ga Nai (SGN)</Label>
                    <p className="text-xs text-muted-foreground">Polymorphic shellcode encoder</p>
                  </div>
                  <Switch
                    checked={formData.sgn}
                    onCheckedChange={(checked) => setFormData({ ...formData, sgn: checked })}
                  />
                </div>

                {/* Canary Domains */}
                <div className="border-t pt-4">
                  <div className="space-y-2">
                    <Label>Canary Domains</Label>
                    <p className="text-xs text-muted-foreground mb-2">DNS canaries for sandbox detection</p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="canary.example.com"
                        value={newCanaryDomain}
                        onChange={(e) => setNewCanaryDomain(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addCanaryDomain()}
                      />
                      <Button variant="outline" onClick={addCanaryDomain}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {canaryDomains.map((domain, index) => (
                      <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                        <span className="text-sm font-mono">{domain}</span>
                        <Button variant="ghost" size="sm" onClick={() => removeCanaryDomain(index)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Net/Go Enabled</Label>
                    <p className="text-xs text-muted-foreground">Use Go's net package (vs netgo)</p>
                  </div>
                  <Switch
                    checked={formData.netGoEnabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, netGoEnabled: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Traffic Encoders</Label>
                    <p className="text-xs text-muted-foreground">Enable WASM traffic encoders</p>
                  </div>
                  <Switch
                    checked={formData.trafficEncodersEnabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, trafficEncodersEnabled: checked })}
                  />
                </div>

                {formData.trafficEncodersEnabled && (
                  <div className="space-y-2">
                    <Label>Traffic Encoder Names</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="base64, gzip"
                        value={newTrafficEncoder}
                        onChange={(e) => setNewTrafficEncoder(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addTrafficEncoder()}
                      />
                      <Button variant="outline" onClick={addTrafficEncoder}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {trafficEncoders.map((encoder, index) => (
                      <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                        <span className="text-sm font-mono">{encoder}</span>
                        <Button variant="ghost" size="sm" onClick={() => removeTrafficEncoder(index)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid gap-2">
                  <Label>Template Name</Label>
                  <Input
                    placeholder="sliver (default)"
                    value={formData.templateName || ''}
                    onChange={(e) => setFormData({ ...formData, templateName: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Custom implant template name</p>
                </div>

                <div className="grid gap-2">
                  <Label>HTTP C2 Config Name</Label>
                  <Input
                    placeholder="default"
                    value={formData.httpC2ConfigName || ''}
                    onChange={(e) => setFormData({ ...formData, httpC2ConfigName: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">HTTP C2 profile configuration</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950"
              onClick={handleGenerate}
              disabled={generateMutation.isPending || !formData.name || !hasAnyC2}
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Package className="h-4 w-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Implant</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete implant "{selectedImplant?.name}"? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedImplant && deleteMutation.mutate(selectedImplant.name)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Implant Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedImplant && getOsIcon(selectedImplant.os)}
              {selectedImplant?.name}
            </DialogTitle>
            <DialogDescription>Implant configuration details</DialogDescription>
          </DialogHeader>
          {selectedImplant && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">ID</p>
                  <p className="font-mono text-xs break-all">{selectedImplant.id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Mode</p>
                  {selectedImplant.isBeacon ? (
                    <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                      Beacon
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-green-500 text-green-500">
                      Session
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground">Format</p>
                  <Badge className={getFormatColor(selectedImplant.format)}>
                    {selectedImplant.format}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Operating System</p>
                  <p>{selectedImplant.os}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Architecture</p>
                  <p>{selectedImplant.arch}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Debug Mode</p>
                  <p>{selectedImplant.debug ? 'Enabled' : 'Disabled'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Evasion</p>
                  <p>{selectedImplant.evasion ? 'Enabled' : 'Disabled'}</p>
                </div>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground">Created</p>
                <p>{new Date(selectedImplant.createdAt).toLocaleString()}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
            <Button
              className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950"
              onClick={() => selectedImplant && handleDownload(selectedImplant)}
              disabled={downloadingImplant === selectedImplant?.name}
            >
              {downloadingImplant === selectedImplant?.name ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Stager Dialog */}
      <Dialog open={stagerDialogOpen} onOpenChange={setStagerDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Generate Stager
            </DialogTitle>
            <DialogDescription>
              Create a small payload that connects back and loads the full implant
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stager-protocol">Protocol</Label>
                <Select
                  value={stagerData.protocol}
                  onValueChange={(value) => setStagerData({ ...stagerData, protocol: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tcp">TCP</SelectItem>
                    <SelectItem value="http">HTTP</SelectItem>
                    <SelectItem value="https">HTTPS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stager-arch">Architecture</Label>
                <Select
                  value={stagerData.arch}
                  onValueChange={(value) => setStagerData({ ...stagerData, arch: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amd64">x64 (amd64)</SelectItem>
                    <SelectItem value="386">x86 (386)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stager-lhost">Listener Host (LHOST)</Label>
                <Input
                  id="stager-lhost"
                  placeholder="192.168.1.100"
                  value={stagerData.lhost}
                  onChange={(e) => setStagerData({ ...stagerData, lhost: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stager-lport">Listener Port (LPORT)</Label>
                <Input
                  id="stager-lport"
                  type="number"
                  min={1}
                  max={65535}
                  value={stagerData.lport}
                  onChange={(e) => setStagerData({ ...stagerData, lport: parseInt(e.target.value) || 8443 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stager-format">Output Format</Label>
              <Select
                value={stagerData.format}
                onValueChange={(value) => setStagerData({ ...stagerData, format: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shellcode">Shellcode (Raw)</SelectItem>
                  <SelectItem value="exe">Executable (EXE)</SelectItem>
                  <SelectItem value="dll">DLL</SelectItem>
                  <SelectItem value="shared">Shared Library (SO)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stager-badchars">Bad Characters (optional)</Label>
              <Input
                id="stager-badchars"
                placeholder="\x00\x0a\x0d"
                value={stagerData.badChars || ''}
                onChange={(e) => setStagerData({ ...stagerData, badChars: e.target.value || undefined })}
              />
              <p className="text-xs text-muted-foreground">
                Characters to avoid in the stager payload (e.g., null bytes)
              </p>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <p className="font-medium mb-1">About Stagers</p>
              <p className="text-muted-foreground text-xs">
                Stagers are small payloads (~300-500 bytes) that establish initial connectivity and
                then download the full implant. They require a compatible listener running with
                stage encoding enabled.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStagerDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950"
              onClick={handleGenerateStager}
              disabled={generatingStager || !stagerData.lhost}
            >
              {generatingStager ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download Stager
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
