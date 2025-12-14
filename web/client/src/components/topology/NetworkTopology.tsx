import { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  MarkerType,
  Panel,
} from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  RefreshCw,
  Loader2,
  Server,
  Monitor,
  Radio,
  Circle,
} from 'lucide-react';
import api from '@/lib/api';
import type { TopologyNode, Session, Beacon } from '@/types';

// Custom node component for sessions/beacons
function SessionNode({ data }: { data: TopologyNode['data'] & { type: string } }) {
  const isDead = data.isDead;
  const isBeacon = data.type === 'beacon';
  const isServer = data.type === 'server';

  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 shadow-lg min-w-[200px]
        ${isServer
          ? 'bg-purple-900/80 border-purple-500'
          : isDead
            ? 'bg-gray-800/80 border-gray-600 opacity-60'
            : isBeacon
              ? 'bg-blue-900/80 border-blue-500'
              : 'bg-green-900/80 border-green-500'
        }
      `}
    >
      <div className="flex items-center gap-2 mb-2">
        {isServer ? (
          <Server className="h-5 w-5 text-purple-400" />
        ) : isBeacon ? (
          <Radio className="h-5 w-5 text-blue-400" />
        ) : (
          <Monitor className="h-5 w-5 text-green-400" />
        )}
        <span className="font-semibold text-white truncate">{data.label}</span>
        {!isServer && (
          <Circle
            className={`h-2 w-2 ${isDead ? 'fill-gray-500 text-gray-500' : 'fill-green-500 text-green-500'}`}
          />
        )}
      </div>

      {data.hostname && (
        <div className="text-xs text-gray-300 truncate">
          <span className="text-gray-500">Host:</span> {data.hostname}
        </div>
      )}
      {data.username && (
        <div className="text-xs text-gray-300 truncate">
          <span className="text-gray-500">User:</span> {data.username}
        </div>
      )}
      {data.os && (
        <div className="text-xs text-gray-300 truncate">
          <span className="text-gray-500">OS:</span> {data.os} {data.arch}
        </div>
      )}
      {data.transport && (
        <div className="text-xs text-gray-300 truncate">
          <span className="text-gray-500">Transport:</span> {data.transport}
        </div>
      )}
      {data.remoteAddress && (
        <div className="text-xs text-gray-300 truncate">
          <span className="text-gray-500">IP:</span> {data.remoteAddress}
        </div>
      )}
    </div>
  );
}

// Custom node types mapping
const nodeTypes = {
  session: SessionNode,
  beacon: SessionNode,
  server: SessionNode,
};

interface NetworkTopologyProps {
  className?: string;
}

export function NetworkTopology({ className }: NetworkTopologyProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Fetch sessions and beacons to build topology
  const { data: sessionsData, isLoading: sessionsLoading, refetch: refetchSessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.getSessions(),
    refetchInterval: 10000,
  });

  const { data: beaconsData, isLoading: beaconsLoading, refetch: refetchBeacons } = useQuery({
    queryKey: ['beacons'],
    queryFn: () => api.getBeacons(),
    refetchInterval: 10000,
  });

  // Build topology from sessions and beacons
  const buildTopology = useCallback(() => {
    const sessions = sessionsData?.sessions || [];
    const beacons = beaconsData?.beacons || [];

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // Add server node at center
    newNodes.push({
      id: 'server',
      type: 'server',
      position: { x: 400, y: 50 },
      data: {
        type: 'server',
        label: 'Sliver Server',
        isOperator: true,
      },
    });

    // Position sessions in a semi-circle below the server
    const sessionCount = sessions.length;
    const beaconCount = beacons.length;
    const totalCount = sessionCount + beaconCount;

    if (totalCount > 0) {
      const radius = 300;
      const startAngle = Math.PI * 0.2;
      const endAngle = Math.PI * 0.8;
      const angleStep = totalCount > 1 ? (endAngle - startAngle) / (totalCount - 1) : 0;

      // Add session nodes
      sessions.forEach((session: Session, index: number) => {
        const angle = startAngle + angleStep * index;
        const x = 400 + radius * Math.cos(angle);
        const y = 200 + radius * Math.sin(angle);

        newNodes.push({
          id: session.id,
          type: 'session',
          position: { x, y },
          data: {
            type: 'session',
            label: session.name || session.id.slice(0, 8),
            hostname: session.hostname,
            username: session.username,
            os: session.os,
            arch: session.arch,
            transport: session.transport,
            remoteAddress: session.remoteAddress,
            isDead: session.isDead,
          },
        });

        // Add edge from server to session
        newEdges.push({
          id: `server-${session.id}`,
          source: 'server',
          target: session.id,
          type: 'smoothstep',
          animated: !session.isDead,
          style: {
            stroke: session.isDead ? '#6b7280' : '#22c55e',
            strokeWidth: 2,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: session.isDead ? '#6b7280' : '#22c55e',
          },
        });
      });

      // Add beacon nodes
      beacons.forEach((beacon: Beacon, index: number) => {
        const angle = startAngle + angleStep * (sessionCount + index);
        const x = 400 + radius * Math.cos(angle);
        const y = 200 + radius * Math.sin(angle);

        newNodes.push({
          id: beacon.id,
          type: 'beacon',
          position: { x, y },
          data: {
            type: 'beacon',
            label: beacon.name || beacon.id.slice(0, 8),
            hostname: beacon.hostname,
            username: beacon.username,
            os: beacon.os,
            arch: beacon.arch,
            transport: beacon.transport,
            remoteAddress: beacon.remoteAddress,
            isDead: beacon.isDead,
          },
        });

        // Add edge from server to beacon
        newEdges.push({
          id: `server-${beacon.id}`,
          source: 'server',
          target: beacon.id,
          type: 'smoothstep',
          animated: !beacon.isDead,
          style: {
            stroke: beacon.isDead ? '#6b7280' : '#3b82f6',
            strokeWidth: 2,
            strokeDasharray: '5 5',
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: beacon.isDead ? '#6b7280' : '#3b82f6',
          },
        });
      });
    }

    setNodes(newNodes);
    setEdges(newEdges);
  }, [sessionsData, beaconsData, setNodes, setEdges]);

  // Rebuild topology when data changes
  useEffect(() => {
    buildTopology();
  }, [buildTopology]);

  const handleRefresh = useCallback(() => {
    refetchSessions();
    refetchBeacons();
  }, [refetchSessions, refetchBeacons]);

  const isLoading = sessionsLoading || beaconsLoading;
  const sessions = sessionsData?.sessions || [];
  const beacons = beaconsData?.beacons || [];

  const stats = useMemo(() => ({
    totalSessions: sessions.length,
    activeSessions: sessions.filter((s: Session) => !s.isDead).length,
    totalBeacons: beacons.length,
    activeBeacons: beacons.filter((b: Beacon) => !b.isDead).length,
  }), [sessions, beacons]);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="text-xl font-semibold">Network Topology</h2>
          <p className="text-sm text-muted-foreground">
            Visual representation of connected implants
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Stats */}
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-1">
              <Monitor className="h-3 w-3" />
              {stats.activeSessions}/{stats.totalSessions} Sessions
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Radio className="h-3 w-3" />
              {stats.activeBeacons}/{stats.totalBeacons} Beacons
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Topology Graph */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
          fitViewOptions={{
            padding: 0.2,
          }}
          defaultEdgeOptions={{
            type: 'smoothstep',
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#374151" gap={20} />
          <Controls
            className="bg-gray-800 border-gray-700"
            showZoom={true}
            showFitView={true}
            showInteractive={false}
          />
          <MiniMap
            className="bg-gray-800 border-gray-700"
            nodeColor={(node) => {
              if (node.type === 'server') return '#a855f7';
              if (node.type === 'beacon') return '#3b82f6';
              return '#22c55e';
            }}
            maskColor="rgba(0, 0, 0, 0.8)"
          />

          {/* Legend Panel */}
          <Panel position="bottom-left" className="bg-gray-800/90 p-3 rounded-lg border border-gray-700">
            <div className="text-xs text-gray-400 mb-2 font-medium">Legend</div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded bg-purple-500" />
                <span className="text-gray-300">Server</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span className="text-gray-300">Session (Interactive)</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded bg-blue-500" />
                <span className="text-gray-300">Beacon (Async)</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded bg-gray-500" />
                <span className="text-gray-300">Dead/Inactive</span>
              </div>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}
