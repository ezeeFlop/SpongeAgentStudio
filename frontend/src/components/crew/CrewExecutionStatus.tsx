import { Badge } from '@/components/ui/badge'
import { useCrewWebSocket } from '@/lib/api/hooks'
import { useCrews } from '@/lib/api/hooks'
import { useEffect } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'

interface CrewExecutionStatusProps {
  crewId: string
  onStatusChange: (status: { status: string; message: string }) => void
}

export function CrewExecutionStatus({ crewId, onStatusChange }: CrewExecutionStatusProps) {
  const { data: crews = [] } = useCrews()
  const { 
    status: executionStatus, 
    error: wsError, 
    isConnecting,
    isConnected 
  } = useCrewWebSocket(crewId)
  
  const crew = crews.find(c => c.id === crewId)
  
  useEffect(() => {
    if (executionStatus) {
      onStatusChange(executionStatus)
    }
  }, [executionStatus, onStatusChange])

  if (!crew) return null

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div>
        <div className="font-medium">{crew.name}</div>
        <div className="text-sm text-muted-foreground">
          {crew.agents.length} agents
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline">
          {crew.process_type}
        </Badge>
        
        {isConnecting && (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Connecting...</span>
          </div>
        )}
        
        {wsError && (
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Connection error</span>
          </div>
        )}
        
        {isConnected && !wsError && executionStatus?.status === 'running' && (
          <div className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        )}
      </div>
    </div>
  )
} 