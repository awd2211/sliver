import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Search,
  RefreshCw,
  MoreHorizontal,
  Loader2,
  Skull,
  ArrowRight,
  Cpu,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { ProcessInfo } from '@/types';

interface ProcessListProps {
  sessionId: string;
  currentPid?: number;
}

export function ProcessList({ sessionId, currentPid }: ProcessListProps) {
  const [search, setSearch] = useState('');
  const [selectedProcess, setSelectedProcess] = useState<ProcessInfo | null>(null);
  const [killDialogOpen, setKillDialogOpen] = useState(false);
  const [migrateDialogOpen, setMigrateDialogOpen] = useState(false);
  const [procdumpDialogOpen, setProcdumpDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['processes', sessionId],
    queryFn: () => api.getProcesses(sessionId),
    enabled: !!sessionId,
  });

  const killMutation = useMutation({
    mutationFn: (pid: number) => api.killProcess(sessionId, pid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes', sessionId] });
      setKillDialogOpen(false);
      setSelectedProcess(null);
    },
  });

  const migrateMutation = useMutation({
    mutationFn: (pid: number) => api.migrateToProcess(sessionId, pid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setMigrateDialogOpen(false);
      setSelectedProcess(null);
    },
  });

  const procdumpMutation = useMutation({
    mutationFn: (pid: number) => api.procdump(sessionId, { pid }),
    onSuccess: () => {
      toast.success('Process dump downloaded successfully');
      setProcdumpDialogOpen(false);
      setSelectedProcess(null);
    },
    onError: (err: Error) => {
      toast.error(`Procdump failed: ${err.message}`);
    },
  });

  const processes = data?.processes ?? [];
  const filteredProcesses = processes.filter((proc) => {
    const searchLower = search.toLowerCase();
    return (
      proc.executable.toLowerCase().includes(searchLower) ||
      proc.owner.toLowerCase().includes(searchLower) ||
      proc.pid.toString().includes(searchLower)
    );
  });

  const handleKill = (proc: ProcessInfo) => {
    setSelectedProcess(proc);
    setKillDialogOpen(true);
  };

  const handleMigrate = (proc: ProcessInfo) => {
    setSelectedProcess(proc);
    setMigrateDialogOpen(true);
  };

  const handleProcdump = (proc: ProcessInfo) => {
    setSelectedProcess(proc);
    setProcdumpDialogOpen(true);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            Process List
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 w-8"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search processes..."
            className="pl-10 h-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">Failed to load processes</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : filteredProcesses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Cpu className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">No processes found</p>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">PID</TableHead>
                  <TableHead className="w-[80px]">PPID</TableHead>
                  <TableHead>Executable</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead className="w-[80px]">Arch</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProcesses.map((proc) => (
                  <TableRow
                    key={proc.pid}
                    className={proc.pid === currentPid ? 'bg-yellow-500/10' : ''}
                  >
                    <TableCell className="font-mono">
                      <div className="flex items-center gap-2">
                        {proc.pid}
                        {proc.pid === currentPid && (
                          <Badge variant="outline" className="text-xs bg-yellow-500/20 text-yellow-500 border-yellow-500/50">
                            Current
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {proc.ppid}
                    </TableCell>
                    <TableCell>
                      <span className="truncate block max-w-[200px]" title={proc.executable}>
                        {proc.executable}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {proc.owner}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {proc.architecture}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleMigrate(proc)}
                            disabled={proc.pid === currentPid}
                          >
                            <ArrowRight className="h-4 w-4 mr-2" />
                            Migrate to process
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleProcdump(proc)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Dump memory
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleKill(proc)}
                            disabled={proc.pid === currentPid}
                          >
                            <Skull className="h-4 w-4 mr-2" />
                            Kill process
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>

      {/* Kill Process Dialog */}
      <Dialog open={killDialogOpen} onOpenChange={setKillDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kill Process</DialogTitle>
            <DialogDescription>
              Are you sure you want to kill process {selectedProcess?.pid} ({selectedProcess?.executable})?
              This may cause instability on the target system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKillDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedProcess && killMutation.mutate(selectedProcess.pid)}
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
                  Kill Process
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Migrate Process Dialog */}
      <Dialog open={migrateDialogOpen} onOpenChange={setMigrateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Migrate to Process</DialogTitle>
            <DialogDescription>
              Are you sure you want to migrate the implant to process {selectedProcess?.pid} ({selectedProcess?.executable})?
              This will move the implant to the new process context.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMigrateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedProcess && migrateMutation.mutate(selectedProcess.pid)}
              disabled={migrateMutation.isPending}
              className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950"
            >
              {migrateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Migrating...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Migrate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Procdump Dialog */}
      <Dialog open={procdumpDialogOpen} onOpenChange={setProcdumpDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dump Process Memory</DialogTitle>
            <DialogDescription>
              Dump the memory of process {selectedProcess?.pid} ({selectedProcess?.executable})?
              The dump will be saved to loot for later analysis.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-sm text-muted-foreground">
            <p>This operation will:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Create a memory dump of the target process</li>
              <li>Save the dump file to loot storage</li>
              <li>May take some time depending on process size</li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProcdumpDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedProcess && procdumpMutation.mutate(selectedProcess.pid)}
              disabled={procdumpMutation.isPending}
            >
              {procdumpMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Dumping...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Dump Memory
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
