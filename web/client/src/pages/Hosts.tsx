import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Monitor, Search, ChevronDown, ChevronRight, AlertTriangle, Loader2, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import type { Host, CreateIOCRequest } from '@/types';

export function Hosts() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedHosts, setExpandedHosts] = useState<Set<string>>(new Set());

  const { data, isLoading, error } = useQuery({
    queryKey: ['hosts'],
    queryFn: () => api.getHosts(),
  });

  const hosts = data?.hosts || [];

  const filteredHosts = hosts.filter((host) => {
    const query = searchQuery.toLowerCase();
    return (
      host.hostname.toLowerCase().includes(query) ||
      host.osVersion.toLowerCase().includes(query) ||
      host.locale.toLowerCase().includes(query)
    );
  });

  const toggleExpanded = (id: string) => {
    setExpandedHosts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getOsIcon = (osVersion: string): string => {
    const os = osVersion.toLowerCase();
    if (os.includes('windows')) return '🪟';
    if (os.includes('linux')) return '🐧';
    if (os.includes('darwin') || os.includes('macos')) return '🍎';
    return '💻';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Hosts</h1>
        <p className="text-muted-foreground">Discovered and compromised hosts</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search hosts..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Badge variant="secondary">{filteredHosts.length} hosts</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Hosts</CardTitle>
          <CardDescription>Hosts discovered during operations</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              <p>Failed to load hosts</p>
            </div>
          ) : filteredHosts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hosts discovered</p>
              <p className="text-sm">Hosts will appear here as you interact with implants</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredHosts.map((host) => (
                <HostRow
                  key={host.id}
                  host={host}
                  isExpanded={expandedHosts.has(host.id)}
                  onToggle={() => toggleExpanded(host.id)}
                  getOsIcon={getOsIcon}
                  onViewDetails={() => navigate(`/hosts/${host.id}`)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function HostRow({
  host,
  isExpanded,
  onToggle,
  getOsIcon,
  onViewDetails,
}: {
  host: Host;
  isExpanded: boolean;
  onToggle: () => void;
  getOsIcon: (os: string) => string;
  onViewDetails: () => void;
}) {
  const queryClient = useQueryClient();
  const [addIOCDialogOpen, setAddIOCDialogOpen] = useState(false);
  const [newIOC, setNewIOC] = useState<CreateIOCRequest>({
    path: '',
    fileHash: '',
    iocType: 'file',
    description: '',
  });

  const addIOCMutation = useMutation({
    mutationFn: (ioc: CreateIOCRequest) => api.addHostIOC(host.id, ioc),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hosts'] });
      toast.success('IOC added');
      setAddIOCDialogOpen(false);
      setNewIOC({ path: '', fileHash: '', iocType: 'file', description: '' });
    },
    onError: (error: Error) => {
      toast.error('Failed to add IOC', { description: error.message });
    },
  });

  const deleteIOCMutation = useMutation({
    mutationFn: (iocId: string) => api.deleteHostIOC(host.id, iocId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hosts'] });
      toast.success('IOC deleted');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete IOC', { description: error.message });
    },
  });

  return (
    <>
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <div className="border rounded-lg">
          <CollapsibleTrigger asChild>
            <div className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer">
              <div className="text-muted-foreground">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
              <div className="text-2xl">{getOsIcon(host.osVersion)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{host.hostname}</span>
                  {host.iocs && host.iocs.length > 0 && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {host.iocs.length} IOC{host.iocs.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">{host.osVersion}</div>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <div>First seen</div>
                <div>{formatDistanceToNow(new Date(host.firstContact), { addSuffix: true })}</div>
              </div>
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onViewDetails(); }}>
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="border-t p-4 bg-muted/20">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <div className="text-xs text-muted-foreground uppercase">Locale</div>
                  <div className="font-mono text-sm">{host.locale || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase">Extensions</div>
                  <div className="text-sm">{host.extensions?.length || 0} installed</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase">IOCs</div>
                  <div className="text-sm">{host.iocs?.length || 0} indicators</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase">First Contact</div>
                  <div className="text-sm">{new Date(host.firstContact).toLocaleString()}</div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">Indicators of Compromise</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddIOCDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add IOC
                  </Button>
                </div>
                {host.iocs && host.iocs.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Path</TableHead>
                        <TableHead>File Hash</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {host.iocs.map((ioc) => (
                        <TableRow key={ioc.id}>
                          <TableCell>
                            <Badge variant="outline">{ioc.iocType || 'file'}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{ioc.path}</TableCell>
                          <TableCell className="font-mono text-xs truncate max-w-[200px]">
                            {ioc.fileHash || '-'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {ioc.description || '-'}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => deleteIOCMutation.mutate(ioc.id)}
                              disabled={deleteIOCMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    No IOCs tracked for this host
                  </div>
                )}
              </div>

              {host.extensions && host.extensions.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Installed Extensions</h4>
                  <div className="flex flex-wrap gap-2">
                    {host.extensions.map((ext, idx) => (
                      <Badge key={idx} variant="outline">{ext}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Add IOC Dialog */}
      <Dialog open={addIOCDialogOpen} onOpenChange={setAddIOCDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add IOC</DialogTitle>
            <DialogDescription>
              Add a new Indicator of Compromise for {host.hostname}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={newIOC.iocType}
                onValueChange={(v) => setNewIOC({ ...newIOC, iocType: v as CreateIOCRequest['iocType'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="file">File</SelectItem>
                  <SelectItem value="registry">Registry</SelectItem>
                  <SelectItem value="network">Network</SelectItem>
                  <SelectItem value="process">Process</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Path</Label>
              <Input
                placeholder="C:\path\to\file.exe or registry key"
                value={newIOC.path}
                onChange={(e) => setNewIOC({ ...newIOC, path: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>File Hash (optional)</Label>
              <Input
                placeholder="SHA256 hash"
                value={newIOC.fileHash}
                onChange={(e) => setNewIOC({ ...newIOC, fileHash: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                placeholder="Brief description"
                value={newIOC.description}
                onChange={(e) => setNewIOC({ ...newIOC, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddIOCDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => addIOCMutation.mutate(newIOC)}
              disabled={!newIOC.path || addIOCMutation.isPending}
            >
              {addIOCMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add IOC
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
