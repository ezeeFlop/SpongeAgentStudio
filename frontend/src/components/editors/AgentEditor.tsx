import { useState, useEffect } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { DraggableTool } from '@/components/common/DraggableTool'
import { ToolDropZone } from '@/components/common/ToolDropZone'
import { useAgent, useCreateAgent, useUpdateAgent, useTools } from '@/lib/api/hooks'
import type { Agent } from '@/lib/api/types'
import { useParams, useNavigate } from 'react-router-dom'

const EXPERTISE_LEVELS = ['beginner', 'intermediate', 'expert'] as const
const PROCESS_TYPES = ['sequential', 'hierarchical'] as const

type AgentFormData = Omit<Agent, 'id' | 'created_at' | 'updated_at'>

export default function AgentEditor() {
  const { id: agentId } = useParams()
  const navigate = useNavigate()
  const [formData, setFormData] = useState<AgentFormData>({
    name: '',
    role: '',
    goal: '',
    backstory: '',
    memory: true,
    verbose: true,
    allow_delegation: false,
    tools: [],
    max_iterations: 5,
    max_rpm: 10,
    async_mode: false,
    expertise_level: 'intermediate',
    process_type: 'sequential',
    custom_tools: null
  })

  const { data: existingAgent, isLoading: isLoadingAgent } = useAgent(agentId)
  const { data: availableTools = [], isLoading: isLoadingTools } = useTools()
  const createAgent = useCreateAgent()
  const updateAgent = useUpdateAgent()

  useEffect(() => {
    if (agentId && existingAgent) {
      const { id, created_at, updated_at, ...editableFields } = existingAgent
      setFormData({
        ...editableFields,
        expertise_level: editableFields.expertise_level as 'beginner' | 'intermediate' | 'expert',
        process_type: editableFields.process_type as 'sequential' | 'hierarchical'
      })
    }
  }, [agentId, existingAgent])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (agentId) {
        await updateAgent.mutateAsync({ id: agentId, agent: formData })
      } else {
        await createAgent.mutateAsync(formData)
      }

      navigate('/agents')
    } catch (error) {
      console.error('Failed to save agent:', error)
    }
  }

  const handleToolDrop = (toolName: string) => {
    if (!formData.tools.includes(toolName)) {
      setFormData(prev => ({
        ...prev,
        tools: [...prev.tools, toolName]
      }))
    }
  }

  const handleRemoveTool = (toolName: string) => {
    setFormData(prev => ({
      ...prev,
      tools: prev.tools.filter(t => t !== toolName)
    }))
  }

  const isLoading = isLoadingAgent || isLoadingTools

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">{agentId ? 'Edit Agent' : 'Create Agent'}</h1>
          <Button type="submit" form="agent-form" disabled={isLoading}>
            {agentId ? 'Update' : 'Create'}
          </Button>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Main Form */}
          <div className="col-span-12 lg:col-span-8 space-y-4">
            <form id="agent-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Agent name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="e.g., Research Assistant, Code Reviewer"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="goal">Goal</Label>
                <Textarea
                  id="goal"
                  value={formData.goal}
                  onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                  placeholder="What is the agent's goal?"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="backstory">Backstory</Label>
                <Textarea
                  id="backstory"
                  value={formData.backstory}
                  onChange={(e) => setFormData({ ...formData, backstory: e.target.value })}
                  placeholder="What is the agent's backstory?"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expertise_level">Expertise Level</Label>
                  <Select
                    value={formData.expertise_level}
                    onValueChange={(value: 'beginner' | 'intermediate' | 'expert') => 
                      setFormData({ ...formData, expertise_level: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select expertise level" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPERTISE_LEVELS.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="process_type">Process Type</Label>
                  <Select
                    value={formData.process_type}
                    onValueChange={(value: 'sequential' | 'hierarchical') => 
                      setFormData({ ...formData, process_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select process type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROCESS_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_iterations">Max Iterations</Label>
                  <Input
                    id="max_iterations"
                    type="number"
                    value={formData.max_iterations}
                    onChange={(e) => setFormData({ ...formData, max_iterations: parseInt(e.target.value) })}
                    min={1}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_rpm">Max RPM</Label>
                  <Input
                    id="max_rpm"
                    type="number"
                    value={formData.max_rpm}
                    onChange={(e) => setFormData({ ...formData, max_rpm: parseInt(e.target.value) })}
                    min={1}
                    required
                  />
                </div>
              </div>

              <div className="space-y-4">
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

                <div className="flex items-center justify-between">
                  <Label htmlFor="allow_delegation">Allow Delegation</Label>
                  <Switch
                    id="allow_delegation"
                    checked={formData.allow_delegation}
                    onCheckedChange={(checked) => setFormData({ ...formData, allow_delegation: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="async_mode">Async Mode</Label>
                  <Switch
                    id="async_mode"
                    checked={formData.async_mode}
                    onCheckedChange={(checked) => setFormData({ ...formData, async_mode: checked })}
                  />
                </div>
              </div>
            </form>

            {/* Selected Tools */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-4">Selected Tools</h3>
                <ToolDropZone
                  tools={formData.tools.map(name => ({
                    name,
                    description: availableTools.find(t => t.name === name)?.description || '',
                    type: availableTools.find(t => t.name === name)?.type || 'custom'
                  }))}
                  onRemove={handleRemoveTool}
                />
              </CardContent>
            </Card>
          </div>

          {/* Tools Panel */}
          <div className="col-span-12 lg:col-span-4">
            <div className="sticky top-4">
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-4">Available Tools</h3>
                  <div className="space-y-2 max-h-[calc(100vh-12rem)] overflow-y-auto">
                    {availableTools.map((tool) => (
                      <DraggableTool
                        key={tool.name}
                        tool={tool}
                        onDrop={() => handleToolDrop(tool.name)}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </DndProvider>
  )
} 