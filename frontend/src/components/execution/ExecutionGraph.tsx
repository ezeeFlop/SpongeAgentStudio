import React from 'react';
import ReactFlow, { Node, Edge, Position } from 'reactflow';
import 'reactflow/dist/style.css';

interface ExecutionGraphProps {
  nodes: Array<{
    id: string;
    label: string;
    type: 'crew' | 'agent';
    status: string;
    isActive?: boolean;
    x: number;
    y: number;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
  }>;
}

function CustomNode({ data }: { data: any }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-500';
      case 'completed':
        return 'bg-blue-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className={`px-4 py-2 shadow-md rounded-md border-2 ${
      data.isActive ? 'border-blue-500 animate-pulse' : 'border-gray-200'
    } bg-white`}>
      <div className="flex items-center">
        <div className={`w-3 h-3 rounded-full mr-2 ${getStatusColor(data.status)}`} />
        <div>
          <div className="text-sm font-bold">{data.label}</div>
          <div className="text-xs text-gray-500">{data.type}</div>
        </div>
      </div>
    </div>
  );
}

export default function ExecutionGraph({ nodes, edges }: ExecutionGraphProps) {
  const flowNodes: Node[] = nodes.map((node) => ({
    id: node.id,
    position: { x: node.x, y: node.y },
    data: {
      label: node.label,
      type: node.type,
      status: node.status,
      isActive: node.isActive,
    },
    type: 'custom',
  }));

  const flowEdges: Edge[] = edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
  }));

  const nodeTypes = {
    custom: CustomNode,
  };

  return (
    <div style={{ height: 400 }}>
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
      />
    </div>
  );
} 