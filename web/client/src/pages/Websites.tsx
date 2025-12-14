import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import {
  Globe,
  Plus,
  Trash2,
  Search,
  ChevronDown,
  ChevronRight,
  FileText,
  Loader2,
  FolderOpen,
  Upload,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { Website, WebContent } from '@/types';

export function Websites() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newWebsiteName, setNewWebsiteName] = useState('');
  const [expandedWebsites, setExpandedWebsites] = useState<Set<string>>(new Set());
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadWebsite, setUploadWebsite] = useState<Website | null>(null);
  const [uploadPath, setUploadPath] = useState('/');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['websites'],
    queryFn: () => api.getWebsites(),
  });

  const addMutation = useMutation({
    mutationFn: (name: string) => api.addWebsite(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websites'] });
      setDialogOpen(false);
      setNewWebsiteName('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (name: string) => api.deleteWebsite(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websites'] });
    },
  });

  const deleteContentMutation = useMutation({
    mutationFn: ({ websiteName, contentId }: { websiteName: string; contentId: string }) =>
      api.deleteWebsiteContent(websiteName, contentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websites'] });
      toast.success('Content deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const handleUploadClick = useCallback((website: Website) => {
    setUploadWebsite(website);
    setUploadPath('/');
    setUploadFile(null);
    setUploadDialogOpen(true);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      // Auto-fill path with filename if path is just /
      if (uploadPath === '/') {
        setUploadPath('/' + file.name);
      }
    }
  }, [uploadPath]);

  const handleUpload = useCallback(async () => {
    if (!uploadWebsite || !uploadFile || !uploadPath) return;

    setUploading(true);
    try {
      await api.uploadWebsiteContent(uploadWebsite.name, uploadPath, uploadFile);
      queryClient.invalidateQueries({ queryKey: ['websites'] });
      setUploadDialogOpen(false);
      setUploadFile(null);
      setUploadPath('/');
      toast.success(`Uploaded ${uploadFile.name}`);
    } catch (error) {
      toast.error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  }, [uploadWebsite, uploadFile, uploadPath, queryClient]);

  const websites = data?.websites || [];

  const filteredWebsites = websites.filter((website) =>
    website.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleExpanded = (id: string) => {
    setExpandedWebsites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newWebsiteName.trim()) {
      addMutation.mutate(newWebsiteName.trim());
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getTotalSize = (contents: WebContent[]): number => {
    return contents?.reduce((sum, c) => sum + c.size, 0) || 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Websites</h1>
          <p className="text-muted-foreground">Hosted content for HTTP/S listeners</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950">
              <Plus className="h-4 w-4 mr-2" />
              New Website
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Website</DialogTitle>
              <DialogDescription>
                Create a new website to serve content on HTTP/S listeners
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Website Name</Label>
                  <Input
                    id="name"
                    value={newWebsiteName}
                    onChange={(e) => setNewWebsiteName(e.target.value)}
                    placeholder="my-website"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    This name will be used to reference the website in HTTP/S listeners
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={addMutation.isPending}>
                  {addMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Website
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search websites..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Badge variant="secondary">{filteredWebsites.length} websites</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Websites</CardTitle>
          <CardDescription>Static content served by HTTP/S listeners</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              <p>Failed to load websites</p>
            </div>
          ) : filteredWebsites.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No websites configured</p>
              <p className="text-sm">Create a website to serve content on HTTP/S listeners</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredWebsites.map((website) => (
                <WebsiteRow
                  key={website.id}
                  website={website}
                  isExpanded={expandedWebsites.has(website.id)}
                  onToggle={() => toggleExpanded(website.id)}
                  onDelete={() => deleteMutation.mutate(website.name)}
                  onUpload={() => handleUploadClick(website)}
                  onDeleteContent={(contentId) => deleteContentMutation.mutate({ websiteName: website.name, contentId })}
                  formatSize={formatSize}
                  getTotalSize={getTotalSize}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Content Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Content to {uploadWebsite?.name}
            </DialogTitle>
            <DialogDescription>
              Upload a file to serve on this website
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="upload-path">URL Path</Label>
              <Input
                id="upload-path"
                value={uploadPath}
                onChange={(e) => setUploadPath(e.target.value)}
                placeholder="/index.html"
              />
              <p className="text-xs text-muted-foreground">
                The path where this file will be served (e.g., /payload.exe)
              </p>
            </div>
            <div className="grid gap-2">
              <Label>File</Label>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="hidden"
              />
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span>{uploadFile.name}</span>
                    <Badge variant="secondary">{formatSize(uploadFile.size)}</Badge>
                  </div>
                ) : (
                  <div className="text-muted-foreground">
                    <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Click to select a file</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || !uploadFile || !uploadPath}
              className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WebsiteRow({
  website,
  isExpanded,
  onToggle,
  onDelete,
  onUpload,
  onDeleteContent,
  formatSize,
  getTotalSize,
}: {
  website: Website;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onUpload: () => void;
  onDeleteContent: (contentId: string) => void;
  formatSize: (bytes: number) => string;
  getTotalSize: (contents: WebContent[]) => number;
}) {
  const contentCount = website.contents?.length || 0;
  const totalSize = getTotalSize(website.contents);

  return (
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
            <Globe className="h-5 w-5 text-yellow-500" />
            <div className="flex-1 min-w-0">
              <div className="font-medium">{website.name}</div>
              <div className="text-sm text-muted-foreground">
                {contentCount} file{contentCount !== 1 ? 's' : ''} • {formatSize(totalSize)}
              </div>
            </div>
            <Badge variant="outline">{contentCount} items</Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); onUpload(); }}
            >
              <Upload className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Website</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete &quot;{website.name}&quot;? This will remove all
                    content and cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDelete}
                    className="bg-destructive text-destructive-foreground"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t p-4 bg-muted/20">
            {contentCount === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No content uploaded</p>
                <p className="text-xs">Upload files to serve them via HTTP/S listeners</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Path</TableHead>
                    <TableHead>Content Type</TableHead>
                    <TableHead className="text-right">Size</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {website.contents.map((content) => (
                    <TableRow key={content.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-sm">{content.path}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {content.contentType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatSize(content.size)}
                      </TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Content</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete &quot;{content.path}&quot;?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => onDeleteContent(content.id)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
