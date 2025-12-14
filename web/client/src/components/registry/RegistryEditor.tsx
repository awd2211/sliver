import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FolderClosed,
  ChevronRight,
  FileText,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Database,
  Binary,
  Type,
  Hash,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { RegistryHive, RegistryValueType, RegistryValue } from '@/types';

interface RegistryEditorProps {
  sessionId: string;
}

const REGISTRY_HIVES: RegistryHive[] = [
  'HKEY_CLASSES_ROOT',
  'HKEY_CURRENT_USER',
  'HKEY_LOCAL_MACHINE',
  'HKEY_USERS',
  'HKEY_CURRENT_CONFIG',
];

const HIVE_SHORTCUTS: Record<RegistryHive, string> = {
  'HKEY_CLASSES_ROOT': 'HKCR',
  'HKEY_CURRENT_USER': 'HKCU',
  'HKEY_LOCAL_MACHINE': 'HKLM',
  'HKEY_USERS': 'HKU',
  'HKEY_CURRENT_CONFIG': 'HKCC',
};

const VALUE_TYPE_ICONS: Record<RegistryValueType, React.ReactNode> = {
  'REG_SZ': <Type className="h-4 w-4 text-blue-500" />,
  'REG_EXPAND_SZ': <Type className="h-4 w-4 text-cyan-500" />,
  'REG_BINARY': <Binary className="h-4 w-4 text-purple-500" />,
  'REG_DWORD': <Hash className="h-4 w-4 text-green-500" />,
  'REG_QWORD': <Hash className="h-4 w-4 text-emerald-500" />,
  'REG_MULTI_SZ': <FileText className="h-4 w-4 text-orange-500" />,
  'REG_NONE': <Database className="h-4 w-4 text-gray-500" />,
};

