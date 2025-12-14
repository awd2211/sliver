import { useState, useCallback } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileBox,
  Search,
  RefreshCw,
  MoreHorizontal,
  Trash2,
  Info,
  Download,
  Loader2,
  FileText,
  FileCode,
  FileImage,
  File,
  Key,
  Database,
  Server,
  Filter,
  Eye,
  Copy,
  Check,
} from 'lucide-react';
import api from '@/lib/api';
import type { Loot } from '@/types';

type LootTypeFilter = 'all' | 'file' | 'credential';

export function LootPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<LootTypeFilter>('all');
  const [selectedLoot, setSelectedLoot] = useState<Loot | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewContentType, setPreviewContentType] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['loot'],
    queryFn: () => api.getLoot(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteLoot(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loot'] });
      setDeleteDialogOpen(false);
      setSelectedLoot(null);
    },
  });

  const lootItems = data?.loot ?? [];

  const filteredLoot = lootItems.filter((item) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      item.name.toLowerCase().includes(searchLower) ||
      item.type.toLowerCase().includes(searchLower) ||
      (item.originHost?.toLowerCase().includes(searchLower) ?? false);

    const matchesType =
      typeFilter === 'all' ||
      (typeFilter === 'file' && item.type === 'file') ||
      (typeFilter === 'credential' && item.type === 'credential');

    return matchesSearch && matchesType;
  });

  const fileCount = lootItems.filter((l) => l.type === 'file').length;
  const credentialCount = lootItems.filter((l) => l.type === 'credential').length;
  const totalSize = lootItems.reduce((acc, l) => acc + l.size, 0);

  const handleDelete = (loot: Loot) => {
    setSelectedLoot(loot);
    setDeleteDialogOpen(true);
  };

  const handleViewDetails = (loot: Loot) => {
    setSelectedLoot(loot);
    setDetailsOpen(true);
  };

  const handlePreview = useCallback(async (loot: Loot) => {
    setSelectedLoot(loot);
    setLoadingPreview(true);
    setPreviewOpen(true);
    setPreviewContent(null);

    try {
      const { content, contentType } = await api.getLootContent(loot.id);
      setPreviewContent(content);
      setPreviewContentType(contentType);
    } catch (err) {
      toast.error('Failed to load preview');
      setPreviewOpen(false);
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  const handleDownload = useCallback(async (loot: Loot) => {
    setDownloading(loot.id);
    try {
      await api.downloadLoot(loot.id, loot.name);
      toast.success('Download started');
    } catch (err) {
      toast.error('Download failed');
    } finally {
      setDownloading(null);
    }
  }, []);

  const handleCopyContent = useCallback(async () => {
    if (previewContent) {
      try {
        await navigator.clipboard.writeText(previewContent);
        setCopied(true);
        toast.success('Copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error('Failed to copy');
      }
    }
  }, [previewContent]);

  const isTextContent = (contentType: string) => {
    return contentType.startsWith('text/') ||
           contentType.includes('json') ||
           contentType.includes('xml') ||
           contentType.includes('javascript') ||
           contentType.includes('script');
  };

  const isImageContent = (contentType: string) => {
    return contentType.startsWith('image/');
  };

  const canPreview = (loot: Loot) => {
    if (loot.type === 'credential') return true;
    const fileType = (loot.fileType || '').toLowerCase();
    return fileType.includes('text') ||
           fileType.includes('json') ||
           fileType.includes('xml') ||
           fileType.includes('script') ||
           fileType.includes('image') ||
           loot.size < 1024 * 1024; // Preview files under 1MB
  };

  const getFileIcon = (fileType?: string) => {
    if (!fileType) return <File className="h-4 w-4" />;
    const type = fileType.toLowerCase();
    if (type.includes('text') || type.includes('txt')) return <FileText className="h-4 w-4" />;
    if (type.includes('code') || type.includes('script') || type.includes('json') || type.includes('xml'))
      return <FileCode className="h-4 w-4" />;
    if (type.includes('image') || type.includes('png') || type.includes('jpg') || type.includes('jpeg'))
      return <FileImage className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const getLootIcon = (loot: Loot) => {
    if (loot.type === 'credential') {
      return <Key className="h-4 w-4 text-yellow-500" />;
    }
    return getFileIcon(loot.fileType);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const getLootTypeBadge = (loot: Loot) => {
    if (loot.type === 'credential') {
      return (
        <Badge variant="default" className="bg-yellow-500 text-yellow-950">
          {loot.credentialType || 'Credential'}
        </Badge>
      );
    }
    return <Badge variant="secondary">{loot.fileType || 'File'}</Badge>;
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
          <h1 className="text-3xl font-bold">Loot</h1>
          <p className="text-muted-foreground">Collected files and data</p>
        </div>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Failed to load loot: {error.message}</p>
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
          <h1 className="text-3xl font-bold">Loot</h1>
          <p className="text-muted-foreground">
            {lootItems.length} items collected ({formatSize(totalSize)})
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

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lootItems.length}</div>
            <p className="text-xs text-muted-foreground">{formatSize(totalSize)} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Files</CardTitle>
            <FileBox className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fileCount}</div>
            <p className="text-xs text-muted-foreground">Downloaded files</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credentials</CardTitle>
            <Key className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{credentialCount}</div>
            <p className="text-xs text-muted-foreground">Captured credentials</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Origins</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(lootItems.map((l) => l.originHost).filter(Boolean)).size}
            </div>
            <p className="text-xs text-muted-foreground">Unique hosts</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search loot..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as LootTypeFilter)}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="file">Files Only</SelectItem>
            <SelectItem value="credential">Credentials Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loot Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Loot</CardTitle>
          <CardDescription>Files and data collected from targets</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredLoot.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileBox className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No loot collected</p>
              <p className="text-sm">Loot will appear here when you download files from targets</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Type</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Origin</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLoot.map((loot) => (
                  <TableRow
                    key={loot.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewDetails(loot)}
                  >
                    <TableCell>{getLootIcon(loot)}</TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[300px]">{loot.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getLootTypeBadge(loot)}</TableCell>
                    <TableCell>
                      {loot.originHost ? (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Server className="h-3 w-3" />
                          <span className="text-xs">{loot.originHost}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">Unknown</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatSize(loot.size)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(loot)}>
                            <Info className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {canPreview(loot) && (
                            <DropdownMenuItem onClick={() => handlePreview(loot)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                          )}
                          {loot.type === 'file' && (
                            <DropdownMenuItem
                              onClick={() => handleDownload(loot)}
                              disabled={downloading === loot.id}
                            >
                              {downloading === loot.id ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4 mr-2" />
                              )}
                              Download
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(loot)}
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

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Loot</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedLoot?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedLoot && deleteMutation.mutate(selectedLoot.id)}
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

      {/* Loot Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedLoot && getLootIcon(selectedLoot)}
              <span className="truncate">{selectedLoot?.name}</span>
            </DialogTitle>
            <DialogDescription>Loot details and information</DialogDescription>
          </DialogHeader>
          {selectedLoot && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">ID</p>
                  <p className="font-mono text-xs break-all">{selectedLoot.id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Type</p>
                  {getLootTypeBadge(selectedLoot)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Size</p>
                  <p>{formatSize(selectedLoot.size)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Origin Host</p>
                  <p>{selectedLoot.originHost || 'Unknown'}</p>
                </div>
              </div>
              {selectedLoot.type === 'file' && selectedLoot.fileType && (
                <div className="text-sm">
                  <p className="text-muted-foreground">File Type</p>
                  <p>{selectedLoot.fileType}</p>
                </div>
              )}
              {selectedLoot.type === 'credential' && selectedLoot.credentialType && (
                <div className="text-sm">
                  <p className="text-muted-foreground">Credential Type</p>
                  <p>{selectedLoot.credentialType}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {selectedLoot && canPreview(selectedLoot) && (
              <Button
                variant="outline"
                onClick={() => {
                  setDetailsOpen(false);
                  handlePreview(selectedLoot);
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            )}
            {selectedLoot?.type === 'file' && (
              <Button
                className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950"
                onClick={() => selectedLoot && handleDownload(selectedLoot)}
                disabled={downloading === selectedLoot.id}
              >
                {downloading === selectedLoot.id ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download
              </Button>
            )}
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-yellow-500" />
              <span className="truncate">{selectedLoot?.name}</span>
            </DialogTitle>
            <DialogDescription>
              {previewContentType && (
                <Badge variant="secondary" className="mt-1">
                  {previewContentType}
                </Badge>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto max-h-[60vh]">
            {loadingPreview ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
              </div>
            ) : previewContent ? (
              isImageContent(previewContentType) ? (
                <div className="flex items-center justify-center">
                  <img
                    src={`data:${previewContentType};base64,${previewContent}`}
                    alt={selectedLoot?.name || 'Preview'}
                    className="max-w-full max-h-[55vh] object-contain rounded-md"
                  />
                </div>
              ) : (
                <pre className="bg-muted p-4 rounded-lg text-sm font-mono overflow-auto whitespace-pre-wrap break-all">
                  {isTextContent(previewContentType) || selectedLoot?.type === 'credential'
                    ? previewContent
                    : atob(previewContent)}
                </pre>
              )
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileBox className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No preview available</p>
              </div>
            )}
          </div>
          <DialogFooter>
            {previewContent && !isImageContent(previewContentType) && (
              <Button variant="outline" onClick={handleCopyContent}>
                {copied ? (
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            )}
            {selectedLoot?.type === 'file' && (
              <Button
                className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950"
                onClick={() => selectedLoot && handleDownload(selectedLoot)}
                disabled={downloading === selectedLoot.id}
              >
                {downloading === selectedLoot.id ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download
              </Button>
            )}
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Re-export with original name for backwards compatibility
export { LootPage as Loot };
