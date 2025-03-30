import { AlertTriangle, Info } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

interface ErrorMessageProps {
  title: string
  message: string
  type?: "error" | "warning" | "info"
  suggestions?: string[]
}

export function ErrorMessage({ title, message, type = "error", suggestions }: ErrorMessageProps) {
  // Extract URL information when it's a profile fetch error
  let errorInfo = null
  if (message.includes("Failed to fetch profile map:") && message.includes("403 Forbidden")) {
    errorInfo = {
      profileName: "Preset Map",
      profileUrl: "https://obico-public.s3.amazonaws.com/slicer-profiles/preset_map.json"
    }
  }

  // The Alert component only supports 'default' and 'destructive' variants
  // For 'warning', we'll use the default variant with custom styling
  const isWarning = type === "warning"
  const variant = type === "error" ? "destructive" : "default"

  return (
    <Alert
      variant={variant}
      className={cn(
        "mb-8",
        isWarning && "border-yellow-500 text-yellow-700 dark:border-yellow-600 dark:text-yellow-400 [&>svg]:text-yellow-500 dark:[&>svg]:text-yellow-400"
      )}
    >
      {type === "error" ? <AlertTriangle className="h-4 w-4" /> : <Info className="h-4 w-4" />}
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="mt-2">
        <p>{message}</p>

        {errorInfo && (
          <div className="mt-2">
            <p className="text-sm font-medium">Endpoint details:</p>
            <p className="text-sm"><strong>Name:</strong> {errorInfo.profileName}</p>
            <p className="text-sm"><strong>URL:</strong> {errorInfo.profileUrl}</p>
          </div>
        )}

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