export function RegistryEditor({ sessionId }: RegistryEditorProps) {
  const [selectedHive, setSelectedHive] = useState<RegistryHive>('HKEY_LOCAL_MACHINE');
  const [currentPath, setCurrentPath] = useState('SOFTWARE');
  const [subkeys, setSubkeys] = useState<string[]>([]);
  const [values, setValues] = useState<RegistryValue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [createKeyDialogOpen, setCreateKeyDialogOpen] = useState(false);
  const [createValueDialogOpen, setCreateValueDialogOpen] = useState(false);
  const [editValueDialogOpen, setEditValueDialogOpen] = useState(false);
  const [deleteKeyDialogOpen, setDeleteKeyDialogOpen] = useState(false);
  const [deleteValueDialogOpen, setDeleteValueDialogOpen] = useState(false);

  // Form states
  const [newKeyName, setNewKeyName] = useState('');
  const [newValueName, setNewValueName] = useState('');
  const [newValueType, setNewValueType] = useState<RegistryValueType>('REG_SZ');
  const [newValueData, setNewValueData] = useState('');
  const [editingValue, setEditingValue] = useState<RegistryValue | null>(null);
  const [valueToDelete, setValueToDelete] = useState<string | null>(null);

  // Tree navigation history
  const [pathHistory, setPathHistory] = useState<string[]>([]);

  const loadSubkeys = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.registryListSubkeys(sessionId, {
        hive: selectedHive,
        path: currentPath,
      });
      setSubkeys(result.subkeys || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subkeys');
      setSubkeys([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadValues = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.registryListValues(sessionId, {
        hive: selectedHive,
        path: currentPath,
      });
      setValues(result.values || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load values');
      setValues([]);
    } finally {
      setIsLoading(false);
    }
  };

  const refresh = () => {
    loadSubkeys();
    loadValues();
  };

  const navigateTo = (subkey: string) => {
    setPathHistory([...pathHistory, currentPath]);
    const newPath = currentPath ? `${currentPath}\\${subkey}` : subkey;
    setCurrentPath(newPath);
  };

  const navigateUp = () => {
    if (pathHistory.length > 0) {
      const prevPath = pathHistory[pathHistory.length - 1];
      setPathHistory(pathHistory.slice(0, -1));
      setCurrentPath(prevPath);
    } else if (currentPath.includes('\\')) {
      const parts = currentPath.split('\\');
      parts.pop();
      setCurrentPath(parts.join('\\'));
    }
  };

  const createKeyMutation = useMutation({
    mutationFn: () => api.registryCreateKey(sessionId, {
      hive: selectedHive,
      path: currentPath ? `${currentPath}\\${newKeyName}` : newKeyName,
    }),
    onSuccess: () => {
      toast.success('Registry key created');
      setCreateKeyDialogOpen(false);
      setNewKeyName('');
      refresh();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create key');
    },
  });

  const createValueMutation = useMutation({
    mutationFn: () => api.registryWrite(sessionId, {
      hive: selectedHive,
      path: currentPath,
      valueName: newValueName,
      valueType: newValueType,
      data: parseValueData(newValueData, newValueType),
    }),
    onSuccess: () => {
      toast.success('Registry value created');
      setCreateValueDialogOpen(false);
      setNewValueName('');
      setNewValueData('');
      setNewValueType('REG_SZ');
      refresh();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create value');
    },
  });

  const updateValueMutation = useMutation({
    mutationFn: () => {
      if (!editingValue) throw new Error('No value selected');
      return api.registryWrite(sessionId, {
        hive: selectedHive,
        path: currentPath,
        valueName: editingValue.name,
        valueType: editingValue.type,
        data: parseValueData(newValueData, editingValue.type),
      });
    },
    onSuccess: () => {
      toast.success('Registry value updated');
      setEditValueDialogOpen(false);
      setEditingValue(null);
      setNewValueData('');
      refresh();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update value');
    },
  });

  const deleteKeyMutation = useMutation({
    mutationFn: () => api.registryDeleteKey(sessionId, {
      hive: selectedHive,
      path: currentPath,
    }),
    onSuccess: () => {
      toast.success('Registry key deleted');
      setDeleteKeyDialogOpen(false);
      navigateUp();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete key');
    },
  });

  const deleteValueMutation = useMutation({
    mutationFn: () => {
      if (!valueToDelete) throw new Error('No value selected');
      return api.registryDeleteValue(sessionId, {
        hive: selectedHive,
        path: currentPath,
        valueName: valueToDelete,
      });
    },
    onSuccess: () => {
      toast.success('Registry value deleted');
      setDeleteValueDialogOpen(false);
      setValueToDelete(null);
      refresh();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete value');
    },
  });

  const parseValueData = (data: string, type: RegistryValueType): string | number | string[] => {
    switch (type) {
      case 'REG_DWORD':
      case 'REG_QWORD':
        return parseInt(data, data.startsWith('0x') ? 16 : 10);
      case 'REG_MULTI_SZ':
        return data.split('\n').filter(s => s.trim());
      default:
        return data;
    }
  };

  const formatValueData = (value: RegistryValue): string => {
    if (Array.isArray(value.data)) {
      return value.data.join(', ');
    }
    if (typeof value.data === 'number') {
      return `${value.data} (0x${value.data.toString(16).toUpperCase()})`;
    }
    return String(value.data);
  };

  const openEditDialog = (value: RegistryValue) => {
    setEditingValue(value);
    if (Array.isArray(value.data)) {
      setNewValueData(value.data.join('\n'));
    } else {
      setNewValueData(String(value.data));
    }
    setEditValueDialogOpen(true);
  };

  const fullPath = `${HIVE_SHORTCUTS[selectedHive]}\\${currentPath}`;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="h-5 w-5 text-yellow-500" />
                Windows Registry Editor
              </CardTitle>
              <CardDescription>Browse and modify Windows Registry keys and values</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedHive} onValueChange={(v) => setSelectedHive(v as RegistryHive)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REGISTRY_HIVES.map((hive) => (
                    <SelectItem key={hive} value={hive}>
                      {HIVE_SHORTCUTS[hive]} ({hive})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={refresh} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Path bar */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={navigateUp} disabled={!currentPath}>
              ..
            </Button>
            <Input
              value={currentPath}
              onChange={(e) => setCurrentPath(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && refresh()}
              placeholder="Enter registry path..."
              className="font-mono text-sm"
            />
            <Button onClick={refresh} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Go'}
            </Button>
          </div>

          {/* Full path display */}
          <div className="text-sm font-mono text-muted-foreground bg-muted/50 px-3 py-2 rounded">
            {fullPath}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 px-3 py-2 rounded">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Subkeys panel */}
            <Card>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Subkeys</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCreateKeyDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    New Key
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[300px]">
                  {subkeys.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      {isLoading ? 'Loading...' : 'No subkeys found'}
                    </div>
                  ) : (
                    <div className="divide-y">
                      {subkeys.map((subkey) => (
                        <div
                          key={subkey}
                          className="flex items-center gap-2 px-4 py-2 hover:bg-muted/50 cursor-pointer group"
                          onClick={() => navigateTo(subkey)}
                        >
                          <FolderClosed className="h-4 w-4 text-yellow-500" />
                          <span className="flex-1 text-sm truncate">{subkey}</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Values panel */}
            <Card>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Values</CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCreateValueDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      New Value
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setDeleteKeyDialogOpen(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[300px]">
                  {values.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      {isLoading ? 'Loading...' : 'No values found'}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px]"></TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {values.map((value) => (
                          <TableRow key={value.name} className="group">
                            <TableCell>{VALUE_TYPE_ICONS[value.type]}</TableCell>
                            <TableCell className="font-mono text-xs">
                              {value.name || '(Default)'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {value.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                              {formatValueData(value)}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => openEditDialog(value)}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive"
                                  onClick={() => {
                                    setValueToDelete(value.name);
                                    setDeleteValueDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Create Key Dialog */}
      <Dialog open={createKeyDialogOpen} onOpenChange={setCreateKeyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Registry Key</DialogTitle>
            <DialogDescription>
              Create a new subkey under {fullPath}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="keyName">Key Name</Label>
              <Input
                id="keyName"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="NewKey"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateKeyDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createKeyMutation.mutate()}
              disabled={!newKeyName || createKeyMutation.isPending}
            >
              {createKeyMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Value Dialog */}
      <Dialog open={createValueDialogOpen} onOpenChange={setCreateValueDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Registry Value</DialogTitle>
            <DialogDescription>
              Create a new value in {fullPath}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="valueName">Value Name</Label>
              <Input
                id="valueName"
                value={newValueName}
                onChange={(e) => setNewValueName(e.target.value)}
                placeholder="ValueName"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="valueType">Value Type</Label>
              <Select value={newValueType} onValueChange={(v) => setNewValueType(v as RegistryValueType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REG_SZ">REG_SZ (String)</SelectItem>
                  <SelectItem value="REG_EXPAND_SZ">REG_EXPAND_SZ (Expandable String)</SelectItem>
                  <SelectItem value="REG_DWORD">REG_DWORD (32-bit Integer)</SelectItem>
                  <SelectItem value="REG_QWORD">REG_QWORD (64-bit Integer)</SelectItem>
                  <SelectItem value="REG_BINARY">REG_BINARY (Binary)</SelectItem>
                  <SelectItem value="REG_MULTI_SZ">REG_MULTI_SZ (Multi-String)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="valueData">Value Data</Label>
              {newValueType === 'REG_MULTI_SZ' ? (
                <textarea
                  id="valueData"
                  value={newValueData}
                  onChange={(e) => setNewValueData(e.target.value)}
                  placeholder="One value per line"
                  className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                />
              ) : (
                <Input
                  id="valueData"
                  value={newValueData}
                  onChange={(e) => setNewValueData(e.target.value)}
                  placeholder={newValueType.includes('DWORD') || newValueType.includes('QWORD') ? '0 or 0x0' : 'Value data'}
                  className="font-mono"
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateValueDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createValueMutation.mutate()}
              disabled={!newValueName || createValueMutation.isPending}
            >
              {createValueMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Value Dialog */}
      <Dialog open={editValueDialogOpen} onOpenChange={setEditValueDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Registry Value</DialogTitle>
            <DialogDescription>
              Modify the value "{editingValue?.name || '(Default)'}"
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Value Name</Label>
              <Input value={editingValue?.name || '(Default)'} disabled className="font-mono" />
            </div>
            <div className="grid gap-2">
              <Label>Value Type</Label>
              <Input value={editingValue?.type || ''} disabled className="font-mono" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editValueData">Value Data</Label>
              {editingValue?.type === 'REG_MULTI_SZ' ? (
                <textarea
                  id="editValueData"
                  value={newValueData}
                  onChange={(e) => setNewValueData(e.target.value)}
                  placeholder="One value per line"
                  className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                />
              ) : (
                <Input
                  id="editValueData"
                  value={newValueData}
                  onChange={(e) => setNewValueData(e.target.value)}
                  className="font-mono"
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditValueDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => updateValueMutation.mutate()}
              disabled={updateValueMutation.isPending}
            >
              {updateValueMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Key Dialog */}
      <AlertDialog open={deleteKeyDialogOpen} onOpenChange={setDeleteKeyDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Registry Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the key "{fullPath}" and all its subkeys and values?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteKeyMutation.mutate()}
              className="bg-destructive text-destructive-foreground"
            >
              {deleteKeyMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Value Dialog */}
      <AlertDialog open={deleteValueDialogOpen} onOpenChange={setDeleteValueDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Registry Value</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the value "{valueToDelete}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteValueMutation.mutate()}
              className="bg-destructive text-destructive-foreground"
            >
              {deleteValueMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
