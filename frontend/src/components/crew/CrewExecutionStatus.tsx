import { Badge } from '@/components/ui/badge'
import { useCrewWebSocket } from '@/lib/api/hooks'
import { useCrews } from '@/lib/api/hooks'
import { useEffect } from 'react'

interface CrewExecutionStatusProps {
  crewId: string
  onStatusChange: (status: { status: string; message: string }) => void
}

export function CrewExecutionStatus({ crewId, onStatusChange }: CrewExecutionStatusProps) {
  const { data: crews = [] } = useCrews()
  const { status: executionStatus, error: wsError } = useCrewWebSocket(crewId)
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
        {!wsError && executionStatus?.status === 'running' && (
          <div className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        )}
      </div>
    </div>
  )
} 