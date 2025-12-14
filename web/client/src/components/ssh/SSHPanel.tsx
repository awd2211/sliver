import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Terminal as TerminalIcon,
  Play,
  Loader2,
  Key,
  Lock,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Copy,
  History,
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import type { SSHAuthMethod, SSHCommandRequest } from '@/types';

interface SSHPanelProps {
  sessionId: string;
  isBeacon?: boolean;
}

interface SSHHistory {
  id: string;
  hostname: string;
  username: string;
  command: string;
  timestamp: string;
  success: boolean;
  output?: string;
}

export function SSHPanel({ sessionId, isBeacon = false }: SSHPanelProps) {
  // Connection state
  const [hostname, setHostname] = useState('');
  const [port, setPort] = useState('22');
  const [username, setUsername] = useState('');
  const [authMethod, setAuthMethod] = useState<SSHAuthMethod>('password');
  const [password, setPassword] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [command, setCommand] = useState('');

  // Kerberos state
  const [realm, setRealm] = useState('');
  const [krb5Conf, setKrb5Conf] = useState('');
  const [keytab, setKeytab] = useState<File | null>(null);

  // Output state
  const [output, setOutput] = useState<{ stdout: string; stderr: string; exitCode: number } | null>(null);
  const [history, setHistory] = useState<SSHHistory[]>([]);

  // Fetch credentials from loot
  const { data: credentialsData } = useQuery({
    queryKey: ['credentials'],
    queryFn: () => api.getCredentials(),
  });

  const credentials = credentialsData?.credentials ?? [];
  const sshCredentials = credentials.filter(c => c.username && (c.password || c.plaintext));

  // File to base64 helper
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  // SSH execution mutation
  const sshMutation = useMutation({
    mutationFn: async () => {
      const req: SSHCommandRequest = {
        hostname,
        port: parseInt(port),
        username,
        authMethod,
        command,
      };

      if (authMethod === 'password') {
        req.password = password;
      } else if (authMethod === 'key') {
        req.privateKey = privateKey;
        if (passphrase) {
          req.passphrase = passphrase;
        }
      } else if (authMethod === 'kerberos') {
        req.realm = realm;
        req.krb5Conf = krb5Conf;
        if (keytab) {
          req.keytab = await fileToBase64(keytab);
        }
      }

      if (isBeacon) {
        return api.beaconSshExecute(sessionId, req);
      }
      return api.sshExecute(sessionId, req);
    },
    onSuccess: (data) => {
      if ('task' in data) {
        // Beacon mode - task queued
        toast.success('SSH command queued for next beacon check-in');
        setOutput({ stdout: `Task ${data.task.id} queued`, stderr: '', exitCode: 0 });
      } else {
        // Session mode - immediate result
        setOutput(data);
        const newHistory: SSHHistory = {
          id: Date.now().toString(),
          hostname,
          username,
          command,
          timestamp: new Date().toISOString(),
          success: data.exitCode === 0,
          output: data.stdout || data.stderr,
        };
        setHistory(prev => [newHistory, ...prev].slice(0, 20));

        if (data.exitCode === 0) {
          toast.success('SSH command executed successfully');
        } else {
          toast.warning(`SSH command exited with code ${data.exitCode}`);
        }
      }
    },
    onError: (error: Error) => {
      toast.error(`SSH execution failed: ${error.message}`);
      setOutput({ stdout: '', stderr: error.message, exitCode: -1 });
    },
  });

  const handleKeyFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPrivateKey(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleCredentialSelect = (credId: string) => {
    const cred = credentials.find(c => c.id === credId);
    if (cred) {
      setUsername(cred.username);
      setPassword(cred.password || cred.plaintext || '');
      setAuthMethod('password');
      toast.success(`Loaded credentials for ${cred.username}`);
    }
  };

  const copyOutput = () => {
    if (output) {
      navigator.clipboard.writeText(output.stdout || output.stderr);
      toast.success('Output copied to clipboard');
    }
  };

  const isValid = hostname && username && command && (
    (authMethod === 'password' && password) ||
    (authMethod === 'key' && privateKey) ||
    (authMethod === 'kerberos' && realm)
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-4 border-b">
        <TerminalIcon className="h-5 w-5 text-yellow-500" />
        <div>
          <h2 className="text-lg font-semibold">SSH Command Execution</h2>
          <p className="text-sm text-muted-foreground">
            Execute commands on remote hosts via SSH through the implant
          </p>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Configuration Panel */}
        <div className="w-[400px] border-r flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {/* Connection Settings */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Connection</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Hostname</Label>
                      <Input
                        placeholder="192.168.1.100"
                        value={hostname}
                        onChange={(e) => setHostname(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Port</Label>
                      <Input
                        type="number"
                        value={port}
                        onChange={(e) => setPort(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Username</Label>
                    <Input
                      placeholder="root"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Authentication */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Authentication</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Tabs value={authMethod} onValueChange={(v) => setAuthMethod(v as SSHAuthMethod)}>
                    <TabsList className="w-full">
                      <TabsTrigger value="password" className="flex-1 gap-1">
                        <Lock className="h-3 w-3" />
                        Password
                      </TabsTrigger>
                      <TabsTrigger value="key" className="flex-1 gap-1">
                        <Key className="h-3 w-3" />
                        Key
                      </TabsTrigger>
                      <TabsTrigger value="kerberos" className="flex-1 gap-1">
                        <Shield className="h-3 w-3" />
                        Kerberos
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="password" className="space-y-3 mt-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Password</Label>
                        <Input
                          type="password"
                          placeholder="Enter password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </div>
                      {sshCredentials.length > 0 && (
                        <div className="space-y-1">
                          <Label className="text-xs">Or select from credentials</Label>
                          <Select onValueChange={handleCredentialSelect}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select credential" />
                            </SelectTrigger>
                            <SelectContent>
                              {sshCredentials.map((cred) => (
                                <SelectItem key={cred.id} value={cred.id}>
                                  {cred.username}@{cred.originHost || 'unknown'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="key" className="space-y-3 mt-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Private Key</Label>
                        <div className="flex gap-2">
                          <Input
                            type="file"
                            accept=".pem,.key,.ppk"
                            onChange={handleKeyFileUpload}
                            className="flex-1"
                          />
                        </div>
                        {privateKey && (
                          <p className="text-xs text-green-500">Key loaded ({privateKey.length} chars)</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Passphrase (optional)</Label>
                        <Input
                          type="password"
                          placeholder="Key passphrase"
                          value={passphrase}
                          onChange={(e) => setPassphrase(e.target.value)}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="kerberos" className="space-y-3 mt-3">
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2">
                        <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                          <AlertTriangle className="h-3 w-3" />
                          <span className="text-xs font-medium">Windows targets only</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Realm</Label>
                        <Input
                          placeholder="CORP.LOCAL"
                          value={realm}
                          onChange={(e) => setRealm(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">KRB5 Config (optional)</Label>
                        <Textarea
                          placeholder="[libdefaults]..."
                          value={krb5Conf}
                          onChange={(e) => setKrb5Conf(e.target.value)}
                          className="font-mono text-xs h-20"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Keytab (optional)</Label>
                        <Input
                          type="file"
                          accept=".keytab"
                          onChange={(e) => setKeytab(e.target.files?.[0] || null)}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Command */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Command</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    placeholder="whoami && hostname && id"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    className="font-mono min-h-[100px]"
                  />
                  <Button
                    onClick={() => sshMutation.mutate()}
                    disabled={!isValid || sshMutation.isPending}
                    className="w-full"
                  >
                    {sshMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Execute SSH Command
                  </Button>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </div>

        {/* Output Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs defaultValue="output" className="flex-1 flex flex-col">
            <div className="border-b px-4">
              <TabsList className="h-10">
                <TabsTrigger value="output" className="gap-2">
                  <TerminalIcon className="h-4 w-4" />
                  Output
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <History className="h-4 w-4" />
                  History
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="output" className="flex-1 m-0 overflow-hidden">
              <div className="h-full flex flex-col">
                {output && (
                  <div className="flex items-center justify-between p-2 border-b bg-muted/50">
                    <div className="flex items-center gap-2">
                      {output.exitCode === 0 ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">Exit code: {output.exitCode}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={copyOutput}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <ScrollArea className="flex-1 p-4">
                  {output ? (
                    <div className="space-y-4">
                      {output.stdout && (
                        <div>
                          <Label className="text-xs text-muted-foreground">STDOUT</Label>
                          <pre className="mt-1 text-sm font-mono whitespace-pre-wrap break-all bg-muted/50 p-3 rounded">
                            {output.stdout}
                          </pre>
                        </div>
                      )}
                      {output.stderr && (
                        <div>
                          <Label className="text-xs text-red-500">STDERR</Label>
                          <pre className="mt-1 text-sm font-mono whitespace-pre-wrap break-all bg-red-500/10 p-3 rounded text-red-600 dark:text-red-400">
                            {output.stderr}
                          </pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <div className="text-center">
                        <TerminalIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Execute a command to see output</p>
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value="history" className="flex-1 m-0 overflow-hidden">
              <ScrollArea className="h-full">
                {history.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground p-8">
                    <div className="text-center">
                      <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No command history yet</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 space-y-2">
                    {history.map((item) => (
                      <Card key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => {
                        setHostname(item.hostname);
                        setUsername(item.username);
                        setCommand(item.command);
                      }}>
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2 mb-1">
                            {item.success ? (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            ) : (
                              <XCircle className="h-3 w-3 text-red-500" />
                            )}
                            <span className="text-xs text-muted-foreground">
                              {item.username}@{item.hostname}
                            </span>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {new Date(item.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <pre className="text-sm font-mono truncate">{item.command}</pre>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
