import { useEffect, useRef, useState } from 'react'
import { Card } from '@/components/ui/card'

type Node = {
  id: string
  label: string
  type: 'task' | 'agent'
  status: 'pending' | 'running' | 'completed' | 'failed'
  x: number
  y: number
}

type Edge = {
  id: string
  source: string
  target: string
}

type ExecutionGraphProps = {
  nodes: Node[]
  edges: Edge[]
  onNodeClick?: (nodeId: string) => void
}

const statusColors = {
  pending: '#FCD34D',
  running: '#60A5FA',
  completed: '#34D399',
  failed: '#EF4444',
}

export default function ExecutionGraph({ nodes, edges, onNodeClick }: ExecutionGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (svgRef.current) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect
          setDimensions({ width, height })
        }
      })

      observer.observe(svgRef.current.parentElement!)
      return () => observer.disconnect()
    }
  }, [])

  const nodeRadius = 30
  const fontSize = 12

  return (
    <Card className="w-full h-full min-h-[500px] p-4">
      <div className="w-full h-full">
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`0 0 ${Math.max(dimensions.width, 600)} ${Math.max(dimensions.height, 400)}`}
          className="overflow-visible"
        >
          {/* Draw edges */}
          {edges.map((edge) => {
            const source = nodes.find((n) => n.id === edge.source)
            const target = nodes.find((n) => n.id === edge.target)
            if (!source || !target) return null

            return (
              <line
                key={edge.id}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke="#94A3B8"
                strokeWidth={2}
                markerEnd="url(#arrowhead)"
              />
            )
          })}

          {/* Draw nodes */}
          {nodes.map((node) => (
            <g
              key={node.id}
              transform={`translate(${node.x},${node.y})`}
              onClick={() => onNodeClick?.(node.id)}
              className="cursor-pointer"
            >
              <circle
                r={nodeRadius}
                fill={statusColors[node.status]}
                className="transition-colors duration-200"
              />
              <text
                textAnchor="middle"
                dy="0.3em"
                fill="white"
                fontSize={fontSize}
                fontWeight="bold"
              >
                {node.label}
              </text>
            </g>
          ))}

          {/* Arrow marker definition */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#94A3B8" />
            </marker>
          </defs>
        </svg>
      </div>
    </Card>
  )
} 