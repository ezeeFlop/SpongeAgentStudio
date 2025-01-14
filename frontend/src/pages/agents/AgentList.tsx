import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Trash } from 'lucide-react'
import { useAgents, useDeleteAgent } from '@/lib/api/hooks'
import { toast } from 'sonner'

export default function AgentList() {
  const { data: agents = [] } = useAgents()
  const deleteAgent = useDeleteAgent()

  const handleDelete = async (id: string) => {
    try {
      await deleteAgent.mutateAsync(id)
      toast.success('Agent deleted successfully')
    } catch (error) {
      toast.error('Failed to delete agent')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Agents</h1>
        <Link to="/agents/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Agent
          </Button>
        </Link>
      </div>

      <div className="border rounded-lg">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-4">Name</th>
              <th className="text-left p-4">Role</th>
              <th className="text-left p-4">Tools</th>
              <th className="text-left p-4">Process Type</th>
              <th className="text-left p-4">Status</th>
              <th className="text-right p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((agent) => (
              <tr key={agent.id} className="border-b">
                <td className="p-4">
                  <div className="font-medium">{agent.name}</div>
                </td>
                <td className="p-4">
                  <div className="text-sm text-muted-foreground">{agent.role}</div>
                </td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-1">
                    {agent.tools.map((tool) => (
                      <span
                        key={tool}
                        className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-4">
                  <div className="capitalize">{agent.process_type}</div>
                </td>
                <td className="p-4">
                  <div className="flex items-center">
                    <span className="flex h-2 w-2 rounded-full bg-green-500 mr-2" />
                    Active
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex justify-end gap-2">
                    <Link to={`/agents/${agent.id}`}>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-destructive"
                      onClick={() => handleDelete(agent.id)}
                      disabled={deleteAgent.isPending}
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