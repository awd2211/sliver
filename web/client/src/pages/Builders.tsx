import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Hammer,
  RefreshCw,
  Loader2,
  Monitor,
  Wrench,
  FileCode,
  User,
  HelpCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import api from '@/lib/api';
import type { Builder, CrossCompiler } from '@/types';

export function Builders() {
  const [selectedBuilder, setSelectedBuilder] = useState<Builder | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['builders'],
    queryFn: () => api.getBuilders(),
  });

  const builders = data?.builders ?? [];

  const getOsIcon = (os: string) => {
    const osLower = os.toLowerCase();
    if (osLower.includes('windows')) return '🪟';
    if (osLower.includes('linux')) return '🐧';
    if (osLower.includes('darwin') || osLower.includes('macos')) return '🍎';
    return '💻';
  };

  const handleViewDetails = (builder: Builder) => {
    setSelectedBuilder(builder);
    setDetailsOpen(true);
  };

  // Count supported targets
  const getSupportedTargets = (builder: Builder) => {
    const nativeTarget = `${builder.goos}/${builder.goarch}`;
    const crossTargets = builder.crossCompilers.map(
      (cc) => `${cc.targetGoos}/${cc.targetGoarch}`
    );
    return [nativeTarget, ...crossTargets];
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
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Hammer className="h-8 w-8 text-yellow-500" />
            Builders
          </h1>
          <p className="text-muted-foreground">External build servers for implant generation</p>
        </div>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Failed to load builders: {error.message}</p>
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
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Hammer className="h-8 w-8 text-yellow-500" />
            Builders
          </h1>
          <p className="text-muted-foreground">
            {builders.length} builder{builders.length !== 1 ? 's' : ''} connected
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

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Builders</CardTitle>
            <Hammer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{builders.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Windows Targets</CardTitle>
            <span className="text-lg">🪟</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {builders.filter(b =>
                b.goos === 'windows' ||
                b.crossCompilers.some(cc => cc.targetGoos === 'windows')
              ).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Linux Targets</CardTitle>
            <span className="text-lg">🐧</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {builders.filter(b =>
                b.goos === 'linux' ||
                b.crossCompilers.some(cc => cc.targetGoos === 'linux')
              ).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">macOS Targets</CardTitle>
            <span className="text-lg">🍎</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {builders.filter(b =>
                b.goos === 'darwin' ||
                b.crossCompilers.some(cc => cc.targetGoos === 'darwin')
              ).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Builders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Builders</CardTitle>
          <CardDescription>
            External build servers available for implant generation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {builders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Hammer className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No Builders Connected</p>
              <p className="text-sm">
                External builders can be started using the Sliver CLI
              </p>
              <p className="text-xs mt-2 font-mono bg-muted p-2 rounded inline-block">
                builder --operator-config builder.cfg
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Templates</TableHead>
                  <TableHead>Cross Compilers</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {builders.map((builder) => (
                  <TableRow
                    key={builder.name}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewDetails(builder)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Hammer className="h-4 w-4 text-yellow-500" />
                        {builder.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {builder.operatorName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getOsIcon(builder.goos)} {builder.goos}/{builder.goarch}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <FileCode className="h-4 w-4 text-muted-foreground" />
                        <span>{builder.templates.length}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {builder.crossCompilers.length > 0 ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>{builder.crossCompilers.length}</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">None</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(builder);
                        }}
                      >
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Builder Info Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            About External Builders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            External builders allow distributed implant generation across multiple machines.
            This is useful for cross-compilation and to offload resource-intensive build
            operations from the main server.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-1 flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                Native Builds
              </h4>
              <p className="text-xs text-muted-foreground">
                Each builder can generate implants for its native OS/architecture without
                any additional configuration.
              </p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-1 flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Cross Compilation
              </h4>
              <p className="text-xs text-muted-foreground">
                With proper cross-compilers configured, builders can generate implants
                for different target platforms.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Builder Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hammer className="h-5 w-5 text-yellow-500" />
              {selectedBuilder?.name}
            </DialogTitle>
            <DialogDescription>Builder configuration details</DialogDescription>
          </DialogHeader>
          {selectedBuilder && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Operator</p>
                  <p className="font-medium">{selectedBuilder.operatorName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Platform</p>
                  <Badge variant="secondary">
                    {getOsIcon(selectedBuilder.goos)} {selectedBuilder.goos}/{selectedBuilder.goarch}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-muted-foreground text-sm mb-2">Supported Targets</p>
                <div className="flex flex-wrap gap-2">
                  {getSupportedTargets(selectedBuilder).map((target) => (
                    <Badge key={target} variant="outline">
                      {getOsIcon(target.split('/')[0])} {target}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-muted-foreground text-sm mb-2">
                  Templates ({selectedBuilder.templates.length})
                </p>
                {selectedBuilder.templates.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedBuilder.templates.map((template) => (
                      <Badge key={template} variant="secondary" className="font-mono text-xs">
                        {template}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No templates available</p>
                )}
              </div>

              {selectedBuilder.crossCompilers.length > 0 && (
                <div>
                  <p className="text-muted-foreground text-sm mb-2">Cross Compilers</p>
                  <div className="space-y-2">
                    {selectedBuilder.crossCompilers.map((cc: CrossCompiler, index: number) => (
                      <div
                        key={index}
                        className="p-2 bg-muted/50 rounded-lg text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline">
                            {getOsIcon(cc.targetGoos)} {cc.targetGoos}/{cc.targetGoarch}
                          </Badge>
                        </div>
                        <div className="font-mono text-muted-foreground">
                          <p>CC: {cc.ccPath}</p>
                          <p>CXX: {cc.cxxPath}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
