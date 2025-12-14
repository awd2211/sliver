import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Variable,
  Search,
  Copy,
  Check,
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import type { EnvironmentVariable } from '@/types';

interface EnvironmentPanelProps {
  sessionId: string;
}

export function EnvironmentPanel({ sessionId }: EnvironmentPanelProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedVar, setSelectedVar] = useState<EnvironmentVariable | null>(null);

  // Form states
  const [newVarName, setNewVarName] = useState('');
  const [newVarValue, setNewVarValue] = useState('');

  // Fetch environment variables
  const { data: envData, isLoading, refetch } = useQuery({
    queryKey: ['environment-variables', sessionId],
    queryFn: () => api.getEnvironmentVariables(sessionId),
  });

  // Set environment variable mutation
  const setEnvMutation = useMutation({
    mutationFn: ({ name, value }: { name: string; value: string }) =>
      api.setEnvironmentVariable(sessionId, { name, value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environment-variables', sessionId] });
      toast.success('Environment variable set');
      setAddDialogOpen(false);
      setEditDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Failed to set environment variable: ${error.message}`);
    },
  });

  // Unset environment variable mutation
  const unsetEnvMutation = useMutation({
    mutationFn: (name: string) => api.unsetEnvironmentVariable(sessionId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environment-variables', sessionId] });
      toast.success('Environment variable removed');
      setDeleteDialogOpen(false);
      setSelectedVar(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove environment variable: ${error.message}`);
    },
  });

  const envVariables = envData?.variables || [];

  // Filter environment variables by search
  const filteredEnvVars = envVariables.filter((v: EnvironmentVariable) =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.value.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => {
    setNewVarName('');
    setNewVarValue('');
    setSelectedVar(null);
  };

  const copyToClipboard = (name: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedVar(name);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedVar(null), 2000);
  };

  const handleAddVariable = () => {
    if (!newVarName.trim()) {
      toast.error('Variable name is required');
      return;
    }
    setEnvMutation.mutate({ name: newVarName.trim(), value: newVarValue });
  };

  const handleEditVariable = () => {
    if (!selectedVar) return;
    if (!newVarName.trim()) {
      toast.error('Variable name is required');
      return;
    }
    setEnvMutation.mutate({ name: newVarName.trim(), value: newVarValue });
  };

  const handleDeleteVariable = () => {
    if (!selectedVar) return;
    unsetEnvMutation.mutate(selectedVar.name);
  };

  const openEditDialog = (v: EnvironmentVariable) => {
    setSelectedVar(v);
    setNewVarName(v.name);
    setNewVarValue(v.value);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (v: EnvironmentVariable) => {
    setSelectedVar(v);
    setDeleteDialogOpen(true);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Variable className="h-5 w-5 text-yellow-500" />
            Environment Variables
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{filteredEnvVars.length} variables</Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                resetForm();
                setAddDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search variables..."
            className="pl-10 h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEnvVars.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {search ? 'No matching variables found' : 'No environment variables'}
            </p>
          ) : (
            <div className="space-y-1">
              {filteredEnvVars.map((v: EnvironmentVariable) => (
                <div
                  key={v.name}
                  className="flex items-start gap-2 p-2 rounded hover:bg-muted/50 group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-yellow-500">{v.name}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate" title={v.value}>
                      {v.value}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => copyToClipboard(v.name, v.value)}
                      title="Copy value"
                    >
                      {copiedVar === v.name ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(v)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog(v)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>

      {/* Add Variable Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Environment Variable</DialogTitle>
            <DialogDescription>
              Set a new environment variable on the remote system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="var-name">Variable Name</Label>
              <Input
                id="var-name"
                placeholder="MY_VARIABLE"
                value={newVarName}
                onChange={(e) => setNewVarName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="var-value">Value</Label>
              <Input
                id="var-value"
                placeholder="value"
                value={newVarValue}
                onChange={(e) => setNewVarValue(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddVariable}
              disabled={setEnvMutation.isPending}
            >
              {setEnvMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Variable Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Environment Variable</DialogTitle>
            <DialogDescription>
              Modify the environment variable value.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-var-name">Variable Name</Label>
              <Input
                id="edit-var-name"
                value={newVarName}
                onChange={(e) => setNewVarName(e.target.value)}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-var-value">Value</Label>
              <Input
                id="edit-var-value"
                placeholder="value"
                value={newVarValue}
                onChange={(e) => setNewVarValue(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditVariable}
              disabled={setEnvMutation.isPending}
            >
              {setEnvMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Environment Variable</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the environment variable "{selectedVar?.name}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVariable}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {unsetEnvMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
