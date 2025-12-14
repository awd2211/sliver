import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { wsService } from '@/services/websocket';
import { Button } from '@/components/ui/button';
import { Play, Square, Maximize2, Minimize2, RefreshCw, X } from 'lucide-react';
import type { ShellOutputPayload } from '@/types';
import { useTerminalSettings } from '@/contexts';

interface ShellTerminalProps {
  sessionId: string;
  onClose?: () => void;
}

export function ShellTerminal({ sessionId, onClose }: ShellTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [tunnelId, setTunnelId] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { settings, getThemeColors } = useTerminalSettings();

  const handleResize = useCallback(() => {
    if (fitAddonRef.current && xtermRef.current) {
      fitAddonRef.current.fit();
      if (tunnelId !== null) {
        const dims = fitAddonRef.current.proposeDimensions();
        if (dims) {
          wsService.resizeShell(sessionId, tunnelId, dims.cols, dims.rows);
        }
      }
    }
  }, [sessionId, tunnelId]);

  useEffect(() => {
    if (!terminalRef.current) return;

    const themeColors = getThemeColors();

    // Initialize terminal with user settings
    const term = new Terminal({
      cursorBlink: settings.cursorBlink,
      cursorStyle: settings.cursorStyle,
      fontSize: settings.fontSize,
      fontFamily: settings.fontFamily,
      scrollback: settings.scrollback,
      theme: {
        background: themeColors.background,
        foreground: themeColors.foreground,
        cursor: themeColors.cursor,
        cursorAccent: themeColors.background,
        selectionBackground: themeColors.selectionBackground,
        black: themeColors.black,
        red: themeColors.red,
        green: themeColors.green,
        yellow: themeColors.yellow,
        blue: themeColors.blue,
        magenta: themeColors.magenta,
        cyan: themeColors.cyan,
        white: themeColors.white,
        brightBlack: themeColors.black,
        brightRed: themeColors.red,
        brightGreen: themeColors.green,
        brightYellow: themeColors.yellow,
        brightBlue: themeColors.blue,
        brightMagenta: themeColors.magenta,
        brightCyan: themeColors.cyan,
        brightWhite: themeColors.white,
      },
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Handle window resize
    window.addEventListener('resize', handleResize);

    // Handle user input
    term.onData((data) => {
      if (tunnelId !== null) {
        wsService.sendShellInput(sessionId, tunnelId, data);
      }
    });

    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, handleResize, settings, getThemeColors]);

  // Subscribe to shell output
  useEffect(() => {
    const unsubscribe = wsService.onShellOutput((payload: ShellOutputPayload) => {
      if (payload.sessionId === sessionId && xtermRef.current) {
        // First message sets the tunnel ID
        if (tunnelId === null && payload.tunnelId) {
          setTunnelId(payload.tunnelId);
          setIsConnected(true);
        }
        xtermRef.current.write(payload.data);
      }
    });

    return () => unsubscribe();
  }, [sessionId, tunnelId]);

  const startShell = () => {
    xtermRef.current?.clear();
    xtermRef.current?.write('Starting shell...\r\n');
    wsService.startShell(sessionId, true);
  };

  const stopShell = () => {
    if (tunnelId !== null) {
      wsService.stopShell(sessionId, tunnelId);
      setIsConnected(false);
      setTunnelId(null);
      xtermRef.current?.write('\r\n[Shell closed]\r\n');
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    // Resize after state change
    setTimeout(handleResize, 100);
  };

  const clearTerminal = () => {
    xtermRef.current?.clear();
  };

  const themeColors = getThemeColors();

  return (
    <div
      className={`flex flex-col rounded-lg border border-border overflow-hidden ${
        isFullscreen ? 'fixed inset-4 z-50' : 'h-[500px]'
      }`}
      style={{ backgroundColor: themeColors.background }}
    >
      {/* Terminal header */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b border-border"
        style={{ backgroundColor: themeColors.black }}
      >
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
          <span className="text-sm text-muted-foreground">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {!isConnected ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={startShell}
              className="h-7 px-2 text-xs"
            >
              <Play className="h-3 w-3 mr-1" />
              Start
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={stopShell}
              className="h-7 px-2 text-xs text-destructive"
            >
              <Square className="h-3 w-3 mr-1" />
              Stop
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={clearTerminal}
            className="h-7 w-7"
            title="Clear"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="h-7 w-7"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3 w-3" />
            ) : (
              <Maximize2 className="h-3 w-3" />
            )}
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-7 w-7"
              title="Close"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Terminal content */}
      <div ref={terminalRef} className="flex-1 p-2" />
    </div>
  );
}
