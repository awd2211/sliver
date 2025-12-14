import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Package,
  Download,
  Trash2,
  RefreshCw,
  Loader2,
  Search,
  ExternalLink,
  Check,
  Terminal,
  Puzzle,
} from 'lucide-react';
import api from '@/lib/api';
import type { ArmoryPackage } from '@/types';

export function Armory() {
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['armory'],
    queryFn: () => api.getArmoryIndex(),
  });

  const installMutation = useMutation({
    mutationFn: (name: string) => api.installArmoryPackage(name),
    onSuccess: (_, name) => {
      queryClient.invalidateQueries({ queryKey: ['armory'] });
      toast.success('Package installed', {
        description: `Successfully installed ${name}`,
      });
    },
    onError: (error: Error) => {
      toast.error('Installation failed', {
        description: error.message,
      });
    },
  });

  const uninstallMutation = useMutation({
    mutationFn: (name: string) => api.uninstallArmoryPackage(name),
    onSuccess: (_, name) => {
      queryClient.invalidateQueries({ queryKey: ['armory'] });
      toast.success('Package uninstalled', {
        description: `Successfully uninstalled ${name}`,
      });
    },
    onError: (error: Error) => {
      toast.error('Uninstallation failed', {
        description: error.message,
      });
    },
  });

  const refreshMutation = useMutation({
    mutationFn: () => api.refreshArmory(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['armory'] });
      toast.success('Armory refreshed', {
        description: 'Package index updated successfully',
      });
    },
    onError: (error: Error) => {
      toast.error('Refresh failed', {
        description: error.message,
      });
    },
  });

  const aliases = data?.armory?.aliases ?? [];
  const extensions = data?.armory?.extensions ?? [];

  const filterPackages = (packages: ArmoryPackage[]) => {
    if (!searchTerm) return packages;
    const term = searchTerm.toLowerCase();
    return packages.filter(
      (pkg) =>
        pkg.name.toLowerCase().includes(term) ||
        pkg.commandName.toLowerCase().includes(term) ||
        pkg.helpText?.toLowerCase().includes(term)
    );
  };

  const filteredAliases = filterPackages(aliases);
  const filteredExtensions = filterPackages(extensions);

  const PackageTable = ({ packages, type }: { packages: ArmoryPackage[]; type: string }) => (
    <ScrollArea className="h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Command</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[150px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {packages.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                No {type} found
              </TableCell>
            </TableRow>
          ) : (
            packages.map((pkg) => (
              <TableRow key={pkg.name}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{pkg.name}</span>
                    {pkg.helpText && (
                      <span className="text-xs text-muted-foreground line-clamp-1">
                        {pkg.helpText}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <code className="bg-muted px-2 py-1 rounded text-sm">{pkg.commandName}</code>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{pkg.version}</Badge>
                  {pkg.installedVersion && pkg.installedVersion !== pkg.version && (
                    <Badge variant="secondary" className="ml-2">
                      Installed: {pkg.installedVersion}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {pkg.isInstalled ? (
                    <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                      <Check className="h-3 w-3 mr-1" />
                      Installed
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Not installed</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {pkg.repoUrl && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => window.open(pkg.repoUrl, '_blank')}
                        title="View repository"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                    {pkg.isInstalled ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => uninstallMutation.mutate(pkg.name)}
                        disabled={uninstallMutation.isPending}
                        title="Uninstall"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-green-600"
                        onClick={() => installMutation.mutate(pkg.name)}
                        disabled={installMutation.isPending}
                        title="Install"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </ScrollArea>
  );

  const installedCount = aliases.filter((a) => a.isInstalled).length + extensions.filter((e) => e.isInstalled).length;
  const totalCount = aliases.length + extensions.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Package className="h-8 w-8 text-yellow-500" />
            Armory
          </h1>
          <p className="text-muted-foreground">
            Browse and manage extensions and aliases
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending || isFetching}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${(refreshMutation.isPending || isFetching) ? 'animate-spin' : ''}`} />
          Refresh Index
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Packages</CardDescription>
            <CardTitle className="text-2xl">{totalCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Installed</CardDescription>
            <CardTitle className="text-2xl text-green-600">{installedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Aliases</CardDescription>
            <CardTitle className="text-2xl">{aliases.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Extensions</CardDescription>
            <CardTitle className="text-2xl">{extensions.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search packages..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Package tabs */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="aliases">
          <TabsList>
            <TabsTrigger value="aliases" className="flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              Aliases ({filteredAliases.length})
            </TabsTrigger>
            <TabsTrigger value="extensions" className="flex items-center gap-2">
              <Puzzle className="h-4 w-4" />
              Extensions ({filteredExtensions.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="aliases" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Aliases</CardTitle>
                <CardDescription>
                  Command aliases for common operations
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <PackageTable packages={filteredAliases} type="aliases" />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="extensions" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Extensions</CardTitle>
                <CardDescription>
                  Extended functionality modules
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <PackageTable packages={filteredExtensions} type="extensions" />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
