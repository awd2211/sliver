import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
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
  Folder,
  File,
  ChevronRight,
  ChevronUp,
  Home,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  FolderPlus,
  MoreHorizontal,
  Loader2,
  FileText,
  FileImage,
  FileArchive,
  FileCode,
  X,
  CheckCircle,
  Settings2,
} from 'lucide-react';
import api from '@/lib/api';
import type { FileInfo } from '@/types';
import { FileOperationsDialog } from './FileOperationsDialog';

interface FileBrowserProps {
  sessionId: string;
}

export function FileBrowser({ sessionId }: FileBrowserProps) {
  const [currentPath, setCurrentPath] = useState('/');
  const [inputPath, setInputPath] = useState('/');
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mkdirDialogOpen, setMkdirDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [newDirName, setNewDirName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadStatus, setUploadStatus] = useState<Record<string, 'pending' | 'uploading' | 'done' | 'error'>>({});
  const [fileOpsDialogOpen, setFileOpsDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['files', sessionId, currentPath],
    queryFn: () => api.listFiles(sessionId, currentPath),
    enabled: !!sessionId,
  });

  const files = data?.files ?? [];

  const deleteMutation = useMutation({
    mutationFn: (path: string) => api.deleteFile(sessionId, path),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', sessionId, currentPath] });
      setDeleteDialogOpen(false);
      setSelectedFile(null);
    },
  });

  const mkdirMutation = useMutation({
    mutationFn: (path: string) => api.makeDirectory(sessionId, path),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', sessionId, currentPath] });
      setMkdirDialogOpen(false);
      setNewDirName('');
    },
  });

  useEffect(() => {
    setInputPath(currentPath);
  }, [currentPath]);

  const navigateTo = (path: string) => {
    const normalized = path.replace(/\/+/g, '/') || '/';
    setCurrentPath(normalized);
  };

  const goUp = () => {
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    navigateTo('/' + parts.join('/'));
  };

  const goHome = () => {
    navigateTo('/');
  };

  const handlePathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigateTo(inputPath);
  };

  const handleFileClick = (file: FileInfo) => {
    if (file.isDir) {
      const newPath = currentPath === '/'
        ? `/${file.name}`
        : `${currentPath}/${file.name}`;
      navigateTo(newPath);
    } else {
      setSelectedFile(file);
    }
  };

  const handleDelete = (file: FileInfo) => {
    setSelectedFile(file);
    setDeleteDialogOpen(true);
  };

  const handleDownload = async (file: FileInfo) => {
    const fullPath = currentPath === '/'
      ? `/${file.name}`
      : `${currentPath}/${file.name}`;
    try {
      await api.downloadFile(sessionId, fullPath);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleMkdir = () => {
    if (!newDirName.trim()) return;
    const newPath = currentPath === '/'
      ? `/${newDirName}`
      : `${currentPath}/${newDirName}`;
    mkdirMutation.mutate(newPath);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
    // Initialize progress and status
    const progress: Record<string, number> = {};
    const status: Record<string, 'pending' | 'uploading' | 'done' | 'error'> = {};
    files.forEach(f => {
      progress[f.name] = 0;
      status[f.name] = 'pending';
    });
    setUploadProgress(progress);
    setUploadStatus(status);
  };

  const removeSelectedFile = (fileName: string) => {
    setSelectedFiles(prev => prev.filter(f => f.name !== fileName));
    setUploadProgress(prev => {
      const next = { ...prev };
      delete next[fileName];
      return next;
    });
    setUploadStatus(prev => {
      const next = { ...prev };
      delete next[fileName];
      return next;
    });
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    for (const file of selectedFiles) {
      try {
        setUploadStatus(prev => ({ ...prev, [file.name]: 'uploading' }));
        setUploadProgress(prev => ({ ...prev, [file.name]: 10 }));

        const destPath = currentPath === '/'
          ? `/${file.name}`
          : `${currentPath}/${file.name}`;

        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: Math.min((prev[file.name] || 0) + 10, 90)
          }));
        }, 200);

        await api.uploadFile(sessionId, destPath, file);

        clearInterval(progressInterval);
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        setUploadStatus(prev => ({ ...prev, [file.name]: 'done' }));
      } catch (err) {
        setUploadStatus(prev => ({ ...prev, [file.name]: 'error' }));
        toast.error(`Failed to upload ${file.name}`, {
          description: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    // Refresh the file list after all uploads
    queryClient.invalidateQueries({ queryKey: ['files', sessionId, currentPath] });

    // Check if all uploads succeeded
    const allDone = selectedFiles.every(f => uploadStatus[f.name] === 'done');
    if (allDone) {
      toast.success('All files uploaded successfully');
      setTimeout(() => {
        setUploadDialogOpen(false);
        setSelectedFiles([]);
        setUploadProgress({});
        setUploadStatus({});
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 1000);
    }
  };

  const closeUploadDialog = () => {
    setUploadDialogOpen(false);
    setSelectedFiles([]);
    setUploadProgress({});
    setUploadStatus({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = (file: FileInfo) => {
    if (file.isDir) {
      return <Folder className="h-4 w-4 text-yellow-500" />;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'txt':
      case 'log':
      case 'md':
        return <FileText className="h-4 w-4 text-blue-400" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'bmp':
        return <FileImage className="h-4 w-4 text-purple-400" />;
      case 'zip':
      case 'tar':
      case 'gz':
      case 'rar':
      case '7z':
        return <FileArchive className="h-4 w-4 text-orange-400" />;
      case 'js':
      case 'ts':
      case 'py':
      case 'go':
      case 'rs':
      case 'c':
      case 'cpp':
      case 'h':
        return <FileCode className="h-4 w-4 text-green-400" />;
      default:
        return <File className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '-';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const pathParts = currentPath.split('/').filter(Boolean);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">File Browser</CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={goHome}
              className="h-8 w-8"
              title="Home"
            >
              <Home className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={goUp}
              disabled={currentPath === '/'}
              className="h-8 w-8"
              title="Go up"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-8 w-8"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMkdirDialogOpen(true)}
              className="h-8 w-8"
              title="New folder"
            >
              <FolderPlus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Upload"
              onClick={() => setUploadDialogOpen(true)}
            >
              <Upload className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Advanced Operations"
              onClick={() => setFileOpsDialogOpen(true)}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm mt-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            onClick={goHome}
          >
            <Home className="h-3 w-3" />
          </Button>
          {pathParts.map((part, index) => (
            <div key={index} className="flex items-center">
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={() => {
                  const newPath = '/' + pathParts.slice(0, index + 1).join('/');
                  navigateTo(newPath);
                }}
              >
                {part}
              </Button>
            </div>
          ))}
        </div>

        {/* Path input */}
        <form onSubmit={handlePathSubmit} className="flex gap-2 mt-2">
          <Input
            value={inputPath}
            onChange={(e) => setInputPath(e.target.value)}
            className="h-8 text-sm font-mono"
            placeholder="Enter path..."
          />
          <Button type="submit" variant="secondary" size="sm" className="h-8">
            Go
          </Button>
        </form>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">Failed to load directory</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Folder className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">Empty directory</p>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Name</TableHead>
                  <TableHead className="w-[15%]">Size</TableHead>
                  <TableHead className="w-[30%]">Modified</TableHead>
                  <TableHead className="w-[15%]">Mode</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => (
                  <TableRow
                    key={file.name}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleFileClick(file)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getFileIcon(file)}
                        <span className="truncate">{file.name}</span>
                        {file.link && (
                          <span className="text-xs text-muted-foreground">
                            -&gt; {file.link}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {file.isDir ? '-' : formatSize(file.size)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDate(file.modTime)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {file.mode}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!file.isDir && (
                            <DropdownMenuItem onClick={() => handleDownload(file)}>
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(file)}
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
          </ScrollArea>
        )}
      </CardContent>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selectedFile?.isDir ? 'Folder' : 'File'}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedFile?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedFile) {
                  const fullPath = currentPath === '/'
                    ? `/${selectedFile.name}`
                    : `${currentPath}/${selectedFile.name}`;
                  deleteMutation.mutate(fullPath);
                }
              }}
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

      {/* Create Directory Dialog */}
      <Dialog open={mkdirDialogOpen} onOpenChange={setMkdirDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Enter a name for the new folder in {currentPath}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newDirName}
            onChange={(e) => setNewDirName(e.target.value)}
            placeholder="Folder name"
            className="mt-2"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setMkdirDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleMkdir}
              disabled={mkdirMutation.isPending || !newDirName.trim()}
            >
              {mkdirMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Create
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={(open) => !open && closeUploadDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-yellow-500" />
              Upload Files
            </DialogTitle>
            <DialogDescription>
              Upload files to {currentPath}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* File input */}
            <div className="space-y-2">
              <Label htmlFor="file-upload">Select Files</Label>
              <Input
                id="file-upload"
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="cursor-pointer"
              />
            </div>

            {/* Selected files list */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <Label>Files to Upload ({selectedFiles.length})</Label>
                <ScrollArea className="h-[200px] border rounded-md p-2">
                  <div className="space-y-2">
                    {selectedFiles.map((file) => (
                      <div
                        key={file.name}
                        className="flex items-center gap-2 p-2 rounded bg-muted/50"
                      >
                        <File className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatSize(file.size)}
                          </p>
                          {uploadStatus[file.name] === 'uploading' && (
                            <Progress value={uploadProgress[file.name]} className="h-1 mt-1" />
                          )}
                        </div>
                        {uploadStatus[file.name] === 'done' ? (
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        ) : uploadStatus[file.name] === 'error' ? (
                          <X className="h-4 w-4 text-destructive flex-shrink-0" />
                        ) : uploadStatus[file.name] === 'uploading' ? (
                          <Loader2 className="h-4 w-4 animate-spin text-yellow-500 flex-shrink-0" />
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 flex-shrink-0"
                            onClick={() => removeSelectedFile(file.name)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeUploadDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || Object.values(uploadStatus).some(s => s === 'uploading')}
              className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950"
            >
              {Object.values(uploadStatus).some(s => s === 'uploading') ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Operations Dialog */}
      <FileOperationsDialog
        sessionId={sessionId}
        currentPath={currentPath}
        open={fileOpsDialogOpen}
        onOpenChange={setFileOpsDialogOpen}
      />
    </Card>
  );
}
