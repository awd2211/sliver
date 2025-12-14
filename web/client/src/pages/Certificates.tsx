import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ShieldCheck,
  Plus,
  Trash2,
  RefreshCw,
  Loader2,
  Key,
  Copy,
  Check,
} from 'lucide-react';
import api from '@/lib/api';
import type { Certificate } from '@/types';
import { format } from 'date-fns';

export function Certificates() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [certType, setCertType] = useState<string>('server');
  const [commonName, setCommonName] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['certificates'],
    queryFn: () => api.getCertificates(),
  });

  const generateMutation = useMutation({
    mutationFn: ({ type, cn }: { type: string; cn: string }) =>
      api.generateCertificate(type, cn),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      setCreateDialogOpen(false);
      resetForm();
      toast.success('Certificate generated');
    },
    onError: (error: Error) => {
      toast.error('Failed to generate certificate', {
        description: error.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteCertificate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      toast.success('Certificate deleted');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete certificate', {
        description: error.message,
      });
    },
  });

  const resetForm = () => {
    setCertType('server');
    setCommonName('');
  };

  const handleGenerate = () => {
    generateMutation.mutate({ type: certType, cn: commonName });
  };

  const copyFingerprint = (id: string, fingerprint: string) => {
    navigator.clipboard.writeText(fingerprint);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getCertTypeBadge = (type: Certificate['type']) => {
    switch (type) {
      case 'ca':
        return <Badge className="bg-purple-500/10 text-purple-600">CA</Badge>;
      case 'server':
        return <Badge className="bg-blue-500/10 text-blue-600">Server</Badge>;
      case 'client':
        return <Badge className="bg-green-500/10 text-green-600">Client</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const certificates = data?.certificates ?? [];
  const caCount = certificates.filter((c) => c.type === 'ca').length;
  const serverCount = certificates.filter((c) => c.type === 'server').length;
  const clientCount = certificates.filter((c) => c.type === 'client').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-yellow-500" />
            Certificates
          </h1>
          <p className="text-muted-foreground">
            Manage TLS certificates for secure communications
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950">
                <Plus className="h-4 w-4 mr-2" />
                Generate Certificate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Certificate</DialogTitle>
                <DialogDescription>
                  Create a new TLS certificate
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="type">Certificate Type</Label>
                  <Select value={certType} onValueChange={setCertType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ca">Certificate Authority (CA)</SelectItem>
                      <SelectItem value="server">Server Certificate</SelectItem>
                      <SelectItem value="client">Client Certificate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cn">Common Name (CN)</Label>
                  <Input
                    id="cn"
                    placeholder="e.g., sliver.example.com"
                    value={commonName}
                    onChange={(e) => setCommonName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    The subject common name for the certificate
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending || !commonName}
                  className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4 mr-2" />
                      Generate
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Certificates</CardDescription>
            <CardTitle className="text-2xl">{certificates.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>CA Certificates</CardDescription>
            <CardTitle className="text-2xl text-purple-600">{caCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Server Certificates</CardDescription>
            <CardTitle className="text-2xl text-blue-600">{serverCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Client Certificates</CardDescription>
            <CardTitle className="text-2xl text-green-600">{clientCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Certificate List
          </CardTitle>
          <CardDescription>
            All TLS certificates managed by the server
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : certificates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShieldCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No certificates found</p>
              <p className="text-sm">Generate a certificate to get started</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Common Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Valid From</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Fingerprint</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {certificates.map((cert) => (
                    <TableRow key={cert.id}>
                      <TableCell className="font-medium">{cert.commonName}</TableCell>
                      <TableCell>{getCertTypeBadge(cert.type)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(cert.notBefore), 'PPp')}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(cert.notAfter), 'PPp')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded max-w-[150px] truncate">
                            {cert.fingerprint}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyFingerprint(cert.id, cert.fingerprint)}
                          >
                            {copiedId === cert.id ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              title="Delete certificate"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Certificate</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete the certificate "{cert.commonName}"?
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(cert.id)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
