import React from 'react';
import ReactFlow, { Node, Edge, Position } from 'reactflow';
import 'reactflow/dist/style.css';

interface ExecutionGraphProps {
  nodes: Array<{
    id: string;
    label: string;
    type: 'crew' | 'agent' | 'task';
    status: string;
    isActive?: boolean;
    x: number;
    y: number;
    progress?: number;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    animated?: boolean;
  }>;
}

function CustomNode({ data }: { data: any }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
      case 'executing':
        return 'bg-green-500';
      case 'completed':
        return 'bg-blue-500';
      case 'error':
        return 'bg-red-500';
      case 'thinking':
        return 'bg-yellow-500';
      case 'waiting':
        return 'bg-purple-500';
      case 'delegating':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getNodeStyle = () => {
    switch (data.type) {
      case 'crew':
        return 'border-blue-300 bg-blue-50';
      case 'agent':
        return data.isActive ? 'border-green-500 bg-green-50 animate-pulse' : 'border-gray-300 bg-white';
      default:
        return 'border-gray-300 bg-white';
    }
  };

  return (
    <div className={`px-4 py-2 shadow-md rounded-md border-2 ${getNodeStyle()}`}>
      <div className="flex flex-col">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${getStatusColor(data.status)}`} />
          <div>
            <div className="text-sm font-bold">{data.label}</div>
            <div className="text-xs text-gray-500">{data.type}</div>
          </div>
        </div>

        {data.type === 'agent' && (
          <div className="mt-2 space-y-2">
            {/* Show tools */}
            {data.tools && data.tools.length > 0 && (
              <div className="text-xs">
                <div className="font-medium text-gray-500">Tools:</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {data.tools.map((tool: string) => (
                    <span 
                      key={tool}
                      className={`px-1.5 py-0.5 rounded text-xs ${
                        tool === data.currentTool 
                          ? 'bg-green-100 text-green-700 border border-green-300' 
                          : 'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Show tasks */}
            {data.tasks && data.tasks.length > 0 && (
              <div className="text-xs">
                <div className="font-medium text-gray-500">Tasks:</div>
                <div className="space-y-1 mt-1">
                  {data.tasks.map((task: any) => (
                    <div 
                      key={task.id}
                      className={`px-1.5 py-0.5 rounded text-xs ${
                        task.id === data.currentTaskId
                          ? 'bg-blue-100 text-blue-700 border border-blue-300'
                          : 'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}
                    >
                      {task.description.split('\n')[0].slice(0, 30)}...
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
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
      progress: node.progress,
    },
    type: 'custom',
  }));

  const flowEdges: Edge[] = edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    animated: edge.animated,
    style: { stroke: edge.animated ? '#10B981' : '#64748B' },
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