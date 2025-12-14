import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Terminal,
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
  CheckSquare,
  XSquare,
  Square,
} from 'lucide-react';
import api from '@/lib/api';
import type { Session } from '@/types';

export function Sessions() {
  const [search, setSearch] = useState('');
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [killDialogOpen, setKillDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkKillDialogOpen, setBulkKillDialogOpen] = useState(false);
  const [bulkKilling, setBulkKilling] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.getSessions(),
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  const killMutation = useMutation({
    mutationFn: (sessionId: string) => api.killSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setKillDialogOpen(false);
      setSelectedSession(null);
    },
  });

  const sessions = data?.sessions ?? [];
  const filteredSessions = sessions.filter((session) => {
    const searchLower = search.toLowerCase();
    return (
      session.name.toLowerCase().includes(searchLower) ||
      session.hostname.toLowerCase().includes(searchLower) ||
      session.username.toLowerCase().includes(searchLower) ||
      session.remoteAddress.toLowerCase().includes(searchLower) ||
      session.os.toLowerCase().includes(searchLower)
    );
  });

  const activeSessions = filteredSessions.filter((s) => !s.isDead);
  const deadSessions = filteredSessions.filter((s) => s.isDead);

  const handleKillSession = (session: Session) => {
    setSelectedSession(session);
    setKillDialogOpen(true);
  };

  const handleViewDetails = (session: Session) => {
    navigate(`/sessions/${session.id}`);
  };

  // Bulk selection handlers
  const toggleSelectSession = useCallback((sessionId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  }, []);

  const selectAllActive = useCallback(() => {
    setSelectedIds(new Set(activeSessions.map(s => s.id)));
  }, [activeSessions]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleBulkKill = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBulkKilling(true);
    let succeeded = 0;
    let failed = 0;

    for (const sessionId of selectedIds) {
      try {
        await api.killSession(sessionId);
        succeeded++;
      } catch {
        failed++;
      }
    }

    setBulkKilling(false);
    setBulkKillDialogOpen(false);
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ['sessions'] });

    if (failed === 0) {
      toast.success(`Successfully killed ${succeeded} session${succeeded !== 1 ? 's' : ''}`);
    } else {
      toast.warning(`Killed ${succeeded} session${succeeded !== 1 ? 's' : ''}, ${failed} failed`);
    }
  }, [selectedIds, queryClient]);

  const getOsIcon = (os: string) => {
    const osLower = os.toLowerCase();
    if (osLower.includes('windows')) return '🪟';
    if (osLower.includes('linux')) return '🐧';
    if (osLower.includes('darwin') || osLower.includes('macos')) return '🍎';
    return '💻';
  };

  const formatLastCheckin = (lastCheckin: string) => {
    const date = new Date(lastCheckin);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);

    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    return `${Math.floor(diffSeconds / 86400)}d ago`;
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
          <h1 className="text-3xl font-bold">Sessions</h1>
          <p className="text-muted-foreground">Active interactive shell sessions</p>
        </div>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Failed to load sessions: {error.message}</p>
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
          <h1 className="text-3xl font-bold">Sessions</h1>
          <p className="text-muted-foreground">
            {activeSessions.length} active, {deadSessions.length} dead
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
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 p-3 bg-muted rounded-lg border">
          <span className="text-sm font-medium">
            {selectedIds.size} session{selectedIds.size !== 1 ? 's' : ''} selected
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
            placeholder="Search sessions..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Sessions</CardTitle>
          <CardDescription>Click on a session to interact with it</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSessions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active sessions</p>
              <p className="text-sm">Sessions will appear here when implants connect</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <div className="flex items-center gap-2">
                      {activeSessions.length > 0 && (
                        selectedIds.size === activeSessions.length ? (
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
                  <TableHead>Remote</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSessions.map((session) => (
                  <TableRow
                    key={session.id}
                    className={`${session.isDead ? 'opacity-50' : 'cursor-pointer hover:bg-muted/50'} ${selectedIds.has(session.id) ? 'bg-muted/30' : ''}`}
                    onClick={() => !session.isDead && handleViewDetails(session)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {!session.isDead && (
                        <Checkbox
                          checked={selectedIds.has(session.id)}
                          onCheckedChange={() => toggleSelectSession(session.id)}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {session.isDead ? (
                        <WifiOff className="h-4 w-4 text-destructive" />
                      ) : (
                        <Wifi className="h-4 w-4 text-green-500" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{getOsIcon(session.os)}</span>
                        <span>{session.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4 text-muted-foreground" />
                        {session.hostname}
                      </div>
                    </TableCell>
                    <TableCell>{session.username}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {session.os}/{session.arch}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{session.transport}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {session.remoteAddress}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span className="text-xs">{formatLastCheckin(session.lastCheckin)}</span>
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
                          <DropdownMenuItem onClick={() => handleViewDetails(session)}>
                            <Info className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {!session.isDead && (
                            <>
                              <DropdownMenuItem>
                                <Terminal className="h-4 w-4 mr-2" />
                                Open Shell
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleKillSession(session)}
                              >
                                <Skull className="h-4 w-4 mr-2" />
                                Kill Session
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

      {/* Kill Session Dialog */}
      <Dialog open={killDialogOpen} onOpenChange={setKillDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kill Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to kill session "{selectedSession?.name}"? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKillDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedSession && killMutation.mutate(selectedSession.id)}
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
                  Kill Session
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
              Kill {selectedIds.size} Session{selectedIds.size !== 1 ? 's' : ''}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to kill {selectedIds.size} selected session{selectedIds.size !== 1 ? 's' : ''}?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-2">Sessions to be killed:</p>
            <div className="max-h-32 overflow-auto space-y-1">
              {[...selectedIds].map(id => {
                const session = sessions.find(s => s.id === id);
                return session ? (
                  <div key={id} className="text-sm flex items-center gap-2 p-2 bg-muted rounded">
                    <span>{getOsIcon(session.os)}</span>
                    <span className="font-medium">{session.name}</span>
                    <span className="text-muted-foreground">({session.hostname})</span>
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
                  Kill {selectedIds.size} Session{selectedIds.size !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
