import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Trash, Play } from 'lucide-react'
import { useCrews, useDeleteCrew } from '@/lib/api/hooks'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

export default function CrewList() {
  const { data: crews = [] } = useCrews()
  const deleteCrew = useDeleteCrew()

  const handleDelete = async (id: string) => {
    try {
      await deleteCrew.mutateAsync(id)
      toast.success('Crew deleted successfully')
    } catch (error) {
      toast.error('Failed to delete crew')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Crews</h1>
        <Link to="/crews/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Crew
          </Button>
        </Link>
      </div>

      <div className="border rounded-lg">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-4">Name</th>
              <th className="text-left p-4">Description</th>
              <th className="text-left p-4">Agents</th>
              <th className="text-left p-4">Process Type</th>
              <th className="text-left p-4">Status</th>
              <th className="text-right p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {crews.map((crew) => (
              <tr key={crew.id} className="border-b">
                <td className="p-4">
                  <div className="font-medium">{crew.name}</div>
                </td>
                <td className="p-4">
                  <div className="text-sm text-muted-foreground">{crew.description}</div>
                </td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-1">
                    {crew.agents.map((agent) => (
                      <Badge key={agent.id} variant="outline">
                        {agent.name}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="p-4">
                  <div className="capitalize">{crew.process_type}</div>
                </td>
                <td className="p-4">
                  <div className="flex items-center">
                    <span className="flex h-2 w-2 rounded-full bg-green-500 mr-2" />
                    Ready
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex justify-end gap-2">
                    <Link to={`/crews/${crew.id}`}>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link to={`/execution?crew=${crew.id}`}>
                      <Button variant="ghost" size="sm" className="text-green-500">
                        <Play className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-destructive"
                      onClick={() => handleDelete(crew.id)}
                      disabled={deleteCrew.isPending}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
} 