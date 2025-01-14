import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactFlow, { 
  Background, 
  Controls,
  Node,
  Edge,
  Connection,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  NodeChange,
  EdgeChange,
  useNodesState,
  useEdgesState,
  Panel,
  MarkerType,
  Handle,
  Position,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAgents, useCreateCrew, useUpdateCrew, useCrew, useAddAgentToCrew, useRemoveAgentFromCrew, useExecuteCrew } from '@/lib/api/hooks'
import { Agent, Crew, ProcessType } from '@/lib/api/types'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { CrewExecutionStatus } from '@/components/crew/CrewExecutionStatus'
import { toast } from 'sonner'

type CrewFormData = Omit<Crew, 'id' | 'created_at' | 'updated_at'> & {
  agents: Agent[]
}

const nodeTypes = {
  agent: AgentNode,
}

function AgentNode({ data }: { data: Agent }) {
  const hasTools = data.tools.length > 0
  const hasValidConfig = data.role && data.goal && data.backstory

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className="w-4 h-4 !bg-muted-foreground"
      />
      <div className="px-4 py-2 shadow-md rounded-md bg-white border group hover:shadow-lg transition-all">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between drag-handle cursor-move">
            <div className="font-bold">{data.name}</div>
            <div className="flex gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    {hasTools ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-500" />
                    )}
                  </TooltipTrigger>
                  <TooltipContent>
                    {hasTools ? 'Tools configured' : 'No tools configured'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    {hasValidConfig ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-500" />
                    )}
                  </TooltipTrigger>
                  <TooltipContent>
                    {hasValidConfig ? 'Valid configuration' : 'Missing required fields'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">{data.role}</div>
          <div className="hidden group-hover:flex flex-wrap gap-1">
            {data.tools.map((tool) => (
              <Badge key={tool} variant="secondary" className="text-xs">
                {tool}
              </Badge>
            ))}
          </div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-4 h-4 !bg-muted-foreground"
      />
    </>
  )
}

type CrewEditorProps = {
  crewId?: string
}

