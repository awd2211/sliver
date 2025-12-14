import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Plus,
  Trash2,
  Play,
  Square,
  Cpu,
  FileText,
  BookOpen,
  Zap,
  RefreshCw,
  Upload,
  Server,
  BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { CrackStation, CrackJob, StartCrackJobRequest, Hcstat2 } from '@/types';

const HASH_TYPES = [
  { value: 0, label: 'MD5' },
  { value: 100, label: 'SHA1' },
  { value: 1400, label: 'SHA256' },
  { value: 1700, label: 'SHA512' },
  { value: 1000, label: 'NTLM' },
  { value: 3000, label: 'LM' },
  { value: 5500, label: 'NetNTLMv1' },
  { value: 5600, label: 'NetNTLMv2' },
  { value: 13100, label: 'Kerberos 5 TGS-REP' },
  { value: 18200, label: 'Kerberos 5 AS-REP' },
  { value: 7500, label: 'Kerberos 5 AS-REQ Pre-Auth' },
  { value: 2500, label: 'WPA/WPA2' },
  { value: 22000, label: 'WPA-PBKDF2-PMKID+EAPOL' },
];

export function Crack() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('jobs');
  const [createJobDialogOpen, setCreateJobDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadType, setUploadType] = useState<'wordlist' | 'rule' | 'hcstat2'>('wordlist');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [newJob, setNewJob] = useState<Partial<StartCrackJobRequest>>({
    name: '',
    hashType: 1000,
    hashes: [],
    attackMode: 'dictionary',
    wordlistIds: [],
    ruleIds: [],
  });
  const [hashInput, setHashInput] = useState('');

  const { data: stationsData, isLoading: stationsLoading } = useQuery({
    queryKey: ['crack-stations'],
    queryFn: () => api.getCrackStations(),
  });

  const { data: wordlistsData, isLoading: wordlistsLoading, refetch: refetchWordlists } = useQuery({
    queryKey: ['wordlists'],
    queryFn: () => api.getWordlists(),
  });

  const { data: rulesData, isLoading: rulesLoading, refetch: refetchRules } = useQuery({
    queryKey: ['crack-rules'],
    queryFn: () => api.getCrackRules(),
  });

  const { data: hcstat2Data, isLoading: hcstat2Loading, refetch: refetchHcstat2 } = useQuery({
    queryKey: ['hcstat2-files'],
    queryFn: () => api.getHcstat2Files(),
  });

  const { data: jobsData, isLoading: jobsLoading, refetch: refetchJobs } = useQuery({
    queryKey: ['crack-jobs'],
    queryFn: () => api.getCrackJobs(),
    refetchInterval: 5000,
  });

  const startJobMutation = useMutation({
    mutationFn: (req: StartCrackJobRequest) => api.startCrackJob(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crack-jobs'] });
      toast.success('Crack job started');
      setCreateJobDialogOpen(false);
      resetJobForm();
    },
    onError: (err: Error) => {
      toast.error(`Failed to start crack job: ${err.message}`);
    },
  });

  const cancelJobMutation = useMutation({
    mutationFn: (id: string) => api.cancelCrackJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crack-jobs'] });
      toast.success('Crack job cancelled');
    },
    onError: (err: Error) => {
      toast.error(`Failed to cancel job: ${err.message}`);
    },
  });

  const uploadWordlistMutation = useMutation({
    mutationFn: (file: File) => api.uploadWordlist(file),
    onSuccess: () => {
      refetchWordlists();
      toast.success('Wordlist uploaded');
      setUploadDialogOpen(false);
      setSelectedFile(null);
    },
    onError: (err: Error) => {
      toast.error(`Failed to upload wordlist: ${err.message}`);
    },
  });

  const uploadRuleMutation = useMutation({
    mutationFn: (file: File) => api.uploadCrackRule(file),
    onSuccess: () => {
      refetchRules();
      toast.success('Rule file uploaded');
      setUploadDialogOpen(false);
      setSelectedFile(null);
    },
    onError: (err: Error) => {
      toast.error(`Failed to upload rule file: ${err.message}`);
    },
  });

  const deleteWordlistMutation = useMutation({
    mutationFn: (id: string) => api.deleteWordlist(id),
    onSuccess: () => {
      refetchWordlists();
      toast.success('Wordlist deleted');
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete wordlist: ${err.message}`);
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id: string) => api.deleteCrackRule(id),
    onSuccess: () => {
      refetchRules();
      toast.success('Rule file deleted');
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete rule file: ${err.message}`);
    },
  });

  const uploadHcstat2Mutation = useMutation({
    mutationFn: (file: File) => api.uploadHcstat2(file),
    onSuccess: () => {
      refetchHcstat2();
      toast.success('Hcstat2 file uploaded');
      setUploadDialogOpen(false);
      setSelectedFile(null);
    },
    onError: (err: Error) => {
      toast.error(`Failed to upload hcstat2 file: ${err.message}`);
    },
  });

  const deleteHcstat2Mutation = useMutation({
    mutationFn: (id: string) => api.deleteHcstat2(id),
    onSuccess: () => {
      refetchHcstat2();
      toast.success('Hcstat2 file deleted');
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete hcstat2 file: ${err.message}`);
    },
  });

  const resetJobForm = () => {
    setNewJob({
      name: '',
      hashType: 1000,
      hashes: [],
      attackMode: 'dictionary',
      wordlistIds: [],
      ruleIds: [],
    });
    setHashInput('');
  };

  const handleStartJob = () => {
    const hashes = hashInput.split('\n').filter((h) => h.trim());
    if (!newJob.name || hashes.length === 0) {
      toast.error('Job name and hashes are required');
      return;
    }
    startJobMutation.mutate({
      ...newJob,
      hashes,
    } as StartCrackJobRequest);
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    if (uploadType === 'wordlist') {
      uploadWordlistMutation.mutate(selectedFile);
    } else if (uploadType === 'rule') {
      uploadRuleMutation.mutate(selectedFile);
    } else if (uploadType === 'hcstat2') {
      uploadHcstat2Mutation.mutate(selectedFile);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const formatSpeed = (speed: number) => {
    if (speed < 1000) return `${speed} H/s`;
    if (speed < 1000000) return `${(speed / 1000).toFixed(1)} KH/s`;
    if (speed < 1000000000) return `${(speed / 1000000).toFixed(1)} MH/s`;
    return `${(speed / 1000000000).toFixed(1)} GH/s`;
  };

  const stations = stationsData?.stations || [];
  const wordlists = wordlistsData?.wordlists || [];
  const rules = rulesData?.rules || [];
  const hcstat2Files = hcstat2Data?.hcstat2 || [];
  const jobs = jobsData?.jobs || [];

  const getJobStatusBadge = (status: CrackJob['status']) => {
    switch (status) {
      case 'running':
        return <Badge variant="default">Running</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'paused':
        return <Badge variant="secondary">Paused</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const getStationStatusBadge = (state: CrackStation['state']) => {
    switch (state) {
      case 'idle':
        return <Badge variant="secondary">Idle</Badge>;
      case 'cracking':
        return <Badge variant="default">Cracking</Badge>;
      case 'syncing':
        return <Badge className="bg-blue-500">Syncing</Badge>;
      case 'offline':
        return <Badge variant="destructive">Offline</Badge>;
      default:
        return <Badge variant="outline">{state}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Password Cracking</h1>
          <p className="text-muted-foreground">
            GPU-accelerated password cracking with hashcat
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="jobs">
            <Zap className="h-4 w-4 mr-2" />
            Jobs
          </TabsTrigger>
          <TabsTrigger value="stations">
            <Cpu className="h-4 w-4 mr-2" />
            Stations
          </TabsTrigger>
          <TabsTrigger value="wordlists">
            <BookOpen className="h-4 w-4 mr-2" />
            Wordlists
          </TabsTrigger>
          <TabsTrigger value="rules">
            <FileText className="h-4 w-4 mr-2" />
            Rules
          </TabsTrigger>
          <TabsTrigger value="hcstat2">
            <BarChart3 className="h-4 w-4 mr-2" />
            Markov Stats
          </TabsTrigger>
        </TabsList>

        {/* Jobs Tab */}
        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Crack Jobs</CardTitle>
                  <CardDescription>Active and completed password cracking jobs</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => refetchJobs()}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button onClick={() => setCreateJobDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Job
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No crack jobs. Create one to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Hash Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Speed</TableHead>
                      <TableHead>Recovered</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell className="font-medium">{job.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {HASH_TYPES.find((t) => t.value === job.hashType)?.label || job.hashType}
                          </Badge>
                        </TableCell>
                        <TableCell>{getJobStatusBadge(job.status)}</TableCell>
                        <TableCell className="w-32">
                          <div className="space-y-1">
                            <Progress value={job.progress} />
                            <span className="text-xs text-muted-foreground">{job.progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {formatSpeed(job.speed)}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono">
                            {job.recovered}/{job.total}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {job.status === 'running' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => cancelJobMutation.mutate(job.id)}
                              disabled={cancelJobMutation.isPending}
                            >
                              <Square className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stations Tab */}
        <TabsContent value="stations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Crack Stations
              </CardTitle>
              <CardDescription>Connected GPU cracking workstations</CardDescription>
            </CardHeader>
            <CardContent>
              {stationsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : stations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No crack stations connected
                </div>
              ) : (
                <div className="space-y-4">
                  {stations.map((station) => (
                    <Card key={station.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base">{station.name}</CardTitle>
                            <CardDescription>
                              Operator: {station.operatorName}
                            </CardDescription>
                          </div>
                          {getStationStatusBadge(station.state)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <label className="text-muted-foreground">CUDA Version</label>
                            <p>{station.cudaVersion || 'N/A'}</p>
                          </div>
                          <div>
                            <label className="text-muted-foreground">Driver Version</label>
                            <p>{station.driverVersion || 'N/A'}</p>
                          </div>
                          <div>
                            <label className="text-muted-foreground">GPUs</label>
                            <p>{station.gpus?.length || 0}</p>
                          </div>
                        </div>
                        {station.gpus && station.gpus.length > 0 && (
                          <div className="mt-4">
                            <label className="text-sm text-muted-foreground">GPU Details</label>
                            <div className="mt-2 space-y-2">
                              {station.gpus.map((gpu) => (
                                <div
                                  key={gpu.id}
                                  className="flex items-center justify-between p-2 bg-muted rounded"
                                >
                                  <div>
                                    <p className="font-medium">{gpu.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Memory: {formatSize(gpu.memoryFree)} / {formatSize(gpu.memoryTotal)}
                                    </p>
                                  </div>
                                  <div className="text-right text-sm">
                                    <p>Temp: {gpu.temperature}°C</p>
                                    <p>Load: {gpu.utilization}%</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Wordlists Tab */}
        <TabsContent value="wordlists" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Wordlists
                  </CardTitle>
                  <CardDescription>Dictionary files for password cracking</CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setUploadType('wordlist');
                    setUploadDialogOpen(true);
                  }}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Wordlist
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {wordlistsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : wordlists.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No wordlists uploaded
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Lines</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wordlists.map((wordlist) => (
                      <TableRow key={wordlist.id}>
                        <TableCell className="font-medium">{wordlist.name}</TableCell>
                        <TableCell>{formatSize(wordlist.size)}</TableCell>
                        <TableCell>{wordlist.lineCount.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteWordlistMutation.mutate(wordlist.id)}
                            disabled={deleteWordlistMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Rule Files
                  </CardTitle>
                  <CardDescription>Hashcat rule files for password mutations</CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setUploadType('rule');
                    setUploadDialogOpen(true);
                  }}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Rule File
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {rulesLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : rules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No rule files uploaded
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium">{rule.name}</TableCell>
                        <TableCell>{formatSize(rule.size)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteRuleMutation.mutate(rule.id)}
                            disabled={deleteRuleMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hcstat2 Tab */}
        <TabsContent value="hcstat2" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Markov Statistics Files
                  </CardTitle>
                  <CardDescription>
                    Hashcat hcstat2 files for Markov chain-based password generation
                  </CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setUploadType('hcstat2');
                    setUploadDialogOpen(true);
                  }}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Hcstat2 File
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {hcstat2Loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : hcstat2Files.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No hcstat2 files uploaded</p>
                  <p className="text-sm mt-1">
                    Upload Markov statistics files to optimize password cracking
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hcstat2Files.map((file: Hcstat2) => (
                      <TableRow key={file.id}>
                        <TableCell className="font-medium">{file.name}</TableCell>
                        <TableCell>{formatSize(file.size)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteHcstat2Mutation.mutate(file.id)}
                            disabled={deleteHcstat2Mutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Job Dialog */}
      <Dialog open={createJobDialogOpen} onOpenChange={setCreateJobDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Crack Job</DialogTitle>
            <DialogDescription>Configure a new password cracking job</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="jobName">Job Name</Label>
              <Input
                id="jobName"
                placeholder="my-crack-job"
                value={newJob.name}
                onChange={(e) => setNewJob({ ...newJob, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hash Type</Label>
                <Select
                  value={String(newJob.hashType)}
                  onValueChange={(v) => setNewJob({ ...newJob, hashType: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HASH_TYPES.map((type) => (
                      <SelectItem key={type.value} value={String(type.value)}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Attack Mode</Label>
                <Select
                  value={newJob.attackMode}
                  onValueChange={(v) =>
                    setNewJob({ ...newJob, attackMode: v as StartCrackJobRequest['attackMode'] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dictionary">Dictionary Attack</SelectItem>
                    <SelectItem value="brute_force">Brute Force</SelectItem>
                    <SelectItem value="combinator">Combinator</SelectItem>
                    <SelectItem value="hybrid_wordlist">Hybrid (Wordlist + Mask)</SelectItem>
                    <SelectItem value="hybrid_mask">Hybrid (Mask + Wordlist)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hashes">Hashes (one per line)</Label>
              <Textarea
                id="hashes"
                placeholder="Enter hashes here..."
                rows={6}
                className="font-mono text-sm"
                value={hashInput}
                onChange={(e) => setHashInput(e.target.value)}
              />
            </div>

            {newJob.attackMode === 'dictionary' && (
              <div className="space-y-2">
                <Label>Wordlist</Label>
                <Select
                  value={newJob.wordlistIds?.[0] || ''}
                  onValueChange={(v) => setNewJob({ ...newJob, wordlistIds: [v] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select wordlist" />
                  </SelectTrigger>
                  <SelectContent>
                    {wordlists.map((wl) => (
                      <SelectItem key={wl.id} value={wl.id}>
                        {wl.name} ({formatSize(wl.size)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {newJob.attackMode === 'brute_force' && (
              <div className="space-y-2">
                <Label htmlFor="mask">Mask</Label>
                <Input
                  id="mask"
                  placeholder="?a?a?a?a?a?a?a?a"
                  value={newJob.mask || ''}
                  onChange={(e) => setNewJob({ ...newJob, mask: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  ?l=lowercase ?u=uppercase ?d=digits ?s=special ?a=all
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateJobDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStartJob} disabled={startJobMutation.isPending}>
              {startJobMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Play className="h-4 w-4 mr-2" />
              Start Job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Upload {uploadType === 'wordlist' ? 'Wordlist' : uploadType === 'rule' ? 'Rule File' : 'Markov Statistics File'}
            </DialogTitle>
            <DialogDescription>
              Upload a {uploadType === 'wordlist' ? 'dictionary file' : uploadType === 'rule' ? 'hashcat rule file' : 'hcstat2 Markov statistics file'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>File</Label>
              <Input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={
                !selectedFile ||
                uploadWordlistMutation.isPending ||
                uploadRuleMutation.isPending ||
                uploadHcstat2Mutation.isPending
              }
            >
              {(uploadWordlistMutation.isPending || uploadRuleMutation.isPending || uploadHcstat2Mutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
