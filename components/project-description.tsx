"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { FileText, Info } from "lucide-react"

interface ProjectDescriptionProps {
  filamentSettingsId: string | null
  printSettingsId: string | null
  comparisonItems: Array<{
    key: string
    originalValue: any
    changedValue: any
    source: "print" | "filament"
  }>
}

export function ProjectDescription({ filamentSettingsId, printSettingsId, comparisonItems }: ProjectDescriptionProps) {
  // Format value for display
  const formatValue = (value: any): string => {
    if (value === undefined) return "N/A"
    if (value === null) return "null"
    if (Array.isArray(value)) {
      if (value.length === 0) return "[]"
      return String(value[0])
    }
    if (typeof value === "object") return JSON.stringify(value)
    return String(value)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center">
          <FileText className="h-5 w-5 mr-2 text-primary" />
          <CardTitle>Project Description</CardTitle>
        </div>
        <CardDescription>Summary of the 3MF file configuration</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="bg-muted/30 p-4 rounded-lg">
            <pre className="whitespace-pre-wrap font-mono text-sm">
              {`filament preset: "${filamentSettingsId || "Unknown"}"
print process preset: ${printSettingsId || "Unknown"}

The following slicing parameters are further finetuned to be different from those in the presets:

${comparisonItems.map((item) => `${item.key}: ${formatValue(item.originalValue)} -> ${formatValue(item.changedValue)}`).join("\n")}
`}
            </pre>
          </div>

          <div className="flex items-center text-sm text-muted-foreground mt-2">
            <Info className="h-4 w-4 mr-2" />
            <p>This description summarizes the key settings and modifications in this 3MF file.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

