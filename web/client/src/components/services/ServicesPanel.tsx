import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Loader2,
  RefreshCw,
  Play,
  Square,
  RotateCcw,
  MoreHorizontal,
  Search,
  Server,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { WindowsService, ServiceControlRequest } from '@/types';

interface ServicesPanelProps {
  sessionId: string;
  isWindows: boolean;
}

export function ServicesPanel({ sessionId, isWindows }: ServicesPanelProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<WindowsService | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['services', sessionId],
    queryFn: () => api.getServices(sessionId),
    enabled: isWindows,
  });

  const controlMutation = useMutation({
    mutationFn: (req: ServiceControlRequest) => api.controlService(sessionId, req),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['services', sessionId] });
      toast.success(`Service ${variables.action} command sent`);
    },
    onError: (err: Error) => {
      toast.error(`Failed to control service: ${err.message}`);
    },
  });

  const getStatusBadgeVariant = (status: WindowsService['status']) => {
    switch (status) {
      case 'running':
        return 'default';
      case 'stopped':
        return 'secondary';
      case 'paused':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getStatusColor = (status: WindowsService['status']) => {
    switch (status) {
      case 'running':
        return 'text-green-500';
      case 'stopped':
        return 'text-red-500';
      case 'paused':
        return 'text-yellow-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStartTypeBadge = (startType: WindowsService['startType']) => {
    switch (startType) {
      case 'auto':
        return <Badge variant="outline">Auto</Badge>;
      case 'demand':
        return <Badge variant="secondary">Manual</Badge>;
      case 'disabled':
        return <Badge variant="destructive">Disabled</Badge>;
      case 'boot':
        return <Badge variant="default">Boot</Badge>;
      case 'system':
        return <Badge variant="default">System</Badge>;
      default:
        return <Badge variant="outline">{startType}</Badge>;
    }
  };

  if (!isWindows) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Services
          </CardTitle>
          <CardDescription>
            Service management is only available on Windows targets
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const services = data?.services || [];
  const filteredServices = services.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <CardTitle className="text-destructive">Error loading services</CardTitle>
          <CardDescription>{(error as Error).message}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Server className="h-4 w-4" />
                Windows Services ({services.length})
              </CardTitle>
              <CardDescription>
                View and control Windows services on the target
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search services..."
                  className="pl-9 w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredServices.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              {searchTerm ? 'No services match your search' : 'No services found'}
            </div>
          ) : (
            <div className="max-h-[500px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Type</TableHead>
                    <TableHead>PID</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServices.map((service) => (
                    <TableRow key={service.name}>
                      <TableCell className="font-mono text-xs">{service.name}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={service.displayName}>
                        {service.displayName}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getStatusBadgeVariant(service.status) as 'default' | 'secondary' | 'outline'}
                          className={getStatusColor(service.status)}
                        >
                          {service.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStartTypeBadge(service.startType)}</TableCell>
                      <TableCell className="font-mono">
                        {service.pid > 0 ? service.pid : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedService(service);
                                setDetailDialogOpen(true);
                              }}
                            >
                              <Info className="h-4 w-4 mr-2" />
                              Details
                            </DropdownMenuItem>
                            {service.status !== 'running' && (
                              <DropdownMenuItem
                                onClick={() =>
                                  controlMutation.mutate({ name: service.name, action: 'start' })
                                }
                                disabled={controlMutation.isPending}
                              >
                                <Play className="h-4 w-4 mr-2" />
                                Start
                              </DropdownMenuItem>
                            )}
                            {service.status === 'running' && (
                              <DropdownMenuItem
                                onClick={() =>
                                  controlMutation.mutate({ name: service.name, action: 'stop' })
                                }
                                disabled={controlMutation.isPending}
                              >
                                <Square className="h-4 w-4 mr-2" />
                                Stop
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() =>
                                controlMutation.mutate({ name: service.name, action: 'restart' })
                              }
                              disabled={controlMutation.isPending}
                            >
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Restart
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Service Details</DialogTitle>
            <DialogDescription>{selectedService?.displayName}</DialogDescription>
          </DialogHeader>
          {selectedService && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Service Name</label>
                  <p className="font-mono">{selectedService.name}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Status</label>
                  <p>
                    <Badge
                      variant={getStatusBadgeVariant(selectedService.status) as 'default' | 'secondary' | 'outline'}
                      className={getStatusColor(selectedService.status)}
                    >
                      {selectedService.status}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Start Type</label>
                  <p>{getStartTypeBadge(selectedService.startType)}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">PID</label>
                  <p className="font-mono">{selectedService.pid > 0 ? selectedService.pid : 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Account</label>
                  <p className="font-mono">{selectedService.account || 'N/A'}</p>
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Description</label>
                <p className="text-sm">{selectedService.description || 'No description available'}</p>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Binary Path</label>
                <p className="font-mono text-xs break-all bg-muted p-2 rounded">
                  {selectedService.binPath || 'N/A'}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              Close
            </Button>
            {selectedService && selectedService.status !== 'running' && (
              <Button
                onClick={() => {
                  controlMutation.mutate({ name: selectedService.name, action: 'start' });
                  setDetailDialogOpen(false);
                }}
                disabled={controlMutation.isPending}
              >
                <Play className="h-4 w-4 mr-2" />
                Start Service
              </Button>
            )}
            {selectedService && selectedService.status === 'running' && (
              <Button
                variant="destructive"
                onClick={() => {
                  controlMutation.mutate({ name: selectedService.name, action: 'stop' });
                  setDetailDialogOpen(false);
                }}
                disabled={controlMutation.isPending}
              >
                <Square className="h-4 w-4 mr-2" />
                Stop Service
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
