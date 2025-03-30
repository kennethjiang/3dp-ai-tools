import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle } from "lucide-react"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught by ErrorBoundary:", error, errorInfo)
    if (this.props.onError) {
      this.props.onError(error)
    }
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {this.state.error?.message || "An unexpected error occurred"}
          </AlertDescription>
        </Alert>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary