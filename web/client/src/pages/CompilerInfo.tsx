import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Cpu, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import api from '@/lib/api';
import type { CompilerInfo } from '@/types';

export default function CompilerInfoPage() {
  const { data, isLoading, refetch, error } = useQuery<CompilerInfo>({
    queryKey: ['compiler-info'],
    queryFn: () => api.getCompilerInfo(),
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Compiler Information</h1>
          <p className="text-muted-foreground">
            Go compiler and cross-compilation targets
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-destructive">
          <p>Failed to load compiler information</p>
        </div>
      ) : data ? (
        <div className="grid gap-6">
          {/* Go Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Cpu className="h-4 w-4" />
                Go Compiler
              </CardTitle>
              <CardDescription>
                Go compiler version and host platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground uppercase">Go Version</div>
                  <div className="font-mono text-lg">{data.goVersion || 'Unknown'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase">GOOS</div>
                  <div className="font-mono text-lg">{data.goos || 'Unknown'}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase">GOARCH</div>
                  <div className="font-mono text-lg">{data.goarch || 'Unknown'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cross Compilers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cross Compilers</CardTitle>
              <CardDescription>
                Available C/C++ cross compilers for CGO support
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.crossCompilers && data.crossCompilers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Target OS</TableHead>
                      <TableHead>Architecture</TableHead>
                      <TableHead>CC Path</TableHead>
                      <TableHead>CXX Path</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.crossCompilers.map((cc, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Badge variant="outline">{cc.targetGoos}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{cc.targetGoarch}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{cc.ccPath || '-'}</TableCell>
                        <TableCell className="font-mono text-xs">{cc.cxxPath || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Cpu className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No cross compilers available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Supported Targets */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Supported Targets</CardTitle>
              <CardDescription>
                Implant build targets with CGO support status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.supportedTargets && data.supportedTargets.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>OS</TableHead>
                      <TableHead>Architecture</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead>CGO</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.supportedTargets.map((target, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Badge variant="outline">{target.goos}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{target.goarch}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{target.format || '-'}</TableCell>
                        <TableCell>
                          {target.cgoEnabled ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Cpu className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No supported targets available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
