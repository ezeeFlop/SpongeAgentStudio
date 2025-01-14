import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, Clock, Network, ListTodo, Zap } from 'lucide-react'
import { useCrews, useTasks } from '@/lib/api/hooks'
import { TaskStatus } from '@/lib/api/types'
import { useState, useEffect } from 'react'
import { CrewExecutionStatus } from '@/components/crew/CrewExecutionStatus'

export default function Monitoring() {
  const { data: crews = [] } = useCrews()
  const { data: tasks = [] } = useTasks()
  const [activeExecutions, setActiveExecutions] = useState<Set<string>>(new Set())
  const [executionStats, setExecutionStats] = useState({
    completed: 0,
    failed: 0,
    inProgress: 0
  })

  const activeCrews = crews.filter(crew => crew.agents.length > 0)
  const completedTasks = tasks.filter(task => task.status === TaskStatus.COMPLETED)
  const inProgressTasks = tasks.filter(task => task.status === TaskStatus.IN_PROGRESS)
  const failedTasks = tasks.filter(task => task.status === TaskStatus.FAILED)

  const stats = [
    {
      name: 'Active Crews',
      value: activeExecutions.size,
      icon: Network,
      change: `${activeExecutions.size} running`,
      changeType: 'secondary' as const,
    },
    {
      name: 'Total Tasks',
      value: tasks.length,
      icon: ListTodo,
      change: `${inProgressTasks.length} in progress`,
      changeType: 'secondary' as const,
    },
    {
      name: 'Completed Tasks',
      value: completedTasks.length + executionStats.completed,
      icon: Zap,
      change: `+${executionStats.completed} today`,
      changeType: 'default' as const,
    },
    {
      name: 'Failed Tasks',
      value: failedTasks.length + executionStats.failed,
      icon: Activity,
      change: `${executionStats.failed} today`,
      changeType: 'destructive' as const,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Monitoring (WIP)</h1>
        <Badge variant="outline" className="text-sm">
          <Clock className="h-3 w-3 mr-1" />
          Real-time updates
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <stat.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-sm font-medium text-muted-foreground">
                    {stat.name}
                  </div>
                </div>
                <Badge variant={stat.changeType} className="text-xs">
                  {stat.change}
                </Badge>
              </div>
              <div className="mt-4 text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Active Crews */}
        <Card className="col-span-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Network className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Active Crews</h2>
            </div>
            <div className="space-y-4">
              {activeCrews.map((crew) => (
                <div key={crew.id}>
                  <CrewExecutionStatus 
                    crewId={crew.id} 
                    onStatusChange={(status) => {
                      if (status.status === 'running') {
                        setActiveExecutions(prev => new Set([...prev, crew.id]))
                      } else if (status.status === 'completed' || status.status === 'failed') {
                        setActiveExecutions(prev => {
                          const newSet = new Set(prev)
                          newSet.delete(crew.id)
                          return newSet
                        })
                        setExecutionStats(prev => ({
                          ...prev,
                          [status.status]: prev[status.status as keyof typeof prev] + 1
                        }))
                      }
                    }}
                  />
                </div>
              ))}
              {activeCrews.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No active crews
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Tasks */}
        <Card className="col-span-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <ListTodo className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Recent Tasks</h2>
            </div>
            <div className="space-y-4">
              {inProgressTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">{task.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {task.agent?.name}
                    </div>
                  </div>
                  <Badge>In Progress</Badge>
                </div>
              ))}
              {inProgressTasks.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No tasks in progress
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 