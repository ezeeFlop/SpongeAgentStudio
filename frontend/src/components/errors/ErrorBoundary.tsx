import React from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertCircle, Copy, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })
    // You can also log the error to an error reporting service here
    console.error('Error caught by boundary:', error, errorInfo)
  }

  handleCopyError = () => {
    const { error, errorInfo } = this.state
    const errorText = `Error: ${error?.message}\n\nStack trace:\n${error?.stack}\n\nComponent stack:\n${errorInfo?.componentStack}`
    
    navigator.clipboard.writeText(errorText).then(() => {
      toast.success('Error details copied to clipboard')
    }).catch(() => {
      toast.error('Failed to copy error details')
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-destructive/10">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
                <div className="mb-4">
                  <p className="text-muted-foreground">
                    An error occurred in the application. You can try reloading the page or copy the error details for reporting.
                  </p>
                </div>
                
                <div className="bg-muted/50 rounded-lg p-4 mb-4 font-mono text-sm overflow-auto max-h-[400px]">
                  <div className="mb-2">
                    <strong>Error:</strong> {this.state.error?.message}
                  </div>
                  {this.state.error?.stack && (
                    <div className="mb-2">
                      <strong>Stack trace:</strong>
                      <pre className="mt-1 text-xs whitespace-pre-wrap">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <div>
                      <strong>Component stack:</strong>
                      <pre className="mt-1 text-xs whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={this.handleCopyError}
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Error Details
                  </Button>
                  <Button
                    onClick={this.handleReload}
                    className="gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reload Page
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
} 