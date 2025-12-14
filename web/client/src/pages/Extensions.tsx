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
  Puzzle,
  ChevronDown,
  ExternalLink,
  Info,
  Upload,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { Extension } from '@/types';

export function Extensions() {
  const queryClient = useQueryClient();
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedExtension, setSelectedExtension] = useState<Extension | null>(null);
  const [loadPath, setLoadPath] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['extensions'],
    queryFn: () => api.getExtensions(),
  });

  const loadMutation = useMutation({
    mutationFn: (path: string) => api.loadExtension(path),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extensions'] });
      toast.success('Extension loaded successfully');
      setLoadDialogOpen(false);
      setLoadPath('');
    },
    onError: (err: Error) => {
      toast.error(`Failed to load extension: ${err.message}`);
    },
  });

  const installMutation = useMutation({
    mutationFn: (name: string) => api.installExtension(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extensions'] });
      toast.success('Extension installed successfully');
    },
    onError: (err: Error) => {
      toast.error(`Failed to install extension: ${err.message}`);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (name: string) => api.removeExtension(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extensions'] });
      toast.success('Extension removed successfully');
      setDeleteDialogOpen(false);
      setSelectedExtension(null);
    },
    onError: (err: Error) => {
      toast.error(`Failed to remove extension: ${err.message}`);
    },
  });

  const extensions = data?.extensions || [];
  const filteredExtensions = extensions.filter(
    (e) =>
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.commandName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.help?.toLowerCase().includes(searchTerm.toLowerCase())
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
            <CardTitle className="text-destructive">Error loading extensions</CardTitle>
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
          <h1 className="text-2xl font-bold">Extensions</h1>
          <p className="text-muted-foreground">
            Manage BOF and other extensions for enhanced capabilities
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setLoadDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Load Extension
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Puzzle className="h-5 w-5" />
              Loaded Extensions ({extensions.length})
            </CardTitle>
            <Input
              placeholder="Search extensions..."
              className="w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredExtensions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No extensions match your search' : 'No extensions loaded'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredExtensions.map((extension) => (
                <Collapsible key={extension.name}>
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
                            <span className="font-medium">{extension.name}</span>
                            <Badge variant="outline" className="font-mono text-xs">
                              {extension.commandName}
                            </Badge>
                            {extension.isInstalled && (
                              <Badge variant="default" className="text-xs">Installed</Badge>
                            )}
                            {extension.version && (
                              <Badge variant="secondary" className="text-xs">v{extension.version}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{extension.help}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {extension.repoURL && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(extension.repoURL, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedExtension(extension);
                            setDetailDialogOpen(true);
                          }}
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                        {!extension.isInstalled && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => installMutation.mutate(extension.name)}
                            disabled={installMutation.isPending}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedExtension(extension);
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
                            <p>{extension.originalAuthor || 'Unknown'}</p>
                          </div>
                          <div>
                            <label className="text-muted-foreground">Version</label>
                            <p>{extension.version || 'N/A'}</p>
                          </div>
                          {extension.dependsOn && (
                            <div>
                              <label className="text-muted-foreground">Dependencies</label>
                              <p className="font-mono text-xs">{extension.dependsOn}</p>
                            </div>
                          )}
                          {extension.entrypoint && (
                            <div>
                              <label className="text-muted-foreground">Entrypoint</label>
                              <p className="font-mono text-xs">{extension.entrypoint}</p>
                            </div>
                          )}
                        </div>
                        {extension.arguments && extension.arguments.length > 0 && (
                          <div>
                            <label className="text-sm text-muted-foreground">Arguments</label>
                            <Table className="mt-2">
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Name</TableHead>
                                  <TableHead>Type</TableHead>
                                  <TableHead>Description</TableHead>
                                  <TableHead>Required</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {extension.arguments.map((arg) => (
                                  <TableRow key={arg.name}>
                                    <TableCell className="font-mono">{arg.name}</TableCell>
                                    <TableCell>
                                      <Badge variant="outline">{arg.type}</Badge>
                                    </TableCell>
                                    <TableCell className="text-sm">{arg.desc}</TableCell>
                                    <TableCell>
                                      {arg.optional ? (
                                        <Badge variant="secondary">Optional</Badge>
                                      ) : (
                                        <Badge variant="default">Required</Badge>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                        {extension.files && extension.files.length > 0 && (
                          <div>
                            <label className="text-sm text-muted-foreground">Supported Platforms</label>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {extension.files.map((file, idx) => (
                                <Badge key={idx} variant="outline">
                                  {file.os}/{file.arch}
                                </Badge>
                              ))}
                            </div>
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

      {/* Load Extension Dialog */}
      <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Load Extension</DialogTitle>
            <DialogDescription>
              Load an extension from a local manifest file
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Manifest Path</label>
              <Input
                placeholder="/path/to/extension/manifest.json"
                value={loadPath}
                onChange={(e) => setLoadPath(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Path to the extension manifest.json file on the server
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
              Load Extension
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extension Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedExtension?.name}</DialogTitle>
            <DialogDescription>{selectedExtension?.help}</DialogDescription>
          </DialogHeader>
          {selectedExtension && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Command Name</label>
                    <p className="font-mono">{selectedExtension.commandName}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Author</label>
                    <p>{selectedExtension.originalAuthor || 'Unknown'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Installed</label>
                    <p>{selectedExtension.isInstalled ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Version</label>
                    <p>{selectedExtension.version || 'N/A'}</p>
                  </div>
                </div>

                {selectedExtension.longHelp && (
                  <div>
                    <label className="text-sm text-muted-foreground">Description</label>
                    <p className="text-sm whitespace-pre-wrap">{selectedExtension.longHelp}</p>
                  </div>
                )}

                {selectedExtension.init && (
                  <div>
                    <label className="text-sm text-muted-foreground">Initialization</label>
                    <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                      {selectedExtension.init}
                    </pre>
                  </div>
                )}

                {selectedExtension.repoURL && (
                  <div>
                    <label className="text-sm text-muted-foreground">Repository</label>
                    <a
                      href={selectedExtension.repoURL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-500 hover:underline flex items-center gap-1"
                    >
                      {selectedExtension.repoURL}
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
            <DialogTitle>Remove Extension</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove the extension "{selectedExtension?.name}"?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedExtension && removeMutation.mutate(selectedExtension.name)}
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
