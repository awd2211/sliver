import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Settings,
  Plus,
  Trash2,
  RefreshCw,
  Loader2,
  FileJson,
  Eye,
} from 'lucide-react';
import api from '@/lib/api';
import type { C2Profile } from '@/types';

export function C2Profiles() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<C2Profile | null>(null);
  const [newName, setNewName] = useState('');
  const [newConfig, setNewConfig] = useState('{\n  \n}');
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['c2profiles'],
    queryFn: () => api.getC2Profiles(),
  });

  const createMutation = useMutation({
    mutationFn: (profile: C2Profile) => api.createC2Profile(profile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['c2profiles'] });
      setCreateDialogOpen(false);
      resetForm();
      toast.success('C2 Profile created');
    },
    onError: (error: Error) => {
      toast.error('Failed to create profile', {
        description: error.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (name: string) => api.deleteC2Profile(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['c2profiles'] });
      toast.success('C2 Profile deleted');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete profile', {
        description: error.message,
      });
    },
  });

  const resetForm = () => {
    setNewName('');
    setNewConfig('{\n  \n}');
  };

  const handleCreate = () => {
    try {
      const config = JSON.parse(newConfig);
      createMutation.mutate({ name: newName, serverConfig: config });
    } catch (_e) {
      toast.error('Invalid JSON', {
        description: 'Please enter valid JSON configuration',
      });
    }
  };

  const viewProfile = (profile: C2Profile) => {
    setSelectedProfile(profile);
    setViewDialogOpen(true);
  };

  const profiles = data?.profiles ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Settings className="h-8 w-8 text-yellow-500" />
            C2 Profiles
          </h1>
          <p className="text-muted-foreground">
            Manage HTTP C2 communication profiles
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950">
                <Plus className="h-4 w-4 mr-2" />
                New Profile
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create C2 Profile</DialogTitle>
                <DialogDescription>
                  Define a new HTTP C2 communication profile
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Profile Name</Label>
                  <Input
                    id="name"
                    placeholder="my-profile"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="config">Configuration (JSON)</Label>
                  <Textarea
                    id="config"
                    className="font-mono min-h-[300px]"
                    placeholder="Enter profile configuration..."
                    value={newConfig}
                    onChange={(e) => setNewConfig(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={createMutation.isPending || !newName}
                  className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Profile
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            Profiles
          </CardTitle>
          <CardDescription>
            HTTP C2 configuration profiles for implant communications
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileJson className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No C2 profiles configured</p>
              <p className="text-sm">Create a profile to customize HTTP C2 behavior</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Config Keys</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((profile) => (
                    <TableRow key={profile.name}>
                      <TableCell className="font-medium">{profile.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {profile.serverConfig && Object.keys(profile.serverConfig).slice(0, 3).map((key) => (
                            <Badge key={`server-${key}`} variant="secondary" className="text-xs">
                              server.{key}
                            </Badge>
                          ))}
                          {profile.implantConfig && Object.keys(profile.implantConfig).slice(0, 2).map((key) => (
                            <Badge key={`implant-${key}`} variant="outline" className="text-xs">
                              implant.{key}
                            </Badge>
                          ))}
                          {!profile.serverConfig && !profile.implantConfig && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              No config
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => viewProfile(profile)}
                            title="View profile"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                title="Delete profile"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Profile</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete the profile "{profile.name}"?
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(profile.name)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* View Profile Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Profile: {selectedProfile?.name}</DialogTitle>
            <DialogDescription>
              View C2 profile configuration
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[500px]">
            {selectedProfile?.serverConfig && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">Server Config</h4>
                <pre className="bg-muted p-4 rounded-md text-sm overflow-auto">
                  {JSON.stringify(selectedProfile.serverConfig, null, 2)}
                </pre>
              </div>
            )}
            {selectedProfile?.implantConfig && (
              <div>
                <h4 className="text-sm font-medium mb-2">Implant Config</h4>
                <pre className="bg-muted p-4 rounded-md text-sm overflow-auto">
                  {JSON.stringify(selectedProfile.implantConfig, null, 2)}
                </pre>
              </div>
            )}
            {!selectedProfile?.serverConfig && !selectedProfile?.implantConfig && (
              <p className="text-muted-foreground text-center py-4">No configuration data available</p>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
