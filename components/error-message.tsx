import { AlertTriangle, Info } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface ErrorMessageProps {
  title: string
  message: string
  type?: "error" | "warning" | "info"
  suggestions?: string[]
}

export function ErrorMessage({ title, message, type = "error", suggestions }: ErrorMessageProps) {
  return (
    <Alert variant={type === "error" ? "destructive" : type === "warning" ? "warning" : "default"} className="mb-8">
      {type === "error" ? <AlertTriangle className="h-4 w-4" /> : <Info className="h-4 w-4" />}
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="mt-2">
        <p>{message}</p>

        {suggestions && suggestions.length > 0 && (
          <div className="mt-4">
            <p className="font-medium">Suggestions:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              {suggestions.map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          </div>
        )}
      </AlertDescription>
    </Alert>
  )
}

