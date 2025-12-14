import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Settings as SettingsIcon, Save, Moon, Sun, Globe, Terminal, RotateCcw, Keyboard, RefreshCw, Download, CheckCircle, Loader2, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { languages } from '@/i18n';
import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTerminalSettings, terminalThemes } from '@/contexts';
import { toast } from 'sonner';
import { keyboardShortcuts } from '@/hooks';
import { Kbd } from '@/components/keyboard';
import api from '@/lib/api';
import type { UpdateInfo, CleanRequest } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function Settings() {
  const { t, i18n } = useTranslation();
  const [isDark, setIsDark] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [cleanDialogOpen, setCleanDialogOpen] = useState(false);
  const [cleanOptions, setCleanOptions] = useState<CleanRequest>({
    sessions: false,
    beacons: false,
    jobs: false,
    implants: false,
    hosts: false,
    loot: false,
    credentials: false,
  });
  const { settings: terminalSettings, updateSettings: updateTerminalSettings, resetToDefaults } = useTerminalSettings();

  const cleanMutation = useMutation({
    mutationFn: (req: CleanRequest) => api.clean(req),
    onSuccess: (data) => {
      const deletedItems = Object.entries(data.deleted || {})
        .filter(([, count]) => count > 0)
        .map(([type, count]) => `${count} ${type}`)
        .join(', ');
      if (deletedItems) {
        toast.success(`Cleaned: ${deletedItems}`);
      } else {
        toast.info('No items to clean');
      }
      setCleanDialogOpen(false);
      setCleanOptions({
        sessions: false,
        beacons: false,
        jobs: false,
        implants: false,
        hosts: false,
        loot: false,
        credentials: false,
      });
    },
    onError: (err: Error) => {
      toast.error(`Failed to clean: ${err.message}`);
    },
  });

  const checkUpdateMutation = useMutation({
    mutationFn: () => api.checkUpdate(),
    onSuccess: (data) => {
      setUpdateInfo(data);
      if (data.updateAvailable) {
        toast.info(`New version available: ${data.latestVersion}`);
      } else {
        toast.success('You are running the latest version');
      }
    },
    onError: (err: Error) => {
      toast.error(`Failed to check for updates: ${err.message}`);
    },
  });

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const handleResetTerminal = () => {
    resetToDefaults();
    toast.success('Terminal settings reset to defaults');
  };

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    document.documentElement.classList.toggle('dark', newIsDark);
    localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('settings.title')}</h1>
        <p className="text-muted-foreground">Configure your Sliver web interface</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Server Connection
            </CardTitle>
            <CardDescription>Configure connection to the Sliver server</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="serverUrl">Server URL</Label>
              <Input
                id="serverUrl"
                placeholder="https://localhost:31337"
                defaultValue="http://localhost:8080"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="timeout">Request Timeout (seconds)</Label>
              <Input
                id="timeout"
                type="number"
                placeholder="30"
                defaultValue="30"
              />
            </div>
            <Button className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950">
              <Save className="h-4 w-4 mr-2" />
              {t('common.save')} Settings
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {t('settings.appearance')}
            </CardTitle>
            <CardDescription>Customize the look and feel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t('settings.theme')}</p>
                <p className="text-sm text-muted-foreground">
                  {isDark ? t('settings.themeDark') : t('settings.themeLight')}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={toggleTheme}>
                {isDark ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
                {isDark ? t('settings.themeLight') : t('settings.themeDark')}
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t('settings.language')}</p>
                <p className="text-sm text-muted-foreground">
                  Select your preferred language
                </p>
              </div>
              <Select value={i18n.language} onValueChange={changeLanguage}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.nativeName} ({lang.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="h-5 w-5" />
                  Terminal Settings
                </CardTitle>
                <CardDescription>Configure the shell terminal appearance</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleResetTerminal}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Font Size */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Font Size</Label>
                <span className="text-sm text-muted-foreground">{terminalSettings.fontSize}px</span>
              </div>
              <Slider
                value={[terminalSettings.fontSize]}
                onValueChange={([value]) => updateTerminalSettings({ fontSize: value })}
                min={10}
                max={24}
                step={1}
                className="w-full"
              />
            </div>

            {/* Font Family */}
            <div className="space-y-2">
              <Label>Font Family</Label>
              <Select
                value={terminalSettings.fontFamily}
                onValueChange={(value) => updateTerminalSettings({ fontFamily: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='Menlo, Monaco, "Courier New", monospace'>Menlo / Monaco</SelectItem>
                  <SelectItem value='"JetBrains Mono", monospace'>JetBrains Mono</SelectItem>
                  <SelectItem value='"Fira Code", monospace'>Fira Code</SelectItem>
                  <SelectItem value='"Source Code Pro", monospace'>Source Code Pro</SelectItem>
                  <SelectItem value='"Cascadia Code", monospace'>Cascadia Code</SelectItem>
                  <SelectItem value='Consolas, monospace'>Consolas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Theme */}
            <div className="space-y-2">
              <Label>Color Theme</Label>
              <Select
                value={terminalSettings.theme}
                onValueChange={(value) => updateTerminalSettings({ theme: value as typeof terminalSettings.theme })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tokyo-night">Tokyo Night</SelectItem>
                  <SelectItem value="dracula">Dracula</SelectItem>
                  <SelectItem value="monokai">Monokai</SelectItem>
                  <SelectItem value="github-dark">GitHub Dark</SelectItem>
                </SelectContent>
              </Select>
              {/* Theme preview */}
              <div
                className="mt-2 p-3 rounded-md border font-mono text-sm"
                style={{
                  backgroundColor: terminalThemes[terminalSettings.theme]?.background || '#1a1b26',
                  color: terminalThemes[terminalSettings.theme]?.foreground || '#a9b1d6',
                }}
              >
                <span style={{ color: terminalThemes[terminalSettings.theme]?.green }}>user@host</span>
                <span style={{ color: terminalThemes[terminalSettings.theme]?.white }}>:</span>
                <span style={{ color: terminalThemes[terminalSettings.theme]?.blue }}>~/sliver</span>
                <span style={{ color: terminalThemes[terminalSettings.theme]?.white }}>$ </span>
                <span style={{ color: terminalThemes[terminalSettings.theme]?.yellow }}>ls -la</span>
              </div>
            </div>

            {/* Cursor Style */}
            <div className="space-y-2">
              <Label>Cursor Style</Label>
              <Select
                value={terminalSettings.cursorStyle}
                onValueChange={(value) => updateTerminalSettings({ cursorStyle: value as typeof terminalSettings.cursorStyle })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="block">Block</SelectItem>
                  <SelectItem value="underline">Underline</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Cursor Blink */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Cursor Blink</p>
                <p className="text-sm text-muted-foreground">
                  Enable blinking cursor animation
                </p>
              </div>
              <Switch
                checked={terminalSettings.cursorBlink}
                onCheckedChange={(checked) => updateTerminalSettings({ cursorBlink: checked })}
              />
            </div>

            {/* Scrollback */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Scrollback Lines</Label>
                <span className="text-sm text-muted-foreground">{terminalSettings.scrollback}</span>
              </div>
              <Slider
                value={[terminalSettings.scrollback]}
                onValueChange={([value]) => updateTerminalSettings({ scrollback: value })}
                min={100}
                max={10000}
                step={100}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Keyboard Shortcuts
            </CardTitle>
            <CardDescription>
              Quick navigation and actions. Press <Kbd>Ctrl</Kbd> + <Kbd>Shift</Kbd> + <Kbd>?</Kbd> for full list.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {keyboardShortcuts.map((shortcut, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm">{shortcut.description}</span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key, kidx) => (
                      <Kbd key={kidx}>{key}</Kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Updates
            </CardTitle>
            <CardDescription>Check for Sliver server updates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {updateInfo && (
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Current Version:</span>
                    <Badge variant="outline">{updateInfo.currentVersion}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Latest Version:</span>
                    <Badge variant={updateInfo.updateAvailable ? 'default' : 'outline'}>
                      {updateInfo.latestVersion}
                    </Badge>
                  </div>
                </div>
                {updateInfo.updateAvailable ? (
                  <Badge className="bg-yellow-500 text-yellow-950">
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Update Available
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-green-500 border-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Up to Date
                  </Badge>
                )}
              </div>
            )}
            {updateInfo?.releaseNotes && (
              <div className="space-y-2">
                <Label>Release Notes</Label>
                <div className="p-3 rounded-lg bg-muted text-sm whitespace-pre-wrap max-h-[200px] overflow-auto">
                  {updateInfo.releaseNotes}
                </div>
              </div>
            )}
            <Button
              variant="outline"
              onClick={() => checkUpdateMutation.mutate()}
              disabled={checkUpdateMutation.isPending}
            >
              {checkUpdateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Check for Updates
            </Button>
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Data Cleanup
            </CardTitle>
            <CardDescription>
              Remove old data from the Sliver database. This action is irreversible.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Select the types of data you want to remove. This will permanently delete the selected
              items from the database.
            </p>
            <Button
              variant="destructive"
              onClick={() => setCleanDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clean Database
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Clean Database Dialog */}
      <AlertDialog open={cleanDialogOpen} onOpenChange={setCleanDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Clean Database
            </AlertDialogTitle>
            <AlertDialogDescription>
              Select the types of data to remove. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="clean-sessions"
                  checked={cleanOptions.sessions}
                  onCheckedChange={(checked) =>
                    setCleanOptions({ ...cleanOptions, sessions: checked === true })
                  }
                />
                <label htmlFor="clean-sessions" className="text-sm font-medium leading-none">
                  Dead Sessions
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="clean-beacons"
                  checked={cleanOptions.beacons}
                  onCheckedChange={(checked) =>
                    setCleanOptions({ ...cleanOptions, beacons: checked === true })
                  }
                />
                <label htmlFor="clean-beacons" className="text-sm font-medium leading-none">
                  Dead Beacons
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="clean-jobs"
                  checked={cleanOptions.jobs}
                  onCheckedChange={(checked) =>
                    setCleanOptions({ ...cleanOptions, jobs: checked === true })
                  }
                />
                <label htmlFor="clean-jobs" className="text-sm font-medium leading-none">
                  Stopped Jobs
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="clean-implants"
                  checked={cleanOptions.implants}
                  onCheckedChange={(checked) =>
                    setCleanOptions({ ...cleanOptions, implants: checked === true })
                  }
                />
                <label htmlFor="clean-implants" className="text-sm font-medium leading-none">
                  Old Implants
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="clean-hosts"
                  checked={cleanOptions.hosts}
                  onCheckedChange={(checked) =>
                    setCleanOptions({ ...cleanOptions, hosts: checked === true })
                  }
                />
                <label htmlFor="clean-hosts" className="text-sm font-medium leading-none">
                  Host Records
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="clean-loot"
                  checked={cleanOptions.loot}
                  onCheckedChange={(checked) =>
                    setCleanOptions({ ...cleanOptions, loot: checked === true })
                  }
                />
                <label htmlFor="clean-loot" className="text-sm font-medium leading-none">
                  Loot Items
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="clean-credentials"
                  checked={cleanOptions.credentials}
                  onCheckedChange={(checked) =>
                    setCleanOptions({ ...cleanOptions, credentials: checked === true })
                  }
                />
                <label htmlFor="clean-credentials" className="text-sm font-medium leading-none">
                  Credentials
                </label>
              </div>
            </div>
            {!Object.values(cleanOptions).some(Boolean) && (
              <p className="text-sm text-muted-foreground text-center">
                Select at least one item type to clean
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cleanMutation.mutate(cleanOptions)}
              disabled={cleanMutation.isPending || !Object.values(cleanOptions).some(Boolean)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cleanMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cleaning...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clean Selected
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
