import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Loader2, CircleDot, UserCircle } from 'lucide-react';
import { api } from '@/lib/api';
import type { Operator } from '@/types';

export function Operators() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['operators'],
    queryFn: () => api.getOperators(),
    refetchInterval: 10000, // Refresh every 10 seconds to update online status
  });

  const operators = data?.operators || [];
  const onlineCount = operators.filter(op => op.online).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Operators</h1>
          <p className="text-muted-foreground">Team members with server access</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <CircleDot className="h-3 w-3 text-green-500" />
            {onlineCount} online
          </Badge>
          <Badge variant="secondary">{operators.length} total</Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Online Operators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">{onlineCount}</div>
            <p className="text-xs text-muted-foreground">Currently connected</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Offline Operators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-muted-foreground">{operators.length - onlineCount}</div>
            <p className="text-xs text-muted-foreground">Not connected</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Operators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{operators.length}</div>
            <p className="text-xs text-muted-foreground">Registered users</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Operators</CardTitle>
          <CardDescription>Users with access to this Sliver server</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              <p>Failed to load operators</p>
            </div>
          ) : operators.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No operators configured</p>
              <p className="text-sm">Add operators to allow team collaboration</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {operators.map((operator) => (
                <OperatorCard key={operator.name} operator={operator} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function OperatorCard({ operator }: { operator: Operator }) {
  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="relative">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <UserCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <div
          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${
            operator.online ? 'bg-green-500' : 'bg-muted-foreground'
          }`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{operator.name}</div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <CircleDot className={`h-3 w-3 ${operator.online ? 'text-green-500' : ''}`} />
          {operator.online ? 'Online' : 'Offline'}
        </div>
      </div>
      <Badge variant={operator.online ? 'default' : 'secondary'} className={operator.online ? 'bg-green-500' : ''}>
        {operator.online ? 'Active' : 'Away'}
      </Badge>
    </div>
  );
}
