import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ExecutionStateView from '@/components/execution/ExecutionState'

interface Variable {
  name: string
  value: string
}

export default function CrewExecutePage() {
  const router = useRouter()
  const { id: crewId } = router.query
  
  const [variables, setVariables] = useState<Variable[]>([])
  const [isExecuting, setIsExecuting] = useState(false)
  const [crew, setCrew] = useState<any>(null)

  useEffect(() => {
    if (!crewId) return

    // Fetch crew details
    fetch(`/api/v1/crews/${crewId}`)
      .then(res => res.json())
      .then(data => setCrew(data))

    // Fetch required variables
    fetch(`/api/v1/crews/${crewId}/variables`)
      .then(res => res.json())
      .then(data => {
        setVariables(data.map((name: string) => ({ name, value: '' })))
      })
  }, [crewId])

  const handleExecute = async () => {
    if (!crewId) return

    setIsExecuting(true)

    // Convert variables array to object
    const inputs = variables.reduce((acc, { name, value }) => ({
      ...acc,
      [name]: value
    }), {})

    try {
      await fetch(`/api/v1/crews/${crewId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs })
      })
    } catch (error) {
      console.error('Failed to execute crew:', error)
    }
  }

  if (!crew) return <div>Loading...</div>

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Execute Crew: {crew.name}</h1>
        
        {/* Variables input */}
        {variables.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Variables</h2>
            {variables.map(({ name, value }, index) => (
              <div key={name} className="space-y-2">
                <Label htmlFor={name}>{name}</Label>
                <Input
                  id={name}
                  value={value}
                  onChange={(e) => {
                    const newVariables = [...variables]
                    newVariables[index].value = e.target.value
                    setVariables(newVariables)
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Execute button */}
        <Button 
          onClick={handleExecute}
          disabled={isExecuting || variables.some(v => !v.value)}
        >
          {isExecuting ? 'Executing...' : 'Execute Crew'}
        </Button>
      </div>

      {/* Execution state visualization */}
      {isExecuting && crew && (
        <div className="h-[600px]">
          <ExecutionStateView
            crewId={crewId as string}
            agents={crew.agents}
            tasks={crew.tasks}
          />
        </div>
      )}
    </div>
  )
} 