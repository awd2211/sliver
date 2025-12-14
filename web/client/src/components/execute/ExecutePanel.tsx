import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Play,
  Code,
  Binary,
  ArrowRightLeft,
  FileCode,
  Loader2,
  Upload,
  AlertTriangle,
  Zap,
  Syringe,
  Box,
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

interface ExecutePanelProps {
  sessionId: string;
  os: string;
  arch: string;
}

export function ExecutePanel({ sessionId, os, arch }: ExecutePanelProps) {
  const isWindows = os.toLowerCase().includes('windows');

  // Execute Assembly state
  const [assemblyFile, setAssemblyFile] = useState<File | null>(null);
  const [assemblyArgs, setAssemblyArgs] = useState('');
  const [assemblyProcess, setAssemblyProcess] = useState('notepad.exe');
  const [assemblyIsDll, setAssemblyIsDll] = useState(false);
  const [assemblyClassName, setAssemblyClassName] = useState('');
  const [assemblyMethod, setAssemblyMethod] = useState('');

  // Shellcode state
  const [shellcodeFile, setShellcodeFile] = useState<File | null>(null);
  const [shellcodePid, setShellcodePid] = useState('');
  const [shellcodeRwx, setShellcodeRwx] = useState(false);
  const [shellcodeShikata, setShellcodeShikata] = useState(false);
  const [shellcodeIterations, setShellcodeIterations] = useState('1');
  const [shellcodeProcess, setShellcodeProcess] = useState('notepad.exe');

  // Migrate state
  const [migratePid, setMigratePid] = useState('');
  const [migrateName, setMigrateName] = useState('');

  // DLL state
  const [dllFile, setDllFile] = useState<File | null>(null);
  const [dllProcess, setDllProcess] = useState('notepad.exe');
  const [dllExport, setDllExport] = useState('DllMain');
  const [dllArgs, setDllArgs] = useState('');

  // Sideload state
  const [sideloadFile, setSideloadFile] = useState<File | null>(null);
  const [sideloadProcess, setSideloadProcess] = useState('');
  const [sideloadArgs, setSideloadArgs] = useState('');
  const [sideloadEntry, setSideloadEntry] = useState('');

  // MSF Stager state
  const [msfArch, setMsfArch] = useState(arch === 'amd64' ? 'x64' : 'x86');
  const [msfFormat, setMsfFormat] = useState('raw');
  const [msfHost, setMsfHost] = useState('');
  const [msfPort, setMsfPort] = useState('4444');
  const [msfProtocol, setMsfProtocol] = useState('tcp');
  const [msfBadChars, setMsfBadChars] = useState('');
  const [msfInjectPid, setMsfInjectPid] = useState('');

  // WASM state
  const [wasmFile, setWasmFile] = useState<File | null>(null);
  const [wasmFuncName, setWasmFuncName] = useState('_start');
  const [wasmArgs, setWasmArgs] = useState('');

  // Output state
  const [output, setOutput] = useState<string>('');

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

  // Execute Assembly mutation
  const assemblyMutation = useMutation({
    mutationFn: async () => {
      if (!assemblyFile) throw new Error('No assembly file selected');
      const assembly = await fileToBase64(assemblyFile);
      return api.executeAssembly(sessionId, {
        assembly,
        assemblyArgs,
        process: assemblyProcess,
        isDLL: assemblyIsDll,
        arch,
        className: assemblyClassName || undefined,
        method: assemblyMethod || undefined,
      });
    },
    onSuccess: (data) => {
      setOutput(data.output || 'Assembly executed successfully (no output)');
      toast.success('Assembly executed');
    },
    onError: (error: Error) => {
      setOutput(`Error: ${error.message}`);
      toast.error(`Execution failed: ${error.message}`);
    },
  });

  // Execute Shellcode mutation
  const shellcodeMutation = useMutation({
    mutationFn: async () => {
      if (!shellcodeFile) throw new Error('No shellcode file selected');
      const data = await fileToBase64(shellcodeFile);
      return api.executeShellcode(sessionId, {
        data,
        pid: shellcodePid ? parseInt(shellcodePid) : undefined,
        rwxPages: shellcodeRwx,
        shikata: shellcodeShikata,
        iterations: shellcodeShikata ? parseInt(shellcodeIterations) : undefined,
        process: shellcodeProcess || undefined,
      });
    },
    onSuccess: () => {
      setOutput('Shellcode executed successfully');
      toast.success('Shellcode executed');
    },
    onError: (error: Error) => {
      setOutput(`Error: ${error.message}`);
      toast.error(`Execution failed: ${error.message}`);
    },
  });

  // Migrate mutation
  const migrateMutation = useMutation({
    mutationFn: async () => {
      if (!migratePid) throw new Error('No target PID specified');
      return api.migrate(sessionId, {
        pid: parseInt(migratePid),
        name: migrateName || undefined,
      });
    },
    onSuccess: (data) => {
      if (data.newSessionId) {
        setOutput(`Migration successful! New session: ${data.newSessionId}`);
      } else {
        setOutput('Migration completed');
      }
      toast.success('Migration successful');
    },
    onError: (error: Error) => {
      setOutput(`Error: ${error.message}`);
      toast.error(`Migration failed: ${error.message}`);
    },
  });

  // SpawnDLL mutation
  const spawnDllMutation = useMutation({
    mutationFn: async () => {
      if (!dllFile) throw new Error('No DLL file selected');
      const data = await fileToBase64(dllFile);
      return api.spawnDll(sessionId, {
        data,
        processName: dllProcess,
        exportName: dllExport,
        args: dllArgs,
      });
    },
    onSuccess: (data) => {
      setOutput(data.output || 'DLL spawned successfully');
      toast.success('DLL spawned');
    },
    onError: (error: Error) => {
      setOutput(`Error: ${error.message}`);
      toast.error(`SpawnDLL failed: ${error.message}`);
    },
  });

  // Sideload mutation
  const sideloadMutation = useMutation({
    mutationFn: async () => {
      if (!sideloadFile) throw new Error('No file selected');
      const data = await fileToBase64(sideloadFile);
      return api.sideload(sessionId, {
        data,
        processName: sideloadProcess,
        args: sideloadArgs,
        entryPoint: sideloadEntry,
      });
    },
    onSuccess: (data) => {
      setOutput(data.output || 'Sideload successful');
      toast.success('Sideload completed');
    },
    onError: (error: Error) => {
      setOutput(`Error: ${error.message}`);
      toast.error(`Sideload failed: ${error.message}`);
    },
  });

  // MSF Stager mutation (generate and execute)
  const msfStagerMutation = useMutation({
    mutationFn: async () => {
      const badChars = msfBadChars.trim()
        ? msfBadChars.split(',').map(c => c.trim()).filter(c => c)
        : undefined;
      return api.msfStager(sessionId, {
        arch: msfArch,
        format: msfFormat,
        host: msfHost,
        port: parseInt(msfPort),
        protocol: msfProtocol,
        badChars,
      });
    },
    onSuccess: (data) => {
      setOutput(`MSF Stager generated and executed successfully.\nStager data size: ${data.data?.length || 0} bytes`);
      toast.success('MSF Stager executed');
    },
    onError: (error: Error) => {
      setOutput(`Error: ${error.message}`);
      toast.error(`MSF Stager failed: ${error.message}`);
    },
  });

  // MSF Inject mutation (inject into existing process)
  const msfInjectMutation = useMutation({
    mutationFn: async () => {
      if (!msfInjectPid) throw new Error('No target PID specified');
      const badChars = msfBadChars.trim()
        ? msfBadChars.split(',').map(c => c.trim()).filter(c => c)
        : undefined;
      return api.msfInject(sessionId, parseInt(msfInjectPid), {
        arch: msfArch,
        format: msfFormat,
        host: msfHost,
        port: parseInt(msfPort),
        protocol: msfProtocol,
        badChars,
      });
    },
    onSuccess: () => {
      setOutput(`MSF Stager injected successfully into PID ${msfInjectPid}`);
      toast.success('MSF Stager injected');
    },
    onError: (error: Error) => {
      setOutput(`Error: ${error.message}`);
      toast.error(`MSF Inject failed: ${error.message}`);
    },
  });

  // WASM execution mutation
  const wasmMutation = useMutation({
    mutationFn: async () => {
      if (!wasmFile) throw new Error('No WASM file selected');
      const data = await fileToBase64(wasmFile);
      const args = wasmArgs.trim() ? wasmArgs.split(' ').filter(a => a) : undefined;
      return api.executeWasm(sessionId, {
        data,
        funcName: wasmFuncName,
        args,
      });
    },
    onSuccess: (data) => {
      let result = '';
      if (data.stdout) result += `stdout:\n${data.stdout}\n`;
      if (data.stderr) result += `stderr:\n${data.stderr}\n`;
      result += `Exit code: ${data.exitCode}`;
      setOutput(result || 'WASM executed successfully');
      toast.success('WASM executed');
    },
    onError: (error: Error) => {
      setOutput(`Error: ${error.message}`);
      toast.error(`WASM execution failed: ${error.message}`);
    },
  });

  const isLoading = assemblyMutation.isPending || shellcodeMutation.isPending ||
    migrateMutation.isPending || spawnDllMutation.isPending || sideloadMutation.isPending ||
    msfStagerMutation.isPending || msfInjectMutation.isPending || wasmMutation.isPending;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-4 border-b">
        <Code className="h-5 w-5 text-yellow-500" />
        <div>
          <h2 className="text-lg font-semibold">Code Execution</h2>
          <p className="text-sm text-muted-foreground">
            Execute assemblies, shellcode, and perform process migration
          </p>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs defaultValue="assembly" className="flex-1 flex flex-col">
            <div className="border-b px-4">
              <TabsList className="h-10">
                {isWindows && (
                  <TabsTrigger value="assembly" className="gap-2">
                    <FileCode className="h-4 w-4" />
                    Assembly
                  </TabsTrigger>
                )}
                <TabsTrigger value="shellcode" className="gap-2">
                  <Binary className="h-4 w-4" />
                  Shellcode
                </TabsTrigger>
                <TabsTrigger value="migrate" className="gap-2">
                  <ArrowRightLeft className="h-4 w-4" />
                  Migrate
                </TabsTrigger>
                {isWindows && (
                  <>
                    <TabsTrigger value="spawndll" className="gap-2">
                      <FileCode className="h-4 w-4" />
                      SpawnDLL
                    </TabsTrigger>
                    <TabsTrigger value="sideload" className="gap-2">
                      <Upload className="h-4 w-4" />
                      Sideload
                    </TabsTrigger>
                  </>
                )}
                <TabsTrigger value="msfstager" className="gap-2">
                  <Zap className="h-4 w-4" />
                  MSF Stager
                </TabsTrigger>
                <TabsTrigger value="wasm" className="gap-2">
                  <Box className="h-4 w-4" />
                  WASM
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Execute Assembly Tab */}
            {isWindows && (
              <TabsContent value="assembly" className="flex-1 m-0 p-4 overflow-auto">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Execute .NET Assembly</CardTitle>
                    <CardDescription>
                      Load and execute a .NET assembly in memory
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Assembly File (.exe or .dll)</Label>
                      <Input
                        type="file"
                        accept=".exe,.dll"
                        onChange={(e) => setAssemblyFile(e.target.files?.[0] || null)}
                      />
                      {assemblyFile && (
                        <p className="text-xs text-muted-foreground">
                          Selected: {assemblyFile.name} ({(assemblyFile.size / 1024).toFixed(1)} KB)
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Arguments</Label>
                      <Input
                        placeholder="arg1 arg2 arg3"
                        value={assemblyArgs}
                        onChange={(e) => setAssemblyArgs(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Host Process</Label>
                      <Input
                        placeholder="notepad.exe"
                        value={assemblyProcess}
                        onChange={(e) => setAssemblyProcess(e.target.value)}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isDll"
                        checked={assemblyIsDll}
                        onCheckedChange={setAssemblyIsDll}
                      />
                      <Label htmlFor="isDll">Is DLL Assembly</Label>
                    </div>

                    {assemblyIsDll && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Class Name</Label>
                          <Input
                            placeholder="Namespace.ClassName"
                            value={assemblyClassName}
                            onChange={(e) => setAssemblyClassName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Method Name</Label>
                          <Input
                            placeholder="MethodName"
                            value={assemblyMethod}
                            onChange={(e) => setAssemblyMethod(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={() => assemblyMutation.mutate()}
                      disabled={!assemblyFile || assemblyMutation.isPending}
                      className="w-full"
                    >
                      {assemblyMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      Execute Assembly
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Shellcode Tab */}
            <TabsContent value="shellcode" className="flex-1 m-0 p-4 overflow-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Execute Shellcode</CardTitle>
                  <CardDescription>
                    Inject and execute raw shellcode
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Shellcode File (.bin)</Label>
                    <Input
                      type="file"
                      accept=".bin,.raw,.shellcode"
                      onChange={(e) => setShellcodeFile(e.target.files?.[0] || null)}
                    />
                    {shellcodeFile && (
                      <p className="text-xs text-muted-foreground">
                        Selected: {shellcodeFile.name} ({shellcodeFile.size} bytes)
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Target PID (optional)</Label>
                      <Input
                        type="number"
                        placeholder="Inject into existing process"
                        value={shellcodePid}
                        onChange={(e) => setShellcodePid(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Spawn Process (if no PID)</Label>
                      <Input
                        placeholder="notepad.exe"
                        value={shellcodeProcess}
                        onChange={(e) => setShellcodeProcess(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="rwx"
                        checked={shellcodeRwx}
                        onCheckedChange={setShellcodeRwx}
                      />
                      <Label htmlFor="rwx">RWX Pages</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="shikata"
                        checked={shellcodeShikata}
                        onCheckedChange={setShellcodeShikata}
                      />
                      <Label htmlFor="shikata">Shikata Ga Nai Encoding</Label>
                    </div>
                  </div>

                  {shellcodeShikata && (
                    <div className="space-y-2">
                      <Label>Encoding Iterations</Label>
                      <Input
                        type="number"
                        min="1"
                        value={shellcodeIterations}
                        onChange={(e) => setShellcodeIterations(e.target.value)}
                      />
                    </div>
                  )}

                  <Button
                    onClick={() => shellcodeMutation.mutate()}
                    disabled={!shellcodeFile || shellcodeMutation.isPending}
                    className="w-full"
                  >
                    {shellcodeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Execute Shellcode
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Migrate Tab */}
            <TabsContent value="migrate" className="flex-1 m-0 p-4 overflow-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Process Migration</CardTitle>
                  <CardDescription>
                    Migrate the implant to another process
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">Warning</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Migration will create a new session. The current session may become inactive.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Target Process ID</Label>
                    <Input
                      type="number"
                      placeholder="Enter PID to migrate into"
                      value={migratePid}
                      onChange={(e) => setMigratePid(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Process Name (optional, for spawn)</Label>
                    <Input
                      placeholder="Leave empty to inject into existing PID"
                      value={migrateName}
                      onChange={(e) => setMigrateName(e.target.value)}
                    />
                  </div>

                  <Button
                    onClick={() => migrateMutation.mutate()}
                    disabled={!migratePid || migrateMutation.isPending}
                    className="w-full"
                    variant="destructive"
                  >
                    {migrateMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ArrowRightLeft className="h-4 w-4 mr-2" />
                    )}
                    Migrate Process
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* SpawnDLL Tab */}
            {isWindows && (
              <TabsContent value="spawndll" className="flex-1 m-0 p-4 overflow-auto">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Spawn DLL</CardTitle>
                    <CardDescription>
                      Spawn a sacrificial process and inject a reflective DLL
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>DLL File</Label>
                      <Input
                        type="file"
                        accept=".dll"
                        onChange={(e) => setDllFile(e.target.files?.[0] || null)}
                      />
                      {dllFile && (
                        <p className="text-xs text-muted-foreground">
                          Selected: {dllFile.name} ({(dllFile.size / 1024).toFixed(1)} KB)
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Host Process</Label>
                        <Input
                          placeholder="notepad.exe"
                          value={dllProcess}
                          onChange={(e) => setDllProcess(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Export Function</Label>
                        <Input
                          placeholder="DllMain"
                          value={dllExport}
                          onChange={(e) => setDllExport(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Arguments</Label>
                      <Input
                        placeholder="Arguments to pass to DLL"
                        value={dllArgs}
                        onChange={(e) => setDllArgs(e.target.value)}
                      />
                    </div>

                    <Button
                      onClick={() => spawnDllMutation.mutate()}
                      disabled={!dllFile || spawnDllMutation.isPending}
                      className="w-full"
                    >
                      {spawnDllMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      Spawn DLL
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Sideload Tab */}
            {isWindows && (
              <TabsContent value="sideload" className="flex-1 m-0 p-4 overflow-auto">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Sideload</CardTitle>
                    <CardDescription>
                      Load a shared library (DLL/SO) into a sacrificial process
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Library File (.dll / .so)</Label>
                      <Input
                        type="file"
                        accept=".dll,.so"
                        onChange={(e) => setSideloadFile(e.target.files?.[0] || null)}
                      />
                      {sideloadFile && (
                        <p className="text-xs text-muted-foreground">
                          Selected: {sideloadFile.name} ({(sideloadFile.size / 1024).toFixed(1)} KB)
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Host Process</Label>
                        <Input
                          placeholder="notepad.exe"
                          value={sideloadProcess}
                          onChange={(e) => setSideloadProcess(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Entry Point</Label>
                        <Input
                          placeholder="Function name"
                          value={sideloadEntry}
                          onChange={(e) => setSideloadEntry(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Arguments</Label>
                      <Input
                        placeholder="Arguments"
                        value={sideloadArgs}
                        onChange={(e) => setSideloadArgs(e.target.value)}
                      />
                    </div>

                    <Button
                      onClick={() => sideloadMutation.mutate()}
                      disabled={!sideloadFile || sideloadMutation.isPending}
                      className="w-full"
                    >
                      {sideloadMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Sideload
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* MSF Stager Tab */}
            <TabsContent value="msfstager" className="flex-1 m-0 p-4 overflow-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Metasploit Stager</CardTitle>
                  <CardDescription>
                    Generate and execute a Metasploit stager to connect back to your handler
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">Setup Required</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Ensure you have a Metasploit handler running: use exploit/multi/handler
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Architecture</Label>
                      <Select value={msfArch} onValueChange={setMsfArch}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="x64">x64 (64-bit)</SelectItem>
                          <SelectItem value="x86">x86 (32-bit)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Protocol</Label>
                      <Select value={msfProtocol} onValueChange={setMsfProtocol}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tcp">TCP</SelectItem>
                          <SelectItem value="http">HTTP</SelectItem>
                          <SelectItem value="https">HTTPS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Handler Host</Label>
                      <Input
                        placeholder="192.168.1.100"
                        value={msfHost}
                        onChange={(e) => setMsfHost(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Handler Port</Label>
                      <Input
                        type="number"
                        placeholder="4444"
                        value={msfPort}
                        onChange={(e) => setMsfPort(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Format</Label>
                      <Select value={msfFormat} onValueChange={setMsfFormat}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="raw">Raw Shellcode</SelectItem>
                          <SelectItem value="exe">EXE</SelectItem>
                          <SelectItem value="dll">DLL</SelectItem>
                          <SelectItem value="psh">PowerShell</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Bad Characters (optional)</Label>
                      <Input
                        placeholder="\x00, \x0a, \x0d"
                        value={msfBadChars}
                        onChange={(e) => setMsfBadChars(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Inject into PID (optional)</Label>
                    <Input
                      type="number"
                      placeholder="Leave empty to execute directly, or enter PID to inject"
                      value={msfInjectPid}
                      onChange={(e) => setMsfInjectPid(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => msfStagerMutation.mutate()}
                      disabled={!msfHost || !msfPort || msfStagerMutation.isPending || msfInjectMutation.isPending}
                      className="flex-1"
                    >
                      {msfStagerMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Zap className="h-4 w-4 mr-2" />
                      )}
                      Execute Stager
                    </Button>
                    <Button
                      onClick={() => msfInjectMutation.mutate()}
                      disabled={!msfHost || !msfPort || !msfInjectPid || msfStagerMutation.isPending || msfInjectMutation.isPending}
                      variant="secondary"
                      className="flex-1"
                    >
                      {msfInjectMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Syringe className="h-4 w-4 mr-2" />
                      )}
                      Inject into PID
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* WASM Tab */}
            <TabsContent value="wasm" className="flex-1 m-0 p-4 overflow-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Execute WebAssembly</CardTitle>
                  <CardDescription>
                    Execute a WASM module on the target system
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>WASM File (.wasm)</Label>
                    <Input
                      type="file"
                      accept=".wasm"
                      onChange={(e) => setWasmFile(e.target.files?.[0] || null)}
                    />
                    {wasmFile && (
                      <p className="text-xs text-muted-foreground">
                        Selected: {wasmFile.name} ({(wasmFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Function Name</Label>
                    <Input
                      placeholder="_start"
                      value={wasmFuncName}
                      onChange={(e) => setWasmFuncName(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Entry function to execute (default: _start)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Arguments (optional)</Label>
                    <Input
                      placeholder="arg1 arg2 arg3"
                      value={wasmArgs}
                      onChange={(e) => setWasmArgs(e.target.value)}
                    />
                  </div>

                  <Button
                    onClick={() => wasmMutation.mutate()}
                    disabled={!wasmFile || wasmMutation.isPending}
                    className="w-full"
                  >
                    {wasmMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Execute WASM
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Output Panel */}
        <div className="w-96 border-l flex flex-col">
          <div className="p-3 border-b bg-muted/50 flex items-center justify-between">
            <h4 className="text-sm font-medium">Output</h4>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
          <ScrollArea className="flex-1 p-4">
            {output ? (
              <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                {output}
              </pre>
            ) : (
              <div className="text-center text-muted-foreground text-sm py-8">
                Output will appear here
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
