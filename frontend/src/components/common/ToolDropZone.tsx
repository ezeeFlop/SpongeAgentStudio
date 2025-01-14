import { useDrop } from 'react-dnd'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash } from 'lucide-react'
import type { Tool } from '@/lib/api/hooks'

interface ToolDropZoneProps {
  tools: Tool[]
  onRemove: (name: string) => void
}

export function ToolDropZone({ tools, onRemove }: ToolDropZoneProps) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'TOOL',
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }))

  return (
    <div
      ref={drop}
      className={`min-h-[200px] rounded-lg border-2 border-dashed p-4 ${
        isOver ? 'border-primary bg-primary/10' : 'border-muted'
      }`}
    >
      {tools.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Drag and drop tools here
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tools.map((tool) => (
            <Card key={tool.name}>
              <CardContent className="p-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="font-medium">{tool.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {tool.description}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {tool.type}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => onRemove(tool.name)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
} 