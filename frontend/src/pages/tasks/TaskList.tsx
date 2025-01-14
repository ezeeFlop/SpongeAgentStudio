import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Trash } from 'lucide-react'
import { useTasks, useDeleteTask } from '@/lib/api/hooks'
import { Badge } from '@/components/ui/badge'
import { TaskStatus } from '@/lib/api/types'
import { toast } from 'sonner'

const statusColors = {
  [TaskStatus.PENDING]: 'bg-yellow-500',
  [TaskStatus.IN_PROGRESS]: 'bg-blue-500',
  [TaskStatus.COMPLETED]: 'bg-green-500',
  [TaskStatus.FAILED]: 'bg-red-500',
}

export default function TaskList() {
  const { data: tasks = [] } = useTasks()
  const deleteTask = useDeleteTask()

  const handleDelete = async (id: string) => {
    try {
      await deleteTask.mutateAsync(id)
      toast.success('Task deleted successfully')
    } catch (error) {
      toast.error('Failed to delete task')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Tasks</h1>
        <Link to="/tasks/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </Link>
      </div>

      <div className="border rounded-lg">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-4">Name</th>
              <th className="text-left p-4">Description</th>
              <th className="text-left p-4">Assigned Agent</th>
              <th className="text-left p-4">Dependencies</th>
              <th className="text-left p-4">Status</th>
              <th className="text-right p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className="border-b">
                <td className="p-4">
                  <div className="font-medium">{task.name}</div>
                </td>
                <td className="p-4">
                  <div className="text-sm text-muted-foreground">{task.description}</div>
                </td>
                <td className="p-4">
                  {task.agent && (
                    <Badge variant="outline">
                      {task.agent.name}
                    </Badge>
                  )}
                </td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-1">
                    {task.dependencies?.map((depId) => (
                      <Badge key={depId} variant="secondary" className="text-xs">
                        Task #{depId}
                      </Badge>
                    )) || null}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center">
                    <span className={`flex h-2 w-2 rounded-full mr-2 ${statusColors[task.status]}`} />
                    <span className="capitalize">{task.status.replace('_', ' ')}</span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex justify-end gap-2">
                    <Link to={`/tasks/${task.id}`}>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-destructive"
                      onClick={() => handleDelete(task.id)}
                      disabled={deleteTask.isPending}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-muted-foreground">
                  No tasks found. Create a new task to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
} 