import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Badge } from '@/components/ui/badge';
import { Key, Search, Plus, Trash2, Eye, EyeOff, Copy, Check, Loader2, Download, CheckSquare, Square, XSquare } from 'lucide-react';
import { api } from '@/lib/api';
import type { Credential } from '@/types';

export function Credentials() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    hash: '',
    hashType: '',
    originHost: '',
    collection: '',
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['credentials'],
    queryFn: () => api.getCredentials(),
  });

  const addMutation = useMutation({
    mutationFn: (cred: Partial<Credential>) => api.addCredential(cred),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
      setDialogOpen(false);
      setFormData({
        username: '',
        password: '',
        hash: '',
        hashType: '',
        originHost: '',
        collection: '',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteCredential(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
    },
  });

  const credentials = data?.credentials || [];

  const filteredCredentials = credentials.filter((cred) => {
    const query = searchQuery.toLowerCase();
    return (
      cred.username.toLowerCase().includes(query) ||
      (cred.originHost?.toLowerCase().includes(query) ?? false) ||
      (cred.collection?.toLowerCase().includes(query) ?? false)
    );
  });

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Bulk selection handlers
  const toggleSelectCredential = useCallback((credId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(credId)) {
        newSet.delete(credId);
      } else {
        newSet.add(credId);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredCredentials.map(c => c.id)));
  }, [filteredCredentials]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const getCredentialValue = (cred: Credential): string => {
    if (cred.plaintext) return cred.plaintext;
    if (cred.password) return cred.password;
    if (cred.hash) return cred.hash;
    return '-';
  };

  const getCredentialType = (cred: Credential): string => {
    if (cred.plaintext || cred.password) return 'Password';
    if (cred.hash) return cred.hashType || 'Hash';
    return 'Unknown';
  };

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    let succeeded = 0;
    let failed = 0;

    for (const credId of selectedIds) {
      try {
        await api.deleteCredential(credId);
        succeeded++;
      } catch {
        failed++;
      }
    }

    setBulkDeleting(false);
    setBulkDeleteDialogOpen(false);
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ['credentials'] });

    if (failed === 0) {
      toast.success(`Successfully deleted ${succeeded} credential${succeeded !== 1 ? 's' : ''}`);
    } else {
      toast.warning(`Deleted ${succeeded} credential${succeeded !== 1 ? 's' : ''}, ${failed} failed`);
    }
  }, [selectedIds, queryClient]);

  const handleExport = useCallback(() => {
    const selectedCreds = credentials.filter(c => selectedIds.has(c.id));
    const exportData = selectedCreds.map(cred => ({
      username: cred.username,
      type: getCredentialType(cred),
      value: getCredentialValue(cred),
      originHost: cred.originHost || '',
      collection: cred.collection || '',
      isCracked: cred.isCracked || false,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `credentials-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${selectedCreds.length} credential${selectedCreds.length !== 1 ? 's' : ''}`);
  }, [selectedIds, credentials]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cred: Partial<Credential> = {
      username: formData.username,
      originHost: formData.originHost || undefined,
      collection: formData.collection || undefined,
    };

    if (formData.password) {
      cred.plaintext = formData.password;
    } else if (formData.hash) {
      cred.hash = formData.hash;
      cred.hashType = formData.hashType || undefined;
    }

    addMutation.mutate(cred);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Credentials</h1>
          <p className="text-muted-foreground">Collected and stored credentials</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950">
              <Plus className="h-4 w-4 mr-2" />
              Add Credential
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Credential</DialogTitle>
              <DialogDescription>
                Add a new credential to the database
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Leave empty if using hash"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="hash">Hash</Label>
                    <Input
                      id="hash"
                      value={formData.hash}
                      onChange={(e) => setFormData({ ...formData, hash: e.target.value })}
                      placeholder="Leave empty if using password"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="hashType">Hash Type</Label>
                    <Select
                      value={formData.hashType}
                      onValueChange={(value) => setFormData({ ...formData, hashType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NTLM">NTLM</SelectItem>
                        <SelectItem value="NTLMv2">NTLMv2</SelectItem>
                        <SelectItem value="SHA256">SHA256</SelectItem>
                        <SelectItem value="SHA512">SHA512</SelectItem>
                        <SelectItem value="MD5">MD5</SelectItem>
                        <SelectItem value="bcrypt">bcrypt</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="originHost">Origin Host</Label>
                  <Input
                    id="originHost"
                    value={formData.originHost}
                    onChange={(e) => setFormData({ ...formData, originHost: e.target.value })}
                    placeholder="Where this credential was found"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="collection">Collection</Label>
                  <Input
                    id="collection"
                    value={formData.collection}
                    onChange={(e) => setFormData({ ...formData, collection: e.target.value })}
                    placeholder="Group name for organizing"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={addMutation.isPending}>
                  {addMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Credential
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
            placeholder="Search credentials..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Badge variant="secondary">{filteredCredentials.length} credentials</Badge>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 p-3 bg-muted rounded-lg border">
          <span className="text-sm font-medium">
            {selectedIds.size} credential{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Selected
          </Button>
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
            onClick={() => setBulkDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Selected
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Credentials</CardTitle>
          <CardDescription>Passwords, hashes, and tokens</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              <p>Failed to load credentials</p>
            </div>
          ) : filteredCredentials.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No credentials collected</p>
              <p className="text-sm">Credentials will appear here when harvested from targets</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <div className="flex items-center gap-2">
                      {filteredCredentials.length > 0 && (
                        selectedIds.size === filteredCredentials.length ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={clearSelection}
                          >
                            <CheckSquare className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={selectAll}
                          >
                            <Square className="h-4 w-4" />
                          </Button>
                        )
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Origin</TableHead>
                  <TableHead>Collection</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCredentials.map((cred) => (
                  <TableRow key={cred.id} className={selectedIds.has(cred.id) ? 'bg-muted/30' : ''}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(cred.id)}
                        onCheckedChange={() => toggleSelectCredential(cred.id)}
                      />
                    </TableCell>
                    <TableCell className="font-mono">{cred.username}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getCredentialType(cred)}</Badge>
                    </TableCell>
                    <TableCell className="font-mono max-w-[200px]">
                      <div className="flex items-center gap-2">
                        <span className="truncate">
                          {visiblePasswords.has(cred.id)
                            ? getCredentialValue(cred)
                            : '••••••••'}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => togglePasswordVisibility(cred.id)}
                        >
                          {visiblePasswords.has(cred.id) ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(getCredentialValue(cred), cred.id)}
                        >
                          {copiedId === cred.id ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>{cred.originHost || '-'}</TableCell>
                    <TableCell>{cred.collection || '-'}</TableCell>
                    <TableCell>
                      {cred.isCracked ? (
                        <Badge variant="default" className="bg-green-500">Cracked</Badge>
                      ) : cred.hash ? (
                        <Badge variant="secondary">Uncracked</Badge>
                      ) : (
                        <Badge variant="default" className="bg-blue-500">Plaintext</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Credential</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this credential? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(cred.id)}
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
        </CardContent>
      </Card>

      {/* Bulk Delete Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              删除 {selectedIds.size} 条凭证
            </DialogTitle>
            <DialogDescription>
              确定要删除选中的 {selectedIds.size} 条凭证吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-2">将要删除的凭证:</p>
            <div className="max-h-32 overflow-auto space-y-1">
              {[...selectedIds].map(id => {
                const cred = credentials.find(c => c.id === id);
                return cred ? (
                  <div key={id} className="text-sm flex items-center gap-2 p-2 bg-muted rounded">
                    <Key className="h-3 w-3" />
                    <span className="font-mono">{cred.username}</span>
                    {cred.originHost && (
                      <span className="text-muted-foreground">({cred.originHost})</span>
                    )}
                  </div>
                ) : null;
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteDialogOpen(false)} disabled={bulkDeleting}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
            >
              {bulkDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  删除中...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  删除 {selectedIds.size} 条
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
