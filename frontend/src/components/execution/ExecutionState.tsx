import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import ExecutionGraph from './ExecutionGraph'

type AgentState = 'idle' | 'thinking' | 'executing' | 'delegating' | 'waiting' | 'error'

interface ExecutionState {
  currentAgentId: string | null
  currentAgentName: string | null
  currentTaskId: string | null
  currentTaskName: string | null
  agentStates: Record<string, AgentState>  // agent_id -> state
  taskProgress: Record<string, number>      // task_id -> progress
  agentThoughts: Record<string, string>     // agent_id -> thought
}

interface Node {
  id: string
  label: string
  type: 'task' | 'agent'
  status: 'pending' | 'running' | 'completed' | 'failed'
  x: number
  y: number
}

interface Edge {
  id: string
  source: string
  target: string
}

interface ExecutionStateProps {
  crewId: string
  agents: Array<{ id: string; name: string }>
  tasks: Array<{ id: string; name: string; agentId: string }>
}

export default function ExecutionStateView({ crewId, agents, tasks }: ExecutionStateProps) {
  const [executionState, setExecutionState] = useState<ExecutionState>({
    currentAgentId: null,
    currentAgentName: null,
    currentTaskId: null,
    currentTaskName: null,
    agentStates: {},
    taskProgress: {},
    agentThoughts: {},
  })
  
  const [logs, setLogs] = useState<string[]>([])

  // Calculate node positions (you may want to use a proper graph layout algorithm)
  const nodes: Node[] = [
    // Agent nodes in a row at the top
    ...agents.map((agent, index) => ({
      id: agent.id,
      label: agent.name,
      type: 'agent' as const,
      status: getNodeStatus(agent.id, executionState),
      x: 100 + index * 200,
      y: 100,
    })),
    // Task nodes in a row below
    ...tasks.map((task, index) => ({
      id: task.id,
      label: task.name,
      type: 'task' as const,
      status: getTaskStatus(task.id, executionState),
      x: 100 + index * 200,
      y: 300,
    })),
  ]

  // Create edges from agents to their tasks
  const edges: Edge[] = tasks.map((task) => ({
    id: `${task.agentId}-${task.id}`,
    source: task.agentId,
    target: task.id,
  }))

  useEffect(() => {
    // Use relative URL for WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/v1/crews/${crewId}/ws`)

    // Connection state handling
    ws.onopen = () => {
      console.log('WebSocket connected')
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected')
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    ws.onmessage = (event) => {
      const update = JSON.parse(event.data)
      console.log('Received update:', update)
      
      // Update execution state
      if (update.execution_state) {
        setExecutionState(update.execution_state)
      }
      
      // Add log message
      setLogs(prev => [...prev, `${new Date().toISOString()} - ${update.message}`])
    }

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }
  }, [crewId])

  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      <div className="col-span-1">
        <ExecutionGraph 
          nodes={nodes} 
          edges={edges}
          onNodeClick={(nodeId) => {
            // Show agent thoughts or task details
            const thought = executionState.agentThoughts[nodeId]
            if (thought) {
              console.log('Agent thought:', thought)
            }
          }}
        />
      </div>
      <div className="col-span-1">
        <Card className="h-full p-4 overflow-auto">
          <h3 className="text-lg font-semibold mb-4">Execution Logs</h3>
          <div className="space-y-2">
            {logs.map((log, index) => (
              <div key={index} className="text-sm text-gray-600">
                {log}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function getNodeStatus(agentId: string, state: ExecutionState): Node['status'] {
  const agentState = state.agentStates[agentId]
  
  switch (agentState) {
    case 'thinking':
    case 'executing':
    case 'delegating':
      return 'running'
    case 'error':
      return 'failed'
    case 'idle':
      return 'completed'
    default:
      return 'pending'
  }
}

function getTaskStatus(taskId: string, state: ExecutionState): Node['status'] {
  const progress = state.taskProgress[taskId]
  
  if (progress === undefined) return 'pending'
  if (progress === 1) return 'completed'
  if (progress > 0) return 'running'
  return 'pending'
} 