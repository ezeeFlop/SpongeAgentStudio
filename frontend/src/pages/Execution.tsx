import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Play, StopCircle, Terminal } from 'lucide-react'
import { useCrews, useTasks, useExecuteCrew, useCrewVariables, useCrewWebSocket } from '@/lib/api/hooks'
import ExecutionGraph from '@/components/execution/ExecutionGraph'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function Execution() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const crewIdParam = searchParams.get('crew')
  const crewId = crewIdParam || undefined
  const [executionNodes, setExecutionNodes] = useState<any[]>([])
  const [executionEdges, setExecutionEdges] = useState<any[]>([])
  const [inputs, setInputs] = useState<Record<string, string>>({})

  const { data: crews = [] } = useCrews()
  const { data: tasks = [] } = useTasks()
  const { data: variables = [] } = useCrewVariables(crewId)
  const executeCrew = useExecuteCrew()
  const { 
    status: executionStatus, 
    error: wsError, 
    logs,
    isConnected 
  } = useCrewWebSocket(crewId)

  const crew = crews.find(c => c.id === crewId)
  const isRunning = executionStatus?.status === 'running'

  // Initialize inputs when variables change
  useEffect(() => {
    if (variables && variables.length > 0) {
      setInputs(prev => {
        const newInputs = { ...prev }
        variables.forEach(variable => {
          if (!(variable in newInputs)) {
            newInputs[variable] = ''
          }
        })
        return newInputs
      })
    }
  }, [variables])

  const handleCrewSelect = (selectedCrewId: string) => {
    navigate(`/execution?crew=${selectedCrewId}`)
    setInputs({})
  }

  const handleStart = async () => {
    if (!crewId) return
    
    // Validate all inputs are filled
    const missingInputs = variables.filter(v => !inputs[v])
    if (missingInputs.length > 0) {
      toast.error(`Please fill in all required inputs: ${missingInputs.join(', ')}`)
      return
    }

    try {
      await executeCrew.mutateAsync({
        crewId,
        inputs
      })
      toast.success('Crew execution started')
    } catch (error) {
      toast.error('Failed to start crew execution')
    }
  }

  const handleStop = () => {
    toast.error('Stop functionality not implemented in the engine')
  }

  useEffect(() => {
    if (crew) {
      const nodes = [
        {
          id: crew.id,
          label: crew.name,
          type: 'crew',
          status: executionStatus?.status || 'pending',
          x: 300,
          y: 100,
        },
        ...crew.agents.map((agent, index) => ({
          id: agent.id,
          label: agent.name,
          type: 'agent',
          status: executionStatus?.status || 'pending',
          x: 150 + index * 300,
          y: 250,
        })),
      ]

      const edges = crew.agents.map((agent) => ({
        id: `${crew.id}-${agent.id}`,
        source: crew.id,
        target: agent.id,
      }))

      setExecutionNodes(nodes)
      setExecutionEdges(edges)
    }
  }, [crew, executionStatus])

  if (!crew) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-2xl font-bold mb-4">Select a Crew to Execute</h2>
            <div className="flex gap-4 items-center">
              <Select onValueChange={handleCrewSelect}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Select a crew" />
                </SelectTrigger>
                <SelectContent>
                  {crews.map((crew) => (
                    <SelectItem key={crew.id} value={crew.id}>
                      {crew.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">
                Executing Crew: {crew?.name}
              </h2>
              <div className="flex gap-4 items-center">
                <div className="grid gap-4">
                  {variables.map((variable: string) => (
                    <div key={variable} className="flex flex-col gap-2">
                      <Label htmlFor={variable}>{variable}</Label>
                      <Input
                        id={variable}
                        value={inputs[variable] || ''}
                        onChange={(e) => setInputs(prev => ({
                          ...prev,
                          [variable]: e.target.value
                        }))}
                        placeholder={`Enter value for ${variable}...`}
                        className="w-[300px]"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Badge variant={isConnected ? "secondary" : "destructive"}>
                    {isConnected ? "Connected" : "Disconnected"}
                  </Badge>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleStart}
                    disabled={!isConnected || isRunning || Object.values(inputs).some(v => !v)}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleStop}
                    disabled={!isConnected || !isRunning}
                  >
                    <StopCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <ExecutionGraph nodes={executionNodes} edges={executionEdges} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Terminal className="h-4 w-4" />
              <h3 className="text-lg font-semibold">Execution Logs</h3>
            </div>
            <div className="bg-secondary p-4 rounded-lg max-h-[300px] overflow-y-auto font-mono text-sm">
              {logs.map((log, index) => (
                <div key={index} className="py-1">
                  {log}
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-muted-foreground">No logs available</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 