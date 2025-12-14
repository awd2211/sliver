import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Loader2,
  Trash2,
  Download,
  Terminal,
  ChevronDown,
  ExternalLink,
  Info,
  Upload,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { Alias } from '@/types';

export function Aliases() {
  const queryClient = useQueryClient();
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedAlias, setSelectedAlias] = useState<Alias | null>(null);
  const [loadPath, setLoadPath] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['aliases'],
    queryFn: () => api.getAliases(),
  });

  const loadMutation = useMutation({
    mutationFn: (path: string) => api.loadAlias(path),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aliases'] });
      toast.success('Alias loaded successfully');
      setLoadDialogOpen(false);
      setLoadPath('');
    },
    onError: (err: Error) => {
      toast.error(`Failed to load alias: ${err.message}`);
    },
  });

  const installMutation = useMutation({
    mutationFn: (name: string) => api.installAlias(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aliases'] });
      toast.success('Alias installed successfully');
    },
    onError: (err: Error) => {
      toast.error(`Failed to install alias: ${err.message}`);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (name: string) => api.removeAlias(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aliases'] });
      toast.success('Alias removed successfully');
      setDeleteDialogOpen(false);
      setSelectedAlias(null);
    },
    onError: (err: Error) => {
      toast.error(`Failed to remove alias: ${err.message}`);
    },
  });

  const aliases = data?.aliases || [];
  const filteredAliases = aliases.filter(
    (a) =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.commandName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.help?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error loading aliases</CardTitle>
            <CardDescription>{(error as Error).message}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Aliases</h1>
          <p className="text-muted-foreground">
            Manage command aliases for extended implant functionality
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setLoadDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Load Alias
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Loaded Aliases ({aliases.length})
            </CardTitle>
            <Input
              placeholder="Search aliases..."
              className="w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredAliases.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No aliases match your search' : 'No aliases loaded'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAliases.map((alias) => (
                <Collapsible key={alias.name}>
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </CollapsibleTrigger>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{alias.name}</span>
                            <Badge variant="outline" className="font-mono text-xs">
                              {alias.commandName}
                            </Badge>
                            {alias.isInstalled && (
                              <Badge variant="default" className="text-xs">Installed</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{alias.help}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {alias.repoURL && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(alias.repoURL, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedAlias(alias);
                            setDetailDialogOpen(true);
                          }}
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                        {!alias.isInstalled && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => installMutation.mutate(alias.name)}
                            disabled={installMutation.isPending}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedAlias(alias);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <CollapsibleContent>
                      <div className="mt-4 pt-4 border-t space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <label className="text-muted-foreground">Author</label>
                            <p>{alias.originalAuthor || 'Unknown'}</p>
                          </div>
                          <div>
                            <label className="text-muted-foreground">Version</label>
                            <p>{alias.installedVersion || 'N/A'}</p>
                          </div>
                        </div>
                        {alias.commands && alias.commands.length > 0 && (
                          <div>
                            <label className="text-sm text-muted-foreground">Commands</label>
                            <Table className="mt-2">
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Name</TableHead>
                                  <TableHead>Help</TableHead>
                                  <TableHead>Type</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {alias.commands.map((cmd) => (
                                  <TableRow key={cmd.name}>
                                    <TableCell className="font-mono">{cmd.name}</TableCell>
                                    <TableCell className="text-sm">{cmd.help}</TableCell>
                                    <TableCell>
                                      {cmd.isAssembly && <Badge variant="outline">Assembly</Badge>}
                                      {cmd.isReflective && <Badge variant="outline">Reflective</Badge>}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Load Alias Dialog */}
      <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Load Alias</DialogTitle>
            <DialogDescription>
              Load an alias from a local manifest file
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Manifest Path</label>
              <Input
                placeholder="/path/to/alias/manifest.json"
                value={loadPath}
                onChange={(e) => setLoadPath(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Path to the alias manifest.json file on the server
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLoadDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => loadMutation.mutate(loadPath)}
              disabled={loadMutation.isPending || !loadPath}
            >
              {loadMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Load Alias
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alias Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedAlias?.name}</DialogTitle>
            <DialogDescription>{selectedAlias?.help}</DialogDescription>
          </DialogHeader>
          {selectedAlias && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Command Name</label>
                    <p className="font-mono">{selectedAlias.commandName}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Author</label>
                    <p>{selectedAlias.originalAuthor || 'Unknown'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Installed</label>
                    <p>{selectedAlias.isInstalled ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Version</label>
                    <p>{selectedAlias.installedVersion || 'N/A'}</p>
                  </div>
                </div>

                {selectedAlias.longHelp && (
                  <div>
                    <label className="text-sm text-muted-foreground">Description</label>
                    <p className="text-sm whitespace-pre-wrap">{selectedAlias.longHelp}</p>
                  </div>
                )}

                {selectedAlias.repoURL && (
                  <div>
                    <label className="text-sm text-muted-foreground">Repository</label>
                    <a
                      href={selectedAlias.repoURL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-500 hover:underline flex items-center gap-1"
                    >
                      {selectedAlias.repoURL}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Alias</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove the alias "{selectedAlias?.name}"?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedAlias && removeMutation.mutate(selectedAlias.name)}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
