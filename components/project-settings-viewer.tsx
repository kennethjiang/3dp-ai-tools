"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Settings, Code, FileJson } from "lucide-react"

interface ProjectSettingsViewerProps {
  settings: any
}

export function ProjectSettingsViewer({ settings }: ProjectSettingsViewerProps) {
  const [viewMode, setViewMode] = useState<"formatted" | "raw">("formatted")

  if (!settings) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Settings className="h-10 w-10 mx-auto mb-4 opacity-30" />
        <p>Project settings could not be loaded</p>
      </div>
    )
  }

  // Function to render settings in a more user-friendly format
  const renderFormattedSettings = () => {
    return (
      <div className="space-y-6">
        {Object.entries(settings).map(([key, value]) => (
          <Card key={key} className="overflow-hidden">
            <CardHeader className="bg-muted/30 py-3">
              <CardTitle className="text-base">{key}</CardTitle>
            </CardHeader>
            <CardContent className="p-4">{renderSettingValue(value)}</CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Helper function to render different types of values
  const renderSettingValue = (value: any) => {
    if (value === null) return <span className="text-muted-foreground italic">null</span>

    if (typeof value === "object" && !Array.isArray(value)) {
      return (
        <div className="pl-4 border-l-2 border-muted space-y-3">
          {Object.entries(value).map(([subKey, subValue]) => (
            <div key={subKey}>
              <div className="font-medium mb-1">{subKey}</div>
              <div className="pl-3">{renderSettingValue(subValue)}</div>
            </div>
          ))}
        </div>
      )
    }

    if (Array.isArray(value)) {
      return (
        <div className="pl-4 border-l-2 border-muted">
          {value.length === 0 ? (
            <span className="text-muted-foreground italic">Empty array</span>
          ) : (
            <ul className="list-disc pl-4 space-y-1">
              {value.map((item, index) => (
                <li key={index}>{renderSettingValue(item)}</li>
              ))}
            </ul>
          )}
        </div>
      )
    }

    // For boolean values
    if (typeof value === "boolean") {
      return <span className={value ? "text-green-600" : "text-red-600"}>{value.toString()}</span>
    }

    // For numbers
    if (typeof value === "number") {
      return <span className="font-mono">{value}</span>
    }

    // Default for strings and other types
    return <span>{String(value)}</span>
  }

  return (
    <div className="space-y-4">
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "formatted" | "raw")} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="formatted" className="flex items-center gap-1">
            <Settings className="h-4 w-4" />
            <span>Formatted View</span>
          </TabsTrigger>
          <TabsTrigger value="raw" className="flex items-center gap-1">
            <Code className="h-4 w-4" />
            <span>Raw JSON</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="formatted" className="mt-4">
          {renderFormattedSettings()}
        </TabsContent>

        <TabsContent value="raw" className="mt-4">
          <div className="bg-muted/30 p-4 rounded-lg">
            <div className="flex items-center mb-4">
              <FileJson className="h-5 w-5 mr-2 text-primary" />
              <h3 className="text-lg font-semibold">Raw JSON Configuration</h3>
            </div>
            <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/50 p-4 rounded overflow-auto max-h-[500px]">
              {JSON.stringify(settings, null, 2)}
            </pre>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

