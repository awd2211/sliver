import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Bird,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import api from '@/lib/api';
import { format } from 'date-fns';

export function Canaries() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['canaries'],
    queryFn: () => api.getCanaries(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const canaries = data?.canaries ?? [];
  const triggeredCount = canaries.filter((c) => c.triggered).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Bird className="h-8 w-8 text-yellow-500" />
            Canaries
          </h1>
          <p className="text-muted-foreground">
            DNS canary detection for monitoring implant activity
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Canaries</CardDescription>
            <CardTitle className="text-2xl">{canaries.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Triggered</CardDescription>
            <CardTitle className="text-2xl text-red-600">{triggeredCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Safe</CardDescription>
            <CardTitle className="text-2xl text-green-600">{canaries.length - triggeredCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Alert if any triggered */}
      {triggeredCount > 0 && (
        <Card className="border-red-500/50 bg-red-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Canary Alert
            </CardTitle>
            <CardDescription className="text-red-600/80">
              {triggeredCount} canary {triggeredCount === 1 ? 'has' : 'have'} been triggered.
              This may indicate that an implant has been analyzed or sandboxed.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bird className="h-5 w-5" />
            Canary List
          </CardTitle>
          <CardDescription>
            DNS canaries embedded in implants for detection
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : canaries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bird className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No canaries configured</p>
              <p className="text-sm">Canaries are automatically created when generating implants with DNS C2</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Implant</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Trigger Count</TableHead>
                    <TableHead>First Trigger</TableHead>
                    <TableHead>Latest Trigger</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {canaries.map((canary) => (
                    <TableRow key={canary.id} className={canary.triggered ? 'bg-red-500/5' : ''}>
                      <TableCell className="font-medium">{canary.implantName}</TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {canary.domain}
                        </code>
                      </TableCell>
                      <TableCell>
                        {canary.triggered ? (
                          <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                            <AlertTriangle className="h-3 w-3" />
                            Triggered
                          </Badge>
                        ) : (
                          <Badge className="bg-green-500/10 text-green-600 flex items-center gap-1 w-fit">
                            <CheckCircle className="h-3 w-3" />
                            Safe
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {canary.triggeredCount > 0 ? (
                          <Badge variant="secondary">{canary.triggeredCount}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {canary.firstTrigger ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {format(new Date(canary.firstTrigger), 'PPp')}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {canary.latestTrigger ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {format(new Date(canary.latestTrigger), 'PPp')}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">About DNS Canaries</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            DNS canaries are unique subdomains embedded in implants that, when resolved,
            indicate the implant has been executed or analyzed.
          </p>
          <p>
            If a canary is triggered, it may indicate:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>The implant was executed in a sandbox environment</li>
            <li>An analyst is reverse engineering the implant</li>
            <li>Automated malware analysis has processed the implant</li>
          </ul>
          <p className="text-yellow-600 dark:text-yellow-400">
            Triggered canaries should be investigated immediately.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
