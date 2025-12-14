import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Loader2,
  Plus,
  Trash2,
  Play,
  FileCode,
  Settings2,
  Info,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { ImplantProfile, CreateProfileRequest } from '@/types';

export function Profiles() {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ImplantProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state for new profile
  const [newProfile, setNewProfile] = useState<Partial<CreateProfileRequest>>({
    name: '',
    config: {
      goos: 'windows',
      goarch: 'amd64',
      isBeacon: false,
      debug: false,
      evasion: false,
      obfuscateSymbols: true,
      format: 'exe',
      beaconInterval: 60,
      beaconJitter: 30,
    },
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => api.getProfiles(),
  });

  const createMutation = useMutation({
    mutationFn: (req: CreateProfileRequest) => api.createProfile(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Profile created successfully');
      setCreateDialogOpen(false);
      resetForm();
    },
    onError: (err: Error) => {
      toast.error(`Failed to create profile: ${err.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (name: string) => api.deleteProfile(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Profile deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedProfile(null);
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete profile: ${err.message}`);
    },
  });

  const generateMutation = useMutation({
    mutationFn: (name: string) => api.generateFromProfile(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['implants'] });
      toast.success('Implant generated successfully');
    },
    onError: (err: Error) => {
      toast.error(`Failed to generate implant: ${err.message}`);
    },
  });

  const resetForm = () => {
    setNewProfile({
      name: '',
      config: {
        goos: 'windows',
        goarch: 'amd64',
        isBeacon: false,
        debug: false,
        evasion: false,
        obfuscateSymbols: true,
        format: 'exe',
        beaconInterval: 60,
        beaconJitter: 30,
      },
    });
  };

  const handleCreate = () => {
    if (!newProfile.name) {
      toast.error('Profile name is required');
      return;
    }
    createMutation.mutate(newProfile as CreateProfileRequest);
  };

  const profiles = data?.profiles || [];
  const filteredProfiles = profiles.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.config.goos.toLowerCase().includes(searchTerm.toLowerCase())
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
            <CardTitle className="text-destructive">Error loading profiles</CardTitle>
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
          <h1 className="text-2xl font-bold">Implant Profiles</h1>
          <p className="text-muted-foreground">
            Manage implant configuration profiles for quick generation
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Profile
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5" />
              Profiles ({profiles.length})
            </CardTitle>
            <Input
              placeholder="Search profiles..."
              className="w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredProfiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No profiles match your search' : 'No profiles configured'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>OS</TableHead>
                  <TableHead>Arch</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Options</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles.map((profile) => (
                  <TableRow key={profile.name}>
                    <TableCell className="font-medium">{profile.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{profile.config.goos}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{profile.config.goarch}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{profile.config.format}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={profile.config.isBeacon ? 'default' : 'secondary'}>
                        {profile.config.isBeacon ? 'Beacon' : 'Session'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {profile.config.debug && (
                          <Badge variant="outline" className="text-xs">Debug</Badge>
                        )}
                        {profile.config.evasion && (
                          <Badge variant="outline" className="text-xs">Evasion</Badge>
                        )}
                        {profile.config.obfuscateSymbols && (
                          <Badge variant="outline" className="text-xs">Obfuscated</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedProfile(profile);
                            setDetailDialogOpen(true);
                          }}
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => generateMutation.mutate(profile.name)}
                          disabled={generateMutation.isPending}
                        >
                          {generateMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedProfile(profile);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Profile Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Profile</DialogTitle>
            <DialogDescription>
              Configure a new implant profile for quick generation
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 p-1">
              <div className="space-y-2">
                <Label htmlFor="name">Profile Name</Label>
                <Input
                  id="name"
                  placeholder="my-profile"
                  value={newProfile.name}
                  onChange={(e) => setNewProfile({ ...newProfile, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Operating System</Label>
                  <Select
                    value={newProfile.config?.goos}
                    onValueChange={(v) =>
                      setNewProfile({
                        ...newProfile,
                        config: { ...newProfile.config, goos: v },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="windows">Windows</SelectItem>
                      <SelectItem value="linux">Linux</SelectItem>
                      <SelectItem value="darwin">macOS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Architecture</Label>
                  <Select
                    value={newProfile.config?.goarch}
                    onValueChange={(v) =>
                      setNewProfile({
                        ...newProfile,
                        config: { ...newProfile.config, goarch: v },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="amd64">x86_64 (amd64)</SelectItem>
                      <SelectItem value="386">x86 (386)</SelectItem>
                      <SelectItem value="arm64">ARM64</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Format</Label>
                  <Select
                    value={newProfile.config?.format}
                    onValueChange={(v) =>
                      setNewProfile({
                        ...newProfile,
                        config: { ...newProfile.config, format: v },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exe">Executable</SelectItem>
                      <SelectItem value="shared">Shared Library</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="shellcode">Shellcode</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={newProfile.config?.isBeacon ? 'beacon' : 'session'}
                    onValueChange={(v) =>
                      setNewProfile({
                        ...newProfile,
                        config: { ...newProfile.config, isBeacon: v === 'beacon' },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="session">Session (Interactive)</SelectItem>
                      <SelectItem value="beacon">Beacon (Async)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {newProfile.config?.isBeacon && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="interval">Beacon Interval (seconds)</Label>
                    <Input
                      id="interval"
                      type="number"
                      value={newProfile.config?.beaconInterval}
                      onChange={(e) =>
                        setNewProfile({
                          ...newProfile,
                          config: {
                            ...newProfile.config,
                            beaconInterval: parseInt(e.target.value) || 60,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jitter">Jitter (%)</Label>
                    <Input
                      id="jitter"
                      type="number"
                      value={newProfile.config?.beaconJitter}
                      onChange={(e) =>
                        setNewProfile({
                          ...newProfile,
                          config: {
                            ...newProfile.config,
                            beaconJitter: parseInt(e.target.value) || 30,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              )}

              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Options
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="debug">Debug Mode</Label>
                    <Switch
                      id="debug"
                      checked={newProfile.config?.debug}
                      onCheckedChange={(v) =>
                        setNewProfile({
                          ...newProfile,
                          config: { ...newProfile.config, debug: v },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="evasion">Evasion</Label>
                    <Switch
                      id="evasion"
                      checked={newProfile.config?.evasion}
                      onCheckedChange={(v) =>
                        setNewProfile({
                          ...newProfile,
                          config: { ...newProfile.config, evasion: v },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="obfuscate">Obfuscate Symbols</Label>
                    <Switch
                      id="obfuscate"
                      checked={newProfile.config?.obfuscateSymbols}
                      onCheckedChange={(v) =>
                        setNewProfile({
                          ...newProfile,
                          config: { ...newProfile.config, obfuscateSymbols: v },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sgn">SGN Encoding</Label>
                    <Switch
                      id="sgn"
                      checked={newProfile.config?.sgn}
                      onCheckedChange={(v) =>
                        setNewProfile({
                          ...newProfile,
                          config: { ...newProfile.config, sgn: v },
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Profile Details: {selectedProfile?.name}</DialogTitle>
          </DialogHeader>
          {selectedProfile && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Operating System</Label>
                    <p className="font-medium">{selectedProfile.config.goos}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Architecture</Label>
                    <p className="font-medium">{selectedProfile.config.goarch}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Format</Label>
                    <p className="font-medium">{selectedProfile.config.format}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Type</Label>
                    <p className="font-medium">
                      {selectedProfile.config.isBeacon ? 'Beacon' : 'Session'}
                    </p>
                  </div>
                  {selectedProfile.config.isBeacon && (
                    <>
                      <div>
                        <Label className="text-muted-foreground">Beacon Interval</Label>
                        <p className="font-medium">{selectedProfile.config.beaconInterval}s</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Jitter</Label>
                        <p className="font-medium">{selectedProfile.config.beaconJitter}%</p>
                      </div>
                    </>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <Label className="text-muted-foreground">Configuration JSON</Label>
                  <pre className="mt-2 p-4 bg-muted rounded-lg text-xs overflow-auto">
                    {JSON.stringify(selectedProfile.config, null, 2)}
                  </pre>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(selectedProfile.config, null, 2));
                      toast.success('Configuration copied to clipboard');
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy JSON
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (selectedProfile) {
                  generateMutation.mutate(selectedProfile.name);
                  setDetailDialogOpen(false);
                }
              }}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Generate Implant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Profile</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the profile "{selectedProfile?.name}"? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedProfile && deleteMutation.mutate(selectedProfile.name)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
