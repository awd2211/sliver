import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  Radio,
  Search,
  RefreshCw,
  MoreHorizontal,
  Skull,
  Info,
  Monitor,
  Loader2,
  Wifi,
  WifiOff,
  Clock,
  Timer,
  CheckSquare,
  XSquare,
  Square,
} from 'lucide-react';
import api from '@/lib/api';
import type { Beacon } from '@/types';

export function Beacons() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedBeacon, setSelectedBeacon] = useState<Beacon | null>(null);
  const [killDialogOpen, setKillDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkKillDialogOpen, setBulkKillDialogOpen] = useState(false);
  const [bulkKilling, setBulkKilling] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['beacons'],
    queryFn: () => api.getBeacons(),
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  const killMutation = useMutation({
    mutationFn: (beaconId: string) => api.killBeacon(beaconId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beacons'] });
      setKillDialogOpen(false);
      setSelectedBeacon(null);
    },
  });

  const beacons = data?.beacons ?? [];
  const filteredBeacons = beacons.filter((beacon) => {
    const searchLower = search.toLowerCase();
    return (
      beacon.name.toLowerCase().includes(searchLower) ||
      beacon.hostname.toLowerCase().includes(searchLower) ||
      beacon.username.toLowerCase().includes(searchLower) ||
      beacon.remoteAddress.toLowerCase().includes(searchLower) ||
      beacon.os.toLowerCase().includes(searchLower)
    );
  });

  const activeBeacons = filteredBeacons.filter((b) => !b.isDead);
  const deadBeacons = filteredBeacons.filter((b) => b.isDead);

  const handleKillBeacon = (beacon: Beacon) => {
    setSelectedBeacon(beacon);
    setKillDialogOpen(true);
  };

  const handleViewDetails = (beacon: Beacon) => {
    navigate(`/beacons/${beacon.id}`);
  };

  // Bulk selection handlers
  const toggleSelectBeacon = useCallback((beaconId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(beaconId)) {
        newSet.delete(beaconId);
      } else {
        newSet.add(beaconId);
      }
      return newSet;
    });
  }, []);

  const selectAllActive = useCallback(() => {
    setSelectedIds(new Set(activeBeacons.map(b => b.id)));
  }, [activeBeacons]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleBulkKill = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBulkKilling(true);
    let succeeded = 0;
    let failed = 0;

    for (const beaconId of selectedIds) {
      try {
        await api.killBeacon(beaconId);
        succeeded++;
      } catch {
        failed++;
      }
    }

    setBulkKilling(false);
    setBulkKillDialogOpen(false);
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ['beacons'] });

    if (failed === 0) {
      toast.success(`Successfully killed ${succeeded} beacon${succeeded !== 1 ? 's' : ''}`);
    } else {
      toast.warning(`Killed ${succeeded} beacon${succeeded !== 1 ? 's' : ''}, ${failed} failed`);
    }
  }, [selectedIds, queryClient]);

  const getOsIcon = (os: string) => {
    const osLower = os.toLowerCase();
    if (osLower.includes('windows')) return '🪟';
    if (osLower.includes('linux')) return '🐧';
    if (osLower.includes('darwin') || osLower.includes('macos')) return '🍎';
    return '💻';
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffSeconds = Math.floor(Math.abs(diffMs) / 1000);
    const isPast = diffMs < 0;

    let timeStr;
    if (diffSeconds < 60) timeStr = `${diffSeconds}s`;
    else if (diffSeconds < 3600) timeStr = `${Math.floor(diffSeconds / 60)}m`;
    else if (diffSeconds < 86400) timeStr = `${Math.floor(diffSeconds / 3600)}h`;
    else timeStr = `${Math.floor(diffSeconds / 86400)}d`;

    return isPast ? `${timeStr} ago` : `in ${timeStr}`;
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
          <h1 className="text-3xl font-bold">Beacons</h1>
          <p className="text-muted-foreground">Asynchronous callback implants</p>
        </div>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Failed to load beacons: {error.message}</p>
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
          <h1 className="text-3xl font-bold">Beacons</h1>
          <p className="text-muted-foreground">
            {activeBeacons.length} active, {deadBeacons.length} dead
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 p-3 bg-muted rounded-lg border">
          <span className="text-sm font-medium">
            {selectedIds.size} beacon{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={clearSelection}
          >
            <XSquare className="h-4 w-4 mr-2" />
            Clear Selection
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setBulkKillDialogOpen(true)}
          >
            <Skull className="h-4 w-4 mr-2" />
            Kill Selected
          </Button>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search beacons..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Beacons</CardTitle>
          <CardDescription>Click on a beacon to view details and interact</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredBeacons.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Radio className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active beacons</p>
              <p className="text-sm">Beacons will appear here when implants callback</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <div className="flex items-center gap-2">
                      {activeBeacons.length > 0 && (
                        selectedIds.size === activeBeacons.length ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => { e.stopPropagation(); clearSelection(); }}
                          >
                            <CheckSquare className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => { e.stopPropagation(); selectAllActive(); }}
                          >
                            <Square className="h-4 w-4" />
                          </Button>
                        )
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="w-[50px]">Status</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Host</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>OS/Arch</TableHead>
                  <TableHead>Transport</TableHead>
                  <TableHead>Interval</TableHead>
                  <TableHead>Next Checkin</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBeacons.map((beacon) => (
                  <TableRow
                    key={beacon.id}
                    className={`${beacon.isDead ? 'opacity-50' : 'cursor-pointer hover:bg-muted/50'} ${selectedIds.has(beacon.id) ? 'bg-muted/30' : ''}`}
                    onClick={() => !beacon.isDead && handleViewDetails(beacon)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {!beacon.isDead && (
                        <Checkbox
                          checked={selectedIds.has(beacon.id)}
                          onCheckedChange={() => toggleSelectBeacon(beacon.id)}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {beacon.isDead ? (
                        <WifiOff className="h-4 w-4 text-destructive" />
                      ) : (
                        <Wifi className="h-4 w-4 text-green-500" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{getOsIcon(beacon.os)}</span>
                        <span>{beacon.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4 text-muted-foreground" />
                        {beacon.hostname}
                      </div>
                    </TableCell>
                    <TableCell>{beacon.username}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {beacon.os}/{beacon.arch}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{beacon.transport}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Timer className="h-3 w-3" />
                        <span className="text-xs">
                          {formatDuration(beacon.interval)} ±{beacon.jitter}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span className="text-xs">{formatRelativeTime(beacon.nextCheckin)}</span>
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
                          <DropdownMenuItem onClick={() => handleViewDetails(beacon)}>
                            <Info className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {!beacon.isDead && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleKillBeacon(beacon)}
                              >
                                <Skull className="h-4 w-4 mr-2" />
                                Kill Beacon
                              </DropdownMenuItem>
                            </>
                          )}
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

      {/* Kill Beacon Dialog */}
      <Dialog open={killDialogOpen} onOpenChange={setKillDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kill Beacon</DialogTitle>
            <DialogDescription>
              Are you sure you want to kill beacon "{selectedBeacon?.name}"? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKillDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedBeacon && killMutation.mutate(selectedBeacon.id)}
              disabled={killMutation.isPending}
            >
              {killMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Killing...
                </>
              ) : (
                <>
                  <Skull className="h-4 w-4 mr-2" />
                  Kill Beacon
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Kill Dialog */}
      <Dialog open={bulkKillDialogOpen} onOpenChange={setBulkKillDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Skull className="h-5 w-5 text-destructive" />
              Kill {selectedIds.size} Beacon{selectedIds.size !== 1 ? 's' : ''}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to kill {selectedIds.size} selected beacon{selectedIds.size !== 1 ? 's' : ''}?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-2">Beacons to be killed:</p>
            <div className="max-h-32 overflow-auto space-y-1">
              {[...selectedIds].map(id => {
                const beacon = beacons.find(b => b.id === id);
                return beacon ? (
                  <div key={id} className="text-sm flex items-center gap-2 p-2 bg-muted rounded">
                    <span>{getOsIcon(beacon.os)}</span>
                    <span className="font-medium">{beacon.name}</span>
                    <span className="text-muted-foreground">({beacon.hostname})</span>
                  </div>
                ) : null;
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkKillDialogOpen(false)} disabled={bulkKilling}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkKill}
              disabled={bulkKilling}
            >
              {bulkKilling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Killing {selectedIds.size}...
                </>
              ) : (
                <>
                  <Skull className="h-4 w-4 mr-2" />
                  Kill {selectedIds.size} Beacon{selectedIds.size !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
