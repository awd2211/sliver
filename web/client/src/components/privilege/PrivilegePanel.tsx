import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Loader2,
  Crown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  UserCog,
  Key,
  RotateCcw,
  User,
  Info,
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import type { PrivilegeInfo, GetSystemResult } from '@/types';

interface PrivilegePanelProps {
  sessionId: string;
  os: string;
}

export function PrivilegePanel({ sessionId, os }: PrivilegePanelProps) {
  const [getSystemDialogOpen, setGetSystemDialogOpen] = useState(false);
  const [getSystemResult, setGetSystemResult] = useState<GetSystemResult | null>(null);
  const [runAsDialogOpen, setRunAsDialogOpen] = useState(false);
  const [makeTokenDialogOpen, setMakeTokenDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // RunAs form state
  const [runAsUsername, setRunAsUsername] = useState('');
  const [runAsDomain, setRunAsDomain] = useState('');
  const [runAsPassword, setRunAsPassword] = useState('');
  const [runAsProgram, setRunAsProgram] = useState('cmd.exe');
  const [runAsArgs, setRunAsArgs] = useState('');

  // MakeToken form state
  const [tokenUsername, setTokenUsername] = useState('');
  const [tokenDomain, setTokenDomain] = useState('');
  const [tokenPassword, setTokenPassword] = useState('');
  const [tokenLogonType, setTokenLogonType] = useState('9'); // LOGON32_LOGON_NEW_CREDENTIALS

  const isWindows = os.toLowerCase().includes('windows');

  const { data: privsData, isLoading: privsLoading, refetch: refetchPrivs, isFetching: privsFetching } = useQuery({
    queryKey: ['privileges', sessionId],
    queryFn: () => api.getPrivileges(sessionId),
    enabled: !!sessionId && isWindows,
  });

  const { data: tokenData, refetch: refetchToken, isFetching: tokenFetching } = useQuery({
    queryKey: ['token-info', sessionId],
    queryFn: () => api.getTokenInfo(sessionId),
    enabled: !!sessionId && isWindows,
  });

  const getSystemMutation = useMutation({
    mutationFn: () => api.getSystem(sessionId),
    onSuccess: (result) => {
      setGetSystemResult(result);
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['token-info', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['privileges', sessionId] });
    },
    onError: () => {
      setGetSystemResult({
        success: false,
        output: 'Failed to execute GetSystem',
      });
    },
  });

  const impersonateMutation = useMutation({
    mutationFn: (process: string) => api.impersonate(sessionId, process),
    onSuccess: () => {
      toast.success('Successfully impersonated user');
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['privileges', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['token-info', sessionId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Impersonation failed');
    },
  });

  const runAsMutation = useMutation({
    mutationFn: () => api.runAs(sessionId, {
      username: runAsUsername,
      domain: runAsDomain || undefined,
      password: runAsPassword,
      program: runAsProgram,
      args: runAsArgs ? runAsArgs.split(' ') : undefined,
    }),
    onSuccess: (result) => {
      toast.success(`Process started with PID: ${result.pid}`);
      setRunAsDialogOpen(false);
      resetRunAsForm();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'RunAs failed');
    },
  });

  const makeTokenMutation = useMutation({
    mutationFn: () => api.makeToken(sessionId, {
      username: tokenUsername,
      domain: tokenDomain || undefined,
      password: tokenPassword,
      logonType: parseInt(tokenLogonType),
    }),
    onSuccess: () => {
      toast.success('Token created successfully');
      setMakeTokenDialogOpen(false);
      resetMakeTokenForm();
      queryClient.invalidateQueries({ queryKey: ['token-info', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['privileges', sessionId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'MakeToken failed');
    },
  });

  const rev2selfMutation = useMutation({
    mutationFn: () => api.rev2self(sessionId),
    onSuccess: () => {
      toast.success('Reverted to original token');
      queryClient.invalidateQueries({ queryKey: ['token-info', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['privileges', sessionId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Rev2Self failed');
    },
  });

  const resetRunAsForm = () => {
    setRunAsUsername('');
    setRunAsDomain('');
    setRunAsPassword('');
    setRunAsProgram('cmd.exe');
    setRunAsArgs('');
  };

  const resetMakeTokenForm = () => {
    setTokenUsername('');
    setTokenDomain('');
    setTokenPassword('');
    setTokenLogonType('9');
  };

  const handleGetSystem = () => {
    setGetSystemResult(null);
    setGetSystemDialogOpen(true);
    getSystemMutation.mutate();
  };

  const privileges = privsData?.privileges ?? [];
  const tokenInfo = tokenData?.token;

  return (
    <div className="space-y-4">
      {/* Windows-specific privilege escalation */}
      {isWindows && (
        <Tabs defaultValue="escalation" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="escalation">Escalation</TabsTrigger>
            <TabsTrigger value="token">Token Management</TabsTrigger>
            <TabsTrigger value="privileges">Privileges</TabsTrigger>
          </TabsList>

          {/* Escalation Tab */}
          <TabsContent value="escalation" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-500" />
                  Privilege Escalation
                </CardTitle>
                <CardDescription>
                  Attempt to escalate privileges on Windows systems
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button
                    variant="outline"
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    onClick={handleGetSystem}
                    disabled={getSystemMutation.isPending}
                  >
                    {getSystemMutation.isPending ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <ShieldAlert className="h-6 w-6 text-red-500" />
                    )}
                    <div className="text-center">
                      <div className="font-medium">GetSystem</div>
                      <div className="text-xs text-muted-foreground">Elevate to SYSTEM</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    onClick={() => impersonateMutation.mutate('explorer.exe')}
                    disabled={impersonateMutation.isPending}
                  >
                    {impersonateMutation.isPending ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <User className="h-6 w-6 text-blue-500" />
                    )}
                    <div className="text-center">
                      <div className="font-medium">Impersonate</div>
                      <div className="text-xs text-muted-foreground">Steal user token</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    onClick={() => setRunAsDialogOpen(true)}
                  >
                    <UserCog className="h-6 w-6 text-purple-500" />
                    <div className="text-center">
                      <div className="font-medium">RunAs</div>
                      <div className="text-xs text-muted-foreground">Run as another user</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto py-4 flex flex-col items-center gap-2"
                    onClick={() => setMakeTokenDialogOpen(true)}
                  >
                    <Key className="h-6 w-6 text-green-500" />
                    <div className="text-center">
                      <div className="font-medium">MakeToken</div>
                      <div className="text-xs text-muted-foreground">Create logon token</div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Token Management Tab */}
          <TabsContent value="token" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Key className="h-5 w-5 text-yellow-500" />
                      Current Token
                    </CardTitle>
                    <CardDescription>
                      Information about the current process token
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchToken()}
                      disabled={tokenFetching}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${tokenFetching ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => rev2selfMutation.mutate()}
                      disabled={rev2selfMutation.isPending}
                    >
                      {rev2selfMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4 mr-2" />
                      )}
                      Rev2Self
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {tokenInfo ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Username</Label>
                      <p className="font-mono text-sm">{tokenInfo.domain}\\{tokenInfo.username}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">SID</Label>
                      <p className="font-mono text-xs truncate">{tokenInfo.sid}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Elevated</Label>
                      <Badge variant={tokenInfo.isElevated ? 'default' : 'secondary'} className={tokenInfo.isElevated ? 'bg-green-500' : ''}>
                        {tokenInfo.isElevated ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Integrity Level</Label>
                      <Badge variant="outline">{tokenInfo.integrityLevel}</Badge>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Token information not available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Token Operations</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li><strong>Rev2Self</strong> - Revert to the original process token</li>
                  <li><strong>MakeToken</strong> - Create a new logon session with provided credentials</li>
                  <li><strong>Impersonate</strong> - Steal a token from another process</li>
                </ul>
              </AlertDescription>
            </Alert>
          </TabsContent>

          {/* Privileges Tab */}
          <TabsContent value="privileges" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5" />
                      Current Privileges
                    </CardTitle>
                    <CardDescription>
                      Token privileges for the current process
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => refetchPrivs()}
                    disabled={privsFetching}
                    className="h-8 w-8"
                  >
                    <RefreshCw className={`h-4 w-4 ${privsFetching ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {privsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : privileges.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No privilege information available</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Privilege</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="w-[80px]">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {privileges.map((priv: PrivilegeInfo, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono text-xs">
                              {priv.name}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {priv.description}
                            </TableCell>
                            <TableCell>
                              {priv.enabled ? (
                                <Badge variant="default" className="bg-green-500">
                                  Enabled
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  Disabled
                                </Badge>
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
          </TabsContent>
        </Tabs>
      )}

      {/* Non-Windows notice */}
      {!isWindows && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Linux/macOS System</AlertTitle>
          <AlertDescription>
            Privilege escalation features are primarily designed for Windows systems.
            On Linux/macOS, consider using local privilege escalation exploits or sudo misconfigurations.
          </AlertDescription>
        </Alert>
      )}

      {/* GetSystem Result Dialog */}
      <Dialog open={getSystemDialogOpen} onOpenChange={setGetSystemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getSystemMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Running GetSystem...
                </>
              ) : getSystemResult?.success ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  GetSystem Successful
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-destructive" />
                  GetSystem Failed
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {getSystemMutation.isPending
                ? 'Attempting to escalate privileges to SYSTEM...'
                : getSystemResult?.success
                ? 'Successfully escalated to SYSTEM privileges'
                : 'Failed to escalate privileges'}
            </DialogDescription>
          </DialogHeader>
          {getSystemResult && (
            <div className="bg-muted p-4 rounded-lg">
              <pre className="text-sm font-mono whitespace-pre-wrap">
                {getSystemResult.output || 'No output'}
              </pre>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setGetSystemDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RunAs Dialog */}
      <Dialog open={runAsDialogOpen} onOpenChange={setRunAsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Run As Another User
            </DialogTitle>
            <DialogDescription>
              Execute a program with different user credentials
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="runas-username">Username *</Label>
                <Input
                  id="runas-username"
                  value={runAsUsername}
                  onChange={(e) => setRunAsUsername(e.target.value)}
                  placeholder="Administrator"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="runas-domain">Domain</Label>
                <Input
                  id="runas-domain"
                  value={runAsDomain}
                  onChange={(e) => setRunAsDomain(e.target.value)}
                  placeholder="WORKGROUP"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="runas-password">Password *</Label>
              <Input
                id="runas-password"
                type="password"
                value={runAsPassword}
                onChange={(e) => setRunAsPassword(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="runas-program">Program *</Label>
              <Input
                id="runas-program"
                value={runAsProgram}
                onChange={(e) => setRunAsProgram(e.target.value)}
                placeholder="cmd.exe"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="runas-args">Arguments</Label>
              <Input
                id="runas-args"
                value={runAsArgs}
                onChange={(e) => setRunAsArgs(e.target.value)}
                placeholder="/c whoami"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRunAsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => runAsMutation.mutate()}
              disabled={!runAsUsername || !runAsPassword || !runAsProgram || runAsMutation.isPending}
            >
              {runAsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Execute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MakeToken Dialog */}
      <Dialog open={makeTokenDialogOpen} onOpenChange={setMakeTokenDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Create Logon Token
            </DialogTitle>
            <DialogDescription>
              Create a new logon session with provided credentials
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="token-username">Username *</Label>
                <Input
                  id="token-username"
                  value={tokenUsername}
                  onChange={(e) => setTokenUsername(e.target.value)}
                  placeholder="Administrator"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="token-domain">Domain</Label>
                <Input
                  id="token-domain"
                  value={tokenDomain}
                  onChange={(e) => setTokenDomain(e.target.value)}
                  placeholder="WORKGROUP"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="token-password">Password *</Label>
              <Input
                id="token-password"
                type="password"
                value={tokenPassword}
                onChange={(e) => setTokenPassword(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="token-logon-type">Logon Type</Label>
              <Select value={tokenLogonType} onValueChange={setTokenLogonType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">Interactive (2)</SelectItem>
                  <SelectItem value="3">Network (3)</SelectItem>
                  <SelectItem value="4">Batch (4)</SelectItem>
                  <SelectItem value="5">Service (5)</SelectItem>
                  <SelectItem value="9">New Credentials (9) - Recommended</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                New Credentials (9) is typically used for network access without impacting local session
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMakeTokenDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => makeTokenMutation.mutate()}
              disabled={!tokenUsername || !tokenPassword || makeTokenMutation.isPending}
            >
              {makeTokenMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
