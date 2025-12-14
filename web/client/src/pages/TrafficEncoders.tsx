import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
} from '@/components/ui/alert-dialog';
import {
  Loader2,
  Plus,
  Trash2,
  RefreshCw,
  Upload,
  FileCode,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { TrafficEncoder } from '@/types';

export default function TrafficEncoders() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEncoder, setSelectedEncoder] = useState<TrafficEncoder | null>(null);
  const [newEncoderName, setNewEncoderName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['traffic-encoders'],
    queryFn: () => api.getTrafficEncoders(),
  });

  const addMutation = useMutation({
    mutationFn: async ({ name, file }: { name: string; file: File }) => {
      const reader = new FileReader();
      const wasmData = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      return api.addTrafficEncoder({ name, wasmData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traffic-encoders'] });
      toast.success('Traffic encoder added successfully');
      setAddDialogOpen(false);
      setNewEncoderName('');
      setSelectedFile(null);
    },
    onError: (err: Error) => {
      toast.error(`Failed to add encoder: ${err.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteTrafficEncoder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traffic-encoders'] });
      toast.success('Traffic encoder deleted');
      setDeleteDialogOpen(false);
      setSelectedEncoder(null);
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete encoder: ${err.message}`);
    },
  });

  const encoders = data?.encoders || [];

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!newEncoderName) {
        setNewEncoderName(file.name.replace('.wasm', ''));
      }
    }
  };

  const handleAdd = () => {
    if (newEncoderName && selectedFile) {
      addMutation.mutate({ name: newEncoderName, file: selectedFile });
    }
  };

  const handleDelete = (encoder: TrafficEncoder) => {
    setSelectedEncoder(encoder);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Traffic Encoders</h1>
          <p className="text-muted-foreground">
            Manage WASM-based traffic encoders for C2 communication obfuscation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Encoder
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileCode className="h-4 w-4" />
            Encoders ({encoders.length})
          </CardTitle>
          <CardDescription>
            Custom WASM modules for encoding/decoding C2 traffic
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : encoders.length === 0 ? (
            <div className="text-center py-12">
              <FileCode className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Traffic Encoders</h3>
              <p className="text-muted-foreground mb-4">
                Upload WASM modules to encode C2 traffic
              </p>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Add Encoder
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Test Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {encoders.map((encoder) => (
                  <TableRow key={encoder.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileCode className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{encoder.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{formatSize(encoder.size)}</TableCell>
                    <TableCell>
                      {encoder.testPassed ? (
                        <Badge variant="outline" className="text-green-500 border-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Passed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-500 border-red-500">
                          <XCircle className="h-3 w-3 mr-1" />
                          Failed
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(encoder)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Encoder Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Traffic Encoder</DialogTitle>
            <DialogDescription>
              Upload a WASM module for traffic encoding/decoding
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="encoderName">Encoder Name</Label>
              <Input
                id="encoderName"
                value={newEncoderName}
                onChange={(e) => setNewEncoderName(e.target.value)}
                placeholder="my-encoder"
              />
            </div>
            <div className="space-y-2">
              <Label>WASM File</Label>
              <input
                type="file"
                ref={fileInputRef}
                accept=".wasm"
                className="hidden"
                onChange={handleFileSelect}
              />
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileCode className="h-5 w-5 text-muted-foreground" />
                    <span>{selectedFile.name}</span>
                    <span className="text-muted-foreground">
                      ({formatSize(selectedFile.size)})
                    </span>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Click to select a WASM file
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={addMutation.isPending || !newEncoderName || !selectedFile}
            >
              {addMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Encoder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Traffic Encoder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedEncoder?.name}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedEncoder && deleteMutation.mutate(selectedEncoder.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