export default function CrewEditor() {
  const { id: crewId } = useParams()
  const navigate = useNavigate()
  const [formData, setFormData] = useState<CrewFormData>({
    name: '',
    description: '',
    process_type: ProcessType.SEQUENTIAL,
    agents: [],
    tasks: [],
    memory: true,
    verbose: true,
    max_rpm: 10,
  })

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const { data: existingCrew, isLoading } = useCrew(crewId)
  const { data: agents = [] } = useAgents()
  const createCrew = useCreateCrew()
  const updateCrew = useUpdateCrew()
  const addAgentToCrew = useAddAgentToCrew()
  const removeAgentFromCrew = useRemoveAgentFromCrew()
  const executeCrew = useExecuteCrew()
  const [isExecuting, setIsExecuting] = useState(false)

  useEffect(() => {
    if (crewId && existingCrew) {
      const { id, created_at, updated_at, ...editableFields } = existingCrew
      setFormData(editableFields)
      
      // Set up nodes for existing agents
      const newNodes = editableFields.agents.map((agent, index) => ({
        id: agent.id,
        type: 'agent',
        position: { x: 100 + index * 200, y: 100 },
        data: agent,
        dragHandle: '.drag-handle',
      }))
      setNodes(newNodes)

      // If process type is hierarchical, set up edges based on agent order
      if (editableFields.process_type === ProcessType.HIERARCHICAL) {
        const newEdges = editableFields.agents.slice(0, -1).map((agent, index) => ({
          id: `${agent.id}-${editableFields.agents[index + 1].id}`,
          source: agent.id,
          target: editableFields.agents[index + 1].id,
          type: 'smoothstep',
          animated: true,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
          },
          style: { strokeWidth: 2 },
        }))
        setEdges(newEdges)
      } else {
        // Clear edges for sequential process
        setEdges([])
      }
    }
  }, [crewId, existingCrew])

  // Update edges when process type changes
  useEffect(() => {
    if (formData.process_type === ProcessType.SEQUENTIAL) {
      // Clear edges for sequential process
      setEdges([])
    } else if (formData.process_type === ProcessType.HIERARCHICAL && nodes.length > 1) {
      // Create default hierarchical edges if none exist
      if (edges.length === 0) {
        const newEdges = nodes.slice(0, -1).map((node, index) => ({
          id: `${node.id}-${nodes[index + 1].id}`,
          source: node.id,
          target: nodes[index + 1].id,
          type: 'smoothstep',
          animated: true,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
          },
          style: { strokeWidth: 2 },
        }))
        setEdges(newEdges)
      }
    }
  }, [formData.process_type, nodes])

  const onConnect = useCallback(
    async (params: Connection) => {
      // Only allow connections if process type is hierarchical
      if (formData.process_type !== ProcessType.HIERARCHICAL) {
        return
      }

      const newEdge = {
        ...params,
        id: `${params.source}-${params.target}`,
        type: 'smoothstep',
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
        },
        style: { strokeWidth: 2 },
      }
      setEdges((eds) => addEdge(newEdge, eds))
    },
    [setEdges, formData.process_type]
  )

  const onEdgesDelete = useCallback(
    (edgesToDelete: Edge[]) => {
      setEdges((eds) => eds.filter(e => !edgesToDelete.some(del => del.id === e.id)))
    },
    [setEdges]
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault()

      const agentId = event.dataTransfer.getData('application/reactflow')
      const agent = agents.find(a => a.id === agentId)

      if (!agent) return

      // Get the position of the drop
      const reactFlowBounds = document.querySelector('.react-flow')?.getBoundingClientRect()
      const position = reactFlowBounds ? {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top
      } : { x: 0, y: 0 }

      const newNode: Node = {
        id: agent.id,
        type: 'agent',
        position,
        data: agent,
        dragHandle: '.drag-handle',
      }

      // If we're editing an existing crew, add the agent through the API
      if (crewId) {
        try {
          await addAgentToCrew.mutateAsync({ crewId, agentId: agent.id })
          setNodes((nds) => nds.concat(newNode))
          setFormData(prev => ({
            ...prev,
            agents: [...prev.agents, agent]
          }))
        } catch (error) {
          console.error('Failed to add agent to crew:', error)
        }
      } else {
        // For new crews, just update the local state
        setNodes((nds) => nds.concat(newNode))
        setFormData(prev => ({
          ...prev,
          agents: [...prev.agents, agent]
        }))
      }
    },
    [agents, setNodes, crewId, addAgentToCrew]
  )

  const onNodesDelete = useCallback(
    async (nodesToDelete: Node[]) => {
      if (!crewId) {
        // For new crews, just update local state
        setFormData(prev => ({
          ...prev,
          agents: prev.agents.filter(agent => 
            !nodesToDelete.some(node => node.id === agent.id)
          )
        }))
        // Also remove any edges connected to deleted nodes
        setEdges(eds => 
          eds.filter(edge => 
            !nodesToDelete.some(node => 
              node.id === edge.source || node.id === edge.target
            )
          )
        )
        return
      }

      // For existing crews, remove agents through the API
      try {
        for (const node of nodesToDelete) {
          await removeAgentFromCrew.mutateAsync({
            crewId,
            agentId: node.id
          })
        }
        
        setFormData(prev => ({
          ...prev,
          agents: prev.agents.filter(agent => 
            !nodesToDelete.some(node => node.id === agent.id)
          )
        }))
        // Also remove any edges connected to deleted nodes
        setEdges(eds => 
          eds.filter(edge => 
            !nodesToDelete.some(node => 
              node.id === edge.source || node.id === edge.target
            )
          )
        )
      } catch (error) {
        console.error('Failed to remove agents from crew:', error)
      }
    },
    [crewId, removeAgentFromCrew, setEdges]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (crewId) {
        // For existing crews, we only need to update the crew details
        // since agents are added/removed through separate endpoints
        const { agents: _, ...crewUpdate } = formData
        await updateCrew.mutateAsync({ id: crewId, crew: crewUpdate })
      } else {
        // For new crews, create the crew first
        const { agents: _, ...crewCreate } = formData
        const newCrew = await createCrew.mutateAsync(crewCreate)
        
        // Then add each agent
        for (const agent of formData.agents) {
          await addAgentToCrew.mutateAsync({ 
            crewId: newCrew.id, 
            agentId: agent.id 
          })
        }
      }
      
      // Navigate to crews list after successful operation
      navigate('/crews')
    } catch (error) {
      console.error('Failed to save crew:', error)
    }
  } 

  const handleExecute = async () => {
    if (!crewId) return
    
    try {
      setIsExecuting(true)
      await executeCrew.mutateAsync(crewId)
      toast.success('Crew execution started')
    } catch (error) {
      toast.error('Failed to start crew execution')
      setIsExecuting(false)
    }
  }

  const handleStatusChange = (status: any) => {
    if (status.status === 'completed' || status.status === 'failed') {
      setIsExecuting(false)
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">
          {crewId ? 'Edit Crew' : 'Create Crew'}
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/crews')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="crew-form"
            disabled={isLoading}
          >
            {crewId ? 'Update' : 'Create'}
          </Button>
          {crewId && (
            <Button
              variant="default"
              onClick={handleExecute}
              disabled={isExecuting || !formData.agents.length}
            >
              {isExecuting ? 'Executing...' : 'Execute Crew'}
            </Button>
          )}
        </div>
      </div>

      {crewId && isExecuting && (
        <CrewExecutionStatus
          crewId={crewId}
          onStatusChange={handleStatusChange}
        />
      )}

      <div className="grid grid-cols-3 gap-4">
        {/* Form Panel */}
        <div className="space-y-4">
          <form id="crew-form" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Crew name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Crew description"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="process_type">Process Type</Label>
              <Select 
                value={formData.process_type} 
                onValueChange={(value: ProcessType) => 
                  setFormData({ ...formData, process_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select process type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sequential">Sequential</SelectItem>
                  <SelectItem value="hierarchical">Hierarchical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="memory">Enable Memory</Label>
                <Switch
                  id="memory"
                  checked={formData.memory}
                  onCheckedChange={(checked) => setFormData({ ...formData, memory: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="verbose">Verbose Mode</Label>
                <Switch
                  id="verbose"
                  checked={formData.verbose}
                  onCheckedChange={(checked) => setFormData({ ...formData, verbose: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_rpm">Max RPM</Label>
                <Input
                  id="max_rpm"
                  type="number"
                  min={1}
                  value={formData.max_rpm}
                  onChange={(e) => setFormData({ ...formData, max_rpm: parseInt(e.target.value) })}
                  required
                />
              </div>
            </div>
          </form>

          <div className="space-y-2">
            <Label>Available Agents</Label>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/reactflow', agent.id)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  className="p-2 border rounded cursor-move hover:bg-gray-50"
                >
                  <div className="font-medium">{agent.name}</div>
                  <div className="text-sm text-gray-500">{agent.role}</div>
                </div>
              ))}
            </div>
          </div>

          <Button type="submit" form="crew-form" className="w-full">
            {crewId ? 'Update' : 'Create'}
          </Button>
        </div>

        {/* Flow Editor */}
        <div className="col-span-2 h-[600px] border rounded-lg">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onNodesDelete={onNodesDelete}
            onEdgesDelete={onEdgesDelete}
            nodeTypes={nodeTypes}
            fitView
            deleteKeyCode={['Backspace', 'Delete']}
            snapToGrid={true}
            snapGrid={[15, 15]}
          >
            <Background />
            <Controls />
            <Panel position="top-right" className="space-y-2">
              <div className="text-sm text-muted-foreground">
                {formData.process_type === ProcessType.HIERARCHICAL ? 
                  'Connect agents by dragging from one node handle to another' : 
                  'Sequential process - agents will execute in order'
                }
              </div>
              <Button
                onClick={() => {
                  setNodes([])
                  setEdges([])
                  setFormData(prev => ({ ...prev, agents: [] }))
                }}
                variant="outline"
                size="sm"
              >
                Clear Flow
              </Button>
            </Panel>
          </ReactFlow>
        </div>
      </div>
    </div>
  )
} 