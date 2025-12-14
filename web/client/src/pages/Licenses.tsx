import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Loader2, FileText, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import type { License } from '@/types';

export default function Licenses() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['licenses'],
    queryFn: () => api.getLicenses(),
  });

  const licenses = data?.licenses || [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Licenses</h1>
          <p className="text-muted-foreground">
            Third-party software licenses and attributions
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Open Source Licenses ({licenses.length})
          </CardTitle>
          <CardDescription>
            Sliver uses the following open source software
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : licenses.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Licenses Found</h3>
              <p className="text-muted-foreground">
                License information is not available
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <Accordion type="single" collapsible className="w-full">
                {licenses.map((license: License, index: number) => (
                  <AccordionItem key={index} value={`license-${index}`}>
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{license.name}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <pre className="whitespace-pre-wrap text-xs font-mono bg-muted p-4 rounded-lg overflow-auto max-h-[400px]">
                        {license.text}
                      </pre>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
