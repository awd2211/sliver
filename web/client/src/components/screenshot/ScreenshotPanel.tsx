import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Camera,
  RefreshCw,
  Loader2,
  Download,
  Maximize2,
  Clock,
  Image as ImageIcon,
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import type { Screenshot } from '@/types';
import { format } from 'date-fns';

interface ScreenshotPanelProps {
  sessionId: string;
}

export function ScreenshotPanel({ sessionId }: ScreenshotPanelProps) {
  const queryClient = useQueryClient();
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  // Fetch screenshots
  const { data: screenshotsData, isLoading, refetch } = useQuery({
    queryKey: ['screenshots', sessionId],
    queryFn: () => api.listScreenshots(sessionId),
  });

  // Capture screenshot mutation
  const captureMutation = useMutation({
    mutationFn: () => api.screenshot(sessionId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['screenshots', sessionId] });
      setSelectedScreenshot(data);
      toast.success('Screenshot captured');
    },
    onError: (error: Error) => {
      toast.error(`Failed to capture screenshot: ${error.message}`);
    },
  });

  const handleDownload = (screenshot: Screenshot) => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${screenshot.data}`;
    link.download = `screenshot-${screenshot.id.slice(0, 8)}-${format(new Date(screenshot.capturedAt), 'yyyyMMdd-HHmmss')}.png`;
    link.click();
    toast.success('Screenshot downloaded');
  };

  const screenshots = screenshotsData?.screenshots || [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-yellow-500" />
          <div>
            <h2 className="text-lg font-semibold">Screenshots</h2>
            <p className="text-sm text-muted-foreground">
              Capture and view remote desktop screenshots
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          <Button
            onClick={() => captureMutation.mutate()}
            disabled={captureMutation.isPending}
          >
            {captureMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Camera className="h-4 w-4 mr-2" />
            )}
            Capture
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Screenshot Grid */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : screenshots.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <ImageIcon className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">No screenshots yet</p>
                <p className="text-sm">Click Capture to take a screenshot</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {screenshots.map((screenshot) => (
                  <Card
                    key={screenshot.id}
                    className={`cursor-pointer transition-all hover:ring-2 hover:ring-yellow-500/50 ${
                      selectedScreenshot?.id === screenshot.id ? 'ring-2 ring-yellow-500' : ''
                    }`}
                    onClick={() => setSelectedScreenshot(screenshot)}
                  >
                    <CardContent className="p-2">
                      <div className="aspect-video bg-muted rounded overflow-hidden mb-2">
                        <img
                          src={`data:image/png;base64,${screenshot.data}`}
                          alt={`Screenshot ${screenshot.id.slice(0, 8)}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(screenshot.capturedAt), 'HH:mm:ss')}
                        </span>
                        <span>{screenshot.width}x{screenshot.height}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Preview Panel */}
        <div className="w-96 border-l flex flex-col">
          <div className="p-3 border-b bg-muted/50">
            <h4 className="text-sm font-medium">Preview</h4>
          </div>
          {selectedScreenshot ? (
            <div className="flex-1 flex flex-col p-4 overflow-hidden">
              <div className="flex-1 bg-muted rounded-lg overflow-hidden mb-4">
                <img
                  src={`data:image/png;base64,${selectedScreenshot.data}`}
                  alt="Selected screenshot"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID:</span>
                  <span className="font-mono">{selectedScreenshot.id.slice(0, 8)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Resolution:</span>
                  <span>{selectedScreenshot.width} x {selectedScreenshot.height}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Captured:</span>
                  <span>{format(new Date(selectedScreenshot.capturedAt), 'yyyy-MM-dd HH:mm:ss')}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setViewerOpen(true);
                  }}
                >
                  <Maximize2 className="h-4 w-4 mr-2" />
                  Full View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleDownload(selectedScreenshot)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Select a screenshot to preview
            </div>
          )}
        </div>
      </div>

      {/* Full View Dialog */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Screenshot Preview</DialogTitle>
          </DialogHeader>
          {selectedScreenshot && (
            <div className="flex flex-col items-center">
              <img
                src={`data:image/png;base64,${selectedScreenshot.data}`}
                alt="Full view"
                className="max-w-full max-h-[70vh] object-contain"
              />
              <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                <span>{selectedScreenshot.width} x {selectedScreenshot.height}</span>
                <span>{format(new Date(selectedScreenshot.capturedAt), 'yyyy-MM-dd HH:mm:ss')}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(selectedScreenshot)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
