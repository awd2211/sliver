import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  Copy,
  MoveHorizontal,
  Search,
  FileText,
  Loader2,
  Clock,
  Shield,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { GrepMatch } from '@/types';

interface FileOperationsDialogProps {
  sessionId: string;
  currentPath: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FileOperationsDialog({
  sessionId,
  currentPath,
  open,
  onOpenChange,
}: FileOperationsDialogProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('move');

  // Move/Copy state
  const [moveSrc, setMoveSrc] = useState('');
  const [moveDst, setMoveDst] = useState('');

  // Grep state
  const [grepPath, setGrepPath] = useState(currentPath);
  const [grepPattern, setGrepPattern] = useState('');
  const [grepRecursive, setGrepRecursive] = useState(false);
  const [grepInsensitive, setGrepInsensitive] = useState(false);
  const [grepResults, setGrepResults] = useState<GrepMatch[]>([]);

  // Head/Tail state
  const [headTailPath, setHeadTailPath] = useState('');
  const [headTailLines, setHeadTailLines] = useState(10);
  const [headTailResult, setHeadTailResult] = useState('');

  // Chmod state
  const [chmodPath, setChmodPath] = useState('');
  const [chmodMode, setChmodMode] = useState('644');
  const [chmodRecursive, setChmodRecursive] = useState(false);

  // Chown state
  const [chownPath, setChownPath] = useState('');
  const [chownUid, setChownUid] = useState('');
  const [chownGid, setChownGid] = useState('');
  const [chownRecursive, setChownRecursive] = useState(false);

  // Chtimes state
  const [chtimesPath, setChtimesPath] = useState('');
  const [chtimesAtime, setChtimesAtime] = useState('');
  const [chtimesMtime, setChtimesMtime] = useState('');

  const moveMutation = useMutation({
    mutationFn: () => api.moveFile(sessionId, { src: moveSrc, dst: moveDst }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', sessionId] });
      toast.success('File moved successfully');
      setMoveSrc('');
      setMoveDst('');
    },
    onError: (err: Error) => {
      toast.error(`Move failed: ${err.message}`);
    },
  });

  const copyMutation = useMutation({
    mutationFn: () => api.copyFile(sessionId, { src: moveSrc, dst: moveDst }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', sessionId] });
      toast.success('File copied successfully');
      setMoveSrc('');
      setMoveDst('');
    },
    onError: (err: Error) => {
      toast.error(`Copy failed: ${err.message}`);
    },
  });

  const grepMutation = useMutation({
    mutationFn: () =>
      api.grepFile(sessionId, {
        path: grepPath,
        pattern: grepPattern,
        recursive: grepRecursive,
        insensitive: grepInsensitive,
      }),
    onSuccess: (data) => {
      setGrepResults(data.matches || []);
      toast.success(`Found ${data.matches?.length || 0} matches`);
    },
    onError: (err: Error) => {
      toast.error(`Grep failed: ${err.message}`);
    },
  });

  const headMutation = useMutation({
    mutationFn: () =>
      api.headFile(sessionId, { path: headTailPath, lines: headTailLines }),
    onSuccess: (data) => {
      setHeadTailResult(data.data);
    },
    onError: (err: Error) => {
      toast.error(`Head failed: ${err.message}`);
    },
  });

  const tailMutation = useMutation({
    mutationFn: () =>
      api.tailFile(sessionId, { path: headTailPath, lines: headTailLines }),
    onSuccess: (data) => {
      setHeadTailResult(data.data);
    },
    onError: (err: Error) => {
      toast.error(`Tail failed: ${err.message}`);
    },
  });

  const chmodMutation = useMutation({
    mutationFn: () =>
      api.chmod(sessionId, { path: chmodPath, mode: chmodMode, recursive: chmodRecursive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', sessionId] });
      toast.success('Permissions changed successfully');
    },
    onError: (err: Error) => {
      toast.error(`Chmod failed: ${err.message}`);
    },
  });

  const chownMutation = useMutation({
    mutationFn: () =>
      api.chown(sessionId, {
        path: chownPath,
        uid: chownUid,
        gid: chownGid,
        recursive: chownRecursive,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', sessionId] });
      toast.success('Ownership changed successfully');
    },
    onError: (err: Error) => {
      toast.error(`Chown failed: ${err.message}`);
    },
  });

  const chtimesMutation = useMutation({
    mutationFn: () =>
      api.chtimes(sessionId, {
        path: chtimesPath,
        atime: new Date(chtimesAtime).toISOString(),
        mtime: new Date(chtimesMtime).toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', sessionId] });
      toast.success('Timestamps changed successfully');
    },
    onError: (err: Error) => {
      toast.error(`Chtimes failed: ${err.message}`);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>File Operations</DialogTitle>
          <DialogDescription>
            Extended file operations for the current session
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-6">
            <TabsTrigger value="move">
              <MoveHorizontal className="h-4 w-4 mr-1" />
              Move/Copy
            </TabsTrigger>
            <TabsTrigger value="grep">
              <Search className="h-4 w-4 mr-1" />
              Grep
            </TabsTrigger>
            <TabsTrigger value="headtail">
              <FileText className="h-4 w-4 mr-1" />
              Head/Tail
            </TabsTrigger>
            <TabsTrigger value="chmod">
              <Shield className="h-4 w-4 mr-1" />
              Chmod
            </TabsTrigger>
            <TabsTrigger value="chown">
              <User className="h-4 w-4 mr-1" />
              Chown
            </TabsTrigger>
            <TabsTrigger value="chtimes">
              <Clock className="h-4 w-4 mr-1" />
              Chtimes
            </TabsTrigger>
          </TabsList>

          {/* Move/Copy Tab */}
          <TabsContent value="move" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="moveSrc">Source Path</Label>
              <Input
                id="moveSrc"
                value={moveSrc}
                onChange={(e) => setMoveSrc(e.target.value)}
                placeholder="/path/to/source"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="moveDst">Destination Path</Label>
              <Input
                id="moveDst"
                value={moveDst}
                onChange={(e) => setMoveDst(e.target.value)}
                placeholder="/path/to/destination"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => moveMutation.mutate()}
                disabled={moveMutation.isPending || !moveSrc || !moveDst}
              >
                {moveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <MoveHorizontal className="h-4 w-4 mr-2" />
                Move
              </Button>
              <Button
                variant="secondary"
                onClick={() => copyMutation.mutate()}
                disabled={copyMutation.isPending || !moveSrc || !moveDst}
              >
                {copyMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
          </TabsContent>

          {/* Grep Tab */}
          <TabsContent value="grep" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="grepPath">Search Path</Label>
                <Input
                  id="grepPath"
                  value={grepPath}
                  onChange={(e) => setGrepPath(e.target.value)}
                  placeholder="/path/to/search"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grepPattern">Pattern (Regex)</Label>
                <Input
                  id="grepPattern"
                  value={grepPattern}
                  onChange={(e) => setGrepPattern(e.target.value)}
                  placeholder="search pattern"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="grepRecursive"
                  checked={grepRecursive}
                  onCheckedChange={setGrepRecursive}
                />
                <Label htmlFor="grepRecursive">Recursive</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="grepInsensitive"
                  checked={grepInsensitive}
                  onCheckedChange={setGrepInsensitive}
                />
                <Label htmlFor="grepInsensitive">Case Insensitive</Label>
              </div>
            </div>
            <Button
              onClick={() => grepMutation.mutate()}
              disabled={grepMutation.isPending || !grepPath || !grepPattern}
            >
              {grepMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            {grepResults.length > 0 && (
              <ScrollArea className="h-[200px] border rounded-md p-2">
                <div className="space-y-1">
                  {grepResults.map((match, idx) => (
                    <div key={idx} className="text-xs font-mono">
                      <span className="text-blue-500">{match.path}</span>
                      <span className="text-muted-foreground">:{match.lineNumber}:</span>
                      <span>{match.line}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Head/Tail Tab */}
          <TabsContent value="headtail" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="headTailPath">File Path</Label>
                <Input
                  id="headTailPath"
                  value={headTailPath}
                  onChange={(e) => setHeadTailPath(e.target.value)}
                  placeholder="/path/to/file"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="headTailLines">Lines</Label>
                <Input
                  id="headTailLines"
                  type="number"
                  value={headTailLines}
                  onChange={(e) => setHeadTailLines(parseInt(e.target.value) || 10)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => headMutation.mutate()}
                disabled={headMutation.isPending || !headTailPath}
              >
                {headMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Head
              </Button>
              <Button
                variant="secondary"
                onClick={() => tailMutation.mutate()}
                disabled={tailMutation.isPending || !headTailPath}
              >
                {tailMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Tail
              </Button>
            </div>
            {headTailResult && (
              <ScrollArea className="h-[200px] border rounded-md">
                <pre className="p-2 text-xs font-mono whitespace-pre-wrap">{headTailResult}</pre>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Chmod Tab */}
          <TabsContent value="chmod" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="chmodPath">File/Directory Path</Label>
                <Input
                  id="chmodPath"
                  value={chmodPath}
                  onChange={(e) => setChmodPath(e.target.value)}
                  placeholder="/path/to/file"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chmodMode">Mode (octal)</Label>
                <Input
                  id="chmodMode"
                  value={chmodMode}
                  onChange={(e) => setChmodMode(e.target.value)}
                  placeholder="644"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="chmodRecursive"
                checked={chmodRecursive}
                onCheckedChange={setChmodRecursive}
              />
              <Label htmlFor="chmodRecursive">Recursive</Label>
            </div>
            <Button
              onClick={() => chmodMutation.mutate()}
              disabled={chmodMutation.isPending || !chmodPath || !chmodMode}
            >
              {chmodMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Shield className="h-4 w-4 mr-2" />
              Change Permissions
            </Button>
          </TabsContent>

          {/* Chown Tab */}
          <TabsContent value="chown" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="chownPath">File/Directory Path</Label>
              <Input
                id="chownPath"
                value={chownPath}
                onChange={(e) => setChownPath(e.target.value)}
                placeholder="/path/to/file"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="chownUid">UID/Username</Label>
                <Input
                  id="chownUid"
                  value={chownUid}
                  onChange={(e) => setChownUid(e.target.value)}
                  placeholder="1000 or username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chownGid">GID/Group</Label>
                <Input
                  id="chownGid"
                  value={chownGid}
                  onChange={(e) => setChownGid(e.target.value)}
                  placeholder="1000 or group"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="chownRecursive"
                checked={chownRecursive}
                onCheckedChange={setChownRecursive}
              />
              <Label htmlFor="chownRecursive">Recursive</Label>
            </div>
            <Button
              onClick={() => chownMutation.mutate()}
              disabled={chownMutation.isPending || !chownPath || (!chownUid && !chownGid)}
            >
              {chownMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <User className="h-4 w-4 mr-2" />
              Change Ownership
            </Button>
          </TabsContent>

          {/* Chtimes Tab */}
          <TabsContent value="chtimes" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="chtimesPath">File Path</Label>
              <Input
                id="chtimesPath"
                value={chtimesPath}
                onChange={(e) => setChtimesPath(e.target.value)}
                placeholder="/path/to/file"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="chtimesAtime">Access Time</Label>
                <Input
                  id="chtimesAtime"
                  type="datetime-local"
                  value={chtimesAtime}
                  onChange={(e) => setChtimesAtime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chtimesMtime">Modification Time</Label>
                <Input
                  id="chtimesMtime"
                  type="datetime-local"
                  value={chtimesMtime}
                  onChange={(e) => setChtimesMtime(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Timestomping: Change file timestamps for anti-forensics
            </p>
            <Button
              onClick={() => chtimesMutation.mutate()}
              disabled={chtimesMutation.isPending || !chtimesPath || !chtimesAtime || !chtimesMtime}
            >
              {chtimesMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Clock className="h-4 w-4 mr-2" />
              Change Timestamps
            </Button>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
