import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useCreateTask, useAgents, useTasks, useUpdateTask, useTask } from '@/lib/api/hooks'
import type { Task } from '@/lib/api/types'
import ReactFlow, {
  Background,
  Controls,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  OnNodesDelete,
  OnEdgesDelete
} from 'reactflow'
import 'reactflow/dist/style.css'
import { toast } from 'sonner'

type TaskFormData = Omit<Task, 'id' | 'status' | 'output' | 'output_file' | 'created_at' | 'updated_at'>

const nodeTypes = {
  task: TaskNode,
}

function TaskNode({ data }: { data: Task }) {
  return (
    <Card className="w-[250px]">
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">{data.name}</h4>
            <Badge variant={data.status === 'completed' ? 'default' : 'secondary'}>
              {data.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{data.description}</p>
          {data.agent && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Assigned to:</span>
              <Badge variant="outline">{data.agent.name}</Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function TaskEditor() {
  const { id: taskId } = useParams()
  const navigate = useNavigate()
  const [formData, setFormData] = useState<TaskFormData>({
    name: '',
    description: '',
    agent_id: '',
    expected_output: '',
    dependencies: [],
    context: [],
    tools: [],
    async_mode: false,
    max_iterations: 5,
    max_rpm: 10
  })

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  const { data: agents = [] } = useAgents()
  const { data: tasks = [] } = useTasks()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const { data: existingTask, isLoading } = useTask(taskId)

  // Load existing task data and set up flow diagram
  useEffect(() => {
    if (taskId && existingTask) {
      const { id, status, output, output_file, created_at, updated_at, ...editableFields } = existingTask
      
      // Set form data
      setFormData({
        name: editableFields.name || '',
        description: editableFields.description || '',
        agent_id: editableFields.agent_id || '',
        expected_output: editableFields.expected_output || '',
        dependencies: editableFields.dependencies || [],
        context: Array.isArray(editableFields.context) ? editableFields.context : [],
        tools: editableFields.tools || [],
        async_mode: editableFields.async_mode || false,
        max_iterations: editableFields.max_iterations || 5,
        max_rpm: editableFields.max_rpm || 10,
      })

      // Set up nodes for dependencies
      const dependencyNodes = (editableFields.dependencies || []).map((depId, index) => {
        const task = tasks.find(t => t.id === depId)
        if (!task) return null
        return {
          id: task.id,
          type: 'task',
          position: { x: 100 + index * 200, y: 100 },
          data: task,
        }
      }).filter(Boolean) as Node[]

      setNodes(dependencyNodes)

      // Set up edges between dependency nodes
      if (dependencyNodes.length > 1) {
        const newEdges = dependencyNodes.slice(0, -1).map((node, index) => ({
          id: `e${node.id}-${dependencyNodes[index + 1].id}`,
          source: node.id,
          target: dependencyNodes[index + 1].id,
        }))
        setEdges(newEdges)
      } else {
        setEdges([])
      }
    }
  }, [taskId, existingTask, tasks])

  // Update context when dependencies change
  useEffect(() => {
    if (formData.dependencies.length > 0) {
      // Find all dependent tasks
      const dependentTasks = tasks.filter(t => formData.dependencies.includes(t.id))
      
      // Create context from dependent tasks' outputs and descriptions
      const context = dependentTasks.map(task => 
        `Task "${task.name}": ${task.output || 'Pending'}`
      )

      setFormData(prev => ({
        ...prev,
        context: context
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        context: []
      }))
    }
  }, [formData.dependencies, tasks])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (taskId) {
        await updateTask.mutateAsync({ id: taskId, task: formData })
        toast.success('Task updated successfully')
      } else {
        await createTask.mutateAsync(formData)
        toast.success('Task created successfully')
      }
      
      // Navigate to tasks list after successful operation
      navigate('/tasks')
    } catch (error) {
      console.error('Failed to save task:', error)
      toast.error('Failed to save task')
    }
  }

  const addDependency = (taskId: string) => {
    if (!formData.dependencies.includes(taskId)) {
      // Add dependency in sequential order
      setFormData(prev => ({
        ...prev,
        dependencies: [...prev.dependencies, taskId]
      }))

      const task = tasks.find(t => t.id === taskId)
      if (task) {
        // Calculate position for new node
        const position = {
          x: nodes.length > 0 ? nodes[nodes.length - 1].position.x + 250 : 100,
          y: 100
        }

        const newNode: Node = {
          id: task.id,
          type: 'task',
          position,
          data: task,
        }
        setNodes(nds => [...nds, newNode])

        // Add edge to create sequential flow
        if (nodes.length > 0) {
          const newEdge: Edge = {
            id: `e${nodes[nodes.length - 1].id}-${task.id}`,
            source: nodes[nodes.length - 1].id,
            target: task.id,
            type: 'smoothstep',
            animated: true,
          }
          setEdges(eds => [...eds, newEdge])
        }
      }
    }
  }

  // Handle node deletion
  const onNodesDelete: OnNodesDelete = (deleted) => {
    const deletedIds = deleted.map(node => node.id)
    
    // Remove deleted nodes from dependencies
    setFormData(prev => ({
      ...prev,
      dependencies: prev.dependencies.filter(id => !deletedIds.includes(id))
    }))

    // Reconnect remaining nodes to maintain sequential flow
    const remainingNodes = nodes.filter(node => !deletedIds.includes(node.id))
    if (remainingNodes.length > 1) {
      const newEdges = remainingNodes.slice(0, -1).map((node, index) => ({
        id: `e${node.id}-${remainingNodes[index + 1].id}`,
        source: node.id,
        target: remainingNodes[index + 1].id,
        type: 'smoothstep',
        animated: true,
      }))
      setEdges(newEdges)
    } else {
      setEdges([])
    }
  }

  // Handle edge deletion
  const onEdgesDelete: OnEdgesDelete = (deleted) => {
    // When an edge is deleted, we need to update the dependencies array
    // to maintain the correct order
    const remainingNodes = nodes.filter(node => 
      formData.dependencies.includes(node.id)
    )
    setFormData(prev => ({
      ...prev,
      dependencies: remainingNodes.map(node => node.id)
    }))
  }

  if (taskId && isLoading) {
    return <div className="flex items-center justify-center h-96">Loading task...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{taskId ? 'Edit Task' : 'Create Task'}</h1>
        <Button type="submit" form="task-form" disabled={isLoading}>
          {taskId ? 'Update' : 'Create'}
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Form Panel */}
        <div className="col-span-4">
          <form id="task-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Task name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Task description"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent">Assigned Agent</Label>
              <Select
                value={formData.agent_id}
                onValueChange={(value) => setFormData({ ...formData, agent_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name} - {agent.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expected_output">Expected Output</Label>
              <Textarea
                id="expected_output"
                value={formData.expected_output}
                onChange={(e) => setFormData({ ...formData, expected_output: e.target.value })}
                placeholder="What output do you expect from this task?"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="context">Context from Dependencies</Label>
              <Textarea
                id="context"
                value={formData.context.join('\n\n')}
                onChange={(e) => setFormData({ ...formData, context: e.target.value.split('\n\n') })}
                placeholder="Context will be automatically updated based on dependencies"
                className="h-32"
                disabled
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_iterations">Max Iterations</Label>
                <Input
                  id="max_iterations"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.max_iterations}
                  onChange={(e) => setFormData({ ...formData, max_iterations: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_rpm">Max RPM</Label>
                <Input
                  id="max_rpm"
                  type="number"
                  min="1"
                  max="60"
                  value={formData.max_rpm}
                  onChange={(e) => setFormData({ ...formData, max_rpm: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="async_mode"
                checked={formData.async_mode}
                onCheckedChange={(checked) => setFormData({ ...formData, async_mode: checked })}
              />
              <Label htmlFor="async_mode">Async Mode</Label>
            </div>
          </form>
        </div>

        {/* Dependencies Panel */}
        <div className="col-span-8">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">Task Dependencies</h3>
                    <p className="text-sm text-muted-foreground">Tasks will be executed in sequential order. Each task will have access to the output of its dependencies.</p>
                  </div>
                  <Select onValueChange={addDependency}>
                    <SelectTrigger>
                      <SelectValue placeholder="Add dependency" />
                    </SelectTrigger>
                    <SelectContent>
                      {tasks
                        .filter(t => t.id !== taskId && !formData.dependencies.includes(t.id))
                        .map((task) => (
                          <SelectItem key={task.id} value={task.id}>
                            {task.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div style={{ height: 400 }}>
                  <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodesDelete={onNodesDelete}
                    onEdgesDelete={onEdgesDelete}
                    nodeTypes={nodeTypes}
                    deleteKeyCode="Backspace"
                    fitView
                  >
                    <Background />
                    <Controls />
                  </ReactFlow>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 