import { useDrag } from 'react-dnd'
import { Card, CardContent } from '@/components/ui/card'
import type { Tool } from '@/lib/api/hooks'

interface DraggableToolProps {
  tool: Tool
  onDrop: () => void
}

export function DraggableTool({ tool, onDrop }: DraggableToolProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'TOOL',
    item: tool,
    end: (item, monitor) => {
      const dropResult = monitor.getDropResult()
      if (item && dropResult) {
        onDrop()
      }
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }))

  return (
    <div
      ref={drag}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className="cursor-move"
    >
      <Card>
        <CardContent className="p-2">
          <div className="space-y-1">
            <div className="font-medium">{tool.name}</div>
            <div className="text-sm text-muted-foreground">{tool.description}</div>
            <div className="text-xs text-muted-foreground capitalize">{tool.type}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 