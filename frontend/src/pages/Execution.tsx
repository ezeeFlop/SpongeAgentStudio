import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Play, StopCircle, Terminal, Copy, Check } from 'lucide-react'
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
  const [hasCopied, setHasCopied] = useState(false);

  const { data: crews = [] } = useCrews()
  const { data: tasks = [] } = useTasks()
  const { data: variables = [] } = useCrewVariables(crewId)
  const executeCrew = useExecuteCrew()
  const { 
    status: executionStatus, 
    error: wsError, 
    logs,
    messages,
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
      // Get the latest execution state from messages
      const latestMessage = messages[messages.length - 1];
      const executionState = latestMessage?.payload.data?.execution_state;
      const currentAgent = executionState?.current_agent_name;
      const agentStates = executionState?.agent_states || {};

      // Debug logs
      console.log('Latest message:', latestMessage);
      console.log('Execution state:', executionState);
      console.log('Current agent:', currentAgent);
      console.log('Agent states:', agentStates);

      const nodes = [
        {
          id: crew.id,
          label: crew.name,
          type: 'crew',
          status: executionStatus?.status || 'pending',
          x: 300,
          y: 100,
        },
        ...crew.agents.map((agent, index) => {
          const agentState = agentStates[agent.name];
          console.log(`Agent ${agent.name} state:`, agentState);
          return {
            id: agent.id,
            label: agent.name,
            type: 'agent',
            status: agentState || 'pending',
            isActive: currentAgent === agent.name,
            x: 150 + index * 300,
            y: 250,
          };
        }),
      ]

      const edges = crew.agents.map((agent) => ({
        id: `${crew.id}-${agent.id}`,
        source: crew.id,
        target: agent.id,
      }))

      setExecutionNodes(nodes)
      setExecutionEdges(edges)
    }
  }, [crew, executionStatus, messages])

  // Get the latest result from messages
  const latestMessage = messages[messages.length - 1];
  const result = latestMessage?.payload.data?.result;
  const executionTime = latestMessage?.payload.data?.execution_time;

  // Add copy function
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000); // Reset after 2 seconds
      toast.success('Copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

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

        {/* New Result Panel */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  result.status === 'completed' ? 'bg-green-500' : 
                  result.status === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                }`} />
                Crew Result
                {executionTime && (
                  <span className="text-sm font-normal text-muted-foreground ml-auto">
                    Execution time: {executionTime.toFixed(2)}s
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Execution Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium mb-2">Execution Details</h4>
                    <dl className="space-y-1">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Status:</dt>
                        <dd>
                          <Badge variant="outline">{latestMessage.payload.data?.result?.status}</Badge>
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Start Time:</dt>
                        <dd>{latestMessage.payload.data?.result?.start_time ? new Date(latestMessage.payload.data.result.start_time).toLocaleString() : '-'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">End Time:</dt>
                        <dd>{latestMessage.payload.data?.result?.end_time ? new Date(latestMessage.payload.data.result.end_time).toLocaleString() : '-'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Duration:</dt>
                        <dd>{latestMessage.payload.data?.result?.execution_time ? `${latestMessage.payload.data.result.execution_time.toFixed(2)}s` : '-'}</dd>
                      </div>
                    </dl>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Input Parameters</h4>
                    <div className="bg-secondary rounded-lg p-3">
                      <pre className="text-xs whitespace-pre-wrap">
                        {JSON.stringify(latestMessage.payload.data?.result?.output.inputs || {}, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>

                {result.error ? (
                  <div className="text-red-500 p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
                    {result.error}
                  </div>
                ) : (
                  <>
                    {/* Raw Output */}
                    {result.output.raw && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Final Output</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => copyToClipboard(result.output.raw)}
                          >
                            {hasCopied ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <pre className="bg-secondary p-4 rounded-lg whitespace-pre-wrap text-sm">
                          {result.output.raw}
                        </pre>
                      </div>
                    )}

                    {/* Task Results */}
                    <div className="space-y-4">
                      <h4 className="font-medium">Task Executions</h4>
                      {Object.entries(result.output.tasks).map(([taskDesc, task]) => {
                        // Create a shortened title from the task description
                        const taskTitle = taskDesc
                          .trim()
                          .split('\n')[0]  // Get first line
                          .slice(0, 60)    // Limit length
                          .trim()          // Remove extra spaces
                          + (taskDesc.length > 60 ? '...' : '');

                        return (
                          <div key={taskDesc} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <h5 className="font-medium text-sm">{taskTitle}</h5>
                                <div className="text-xs text-muted-foreground">Agent: {task.output.agent}</div>
                              </div>
                              <Badge variant={
                                task.status === 'completed' ? 'secondary' : 
                                task.output.raw ? 'secondary' : 'outline'
                              }>
                                {task.status || (task.output.raw ? 'completed' : 'pending')}
                              </Badge>
                            </div>
                            
                            <div className="space-y-2">
                              <div>
                                <div className="text-xs font-medium text-muted-foreground mb-1">Description</div>
                                <p className="text-sm">{task.description}</p>
                              </div>
                              
                              <div>
                                <div className="text-xs font-medium text-muted-foreground mb-1">Expected Output</div>
                                <p className="text-sm">{task.output.expected_output}</p>
                              </div>

                              {task.output.raw && (
                                <div>
                                  <div className="text-xs font-medium text-muted-foreground mb-1">Actual Output</div>
                                  <pre className="bg-secondary p-3 rounded-lg whitespace-pre-wrap text-sm">
                                    {task.output.raw}
                                  </pre>
                                </div>
                              )}

                              {task.output.summary && (
                                <div>
                                  <div className="text-xs font-medium text-muted-foreground mb-1">Summary</div>
                                  <p className="text-sm">{task.output.summary}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
} 