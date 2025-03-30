"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Loader2, AlertCircle, CheckCircle, DiffIcon, FileJson } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"

interface SettingsComparisonProps {
  printSettingsId: string | null
  filamentSettingsId: string | null
  projectSettings: any | null
  onComparisonItemsUpdate?: (items: ComparisonItem[]) => void
}

interface ComparisonItem {
  key: string
  originalValue: any
  changedValue: any
  found: boolean
  source: "print" | "filament"
}

interface Preset {
  name: string
  sub_path?: string
  [key: string]: any
}

export function SettingsComparison({
  printSettingsId,
  filamentSettingsId,
  projectSettings,
  onComparisonItemsUpdate,
}: SettingsComparisonProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [comparisonItems, setComparisonItems] = useState<ComparisonItem[]>([])
  const [printSettings, setPrintSettings] = useState<any | null>(null)
  const [filamentSettings, setFilamentSettings] = useState<any | null>(null)

  useEffect(() => {
    const fetchSettings = async () => {
      if (!projectSettings || (!printSettingsId && !filamentSettingsId)) return

      setIsLoading(true)
      setError(null)
      setComparisonItems([])

      try {
        // Get the presets using the environment variable
        const profileRoot = process.env.PROFILE_ROOT || "https://obico-public.s3.amazonaws.com/slicer-profiles/"
        const presetsResponse = await fetch(`${profileRoot}presets.json`)

        if (!presetsResponse.ok) {
          throw new Error(`Failed to fetch presets: ${presetsResponse.status} ${presetsResponse.statusText}`)
        }

        const presets = await presetsResponse.json() as Preset[]
        let printSettingsData = null
        let filamentSettingsData = null

        // Fetch print settings if available
        if (printSettingsId) {
          const printEntry = presets.find((preset: Preset) => preset.name === printSettingsId)
          if (!printEntry) {
            throw new Error(`No print settings found for ID: ${printSettingsId}`)
          }

          if (printEntry.sub_path) {
            const detailUrl = `${profileRoot}${printEntry.sub_path}`
            console.log(`Fetching detailed print settings from: ${detailUrl}`)

            const detailResponse = await fetch(detailUrl)
            if (detailResponse.ok) {
              const detailData = await detailResponse.json()
              setPrintSettings(detailData)
              printSettingsData = detailData
              console.log("Print settings loaded successfully for comparison")
            } else {
              throw new Error(`Failed to fetch detailed print settings: ${detailResponse.status} ${detailResponse.statusText}`)
            }
          }
        }

        // Fetch filament settings if available
        if (filamentSettingsId) {
          const filamentEntry = presets.find((preset: Preset) => preset.name === filamentSettingsId)
          if (!filamentEntry) {
            throw new Error(`No filament profile found for ID: ${filamentSettingsId}`)
          }

          if (filamentEntry.sub_path) {
            const detailUrl = `${profileRoot}${filamentEntry.sub_path}`
            console.log(`Fetching detailed filament settings from: ${detailUrl}`)

            const detailResponse = await fetch(detailUrl)
            if (detailResponse.ok) {
              const detailData = await detailResponse.json()
              setFilamentSettings(detailData)
              filamentSettingsData = detailData
              console.log("Filament settings loaded successfully for comparison")
            } else {
              throw new Error(`Failed to fetch detailed filament settings: ${detailResponse.status} ${detailResponse.statusText}`)
            }
          }
        }

        // Process settings comparison once we have the data
        if (projectSettings && (printSettingsData || filamentSettingsData)) {
          processSettingsComparison(printSettingsData, filamentSettingsData, projectSettings)
        }
      } catch (err) {
        console.error("Error fetching settings:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch settings")
      } finally {
        setIsLoading(false)
      }
    }

    fetchSettings()
  }, [printSettingsId, filamentSettingsId, projectSettings])

  // Update parent component with comparison items when they change
  useEffect(() => {
    if (onComparisonItemsUpdate && comparisonItems.length > 0) {
      onComparisonItemsUpdate(comparisonItems)
    }
  }, [comparisonItems, onComparisonItemsUpdate])

  const processSettingsComparison = (printSettings: any, filamentSettings: any, projectSettings: any) => {
    if (!projectSettings || (!printSettings && !filamentSettings)) return

    // Check if different_settings_to_system exists and is an array
    if (!projectSettings.different_settings_to_system || !Array.isArray(projectSettings.different_settings_to_system)) {
      setError("No different_settings_to_system array found in project settings")
      return
    }

    const comparisonItems: ComparisonItem[] = []

    // Process print settings comparison (first element)
    if (printSettings && projectSettings.different_settings_to_system.length > 0) {
      const firstElement = projectSettings.different_settings_to_system[0]

      if (typeof firstElement === "string") {
        // Split the string by semicolon
        const printSettingKeys = firstElement.split(";").filter((key) => key.trim() !== "")
        console.log(`Found ${printSettingKeys.length} print setting keys to compare:`, printSettingKeys)

        // Process each key
        printSettingKeys.forEach((key) => {
          const originalValue = key in printSettings ? printSettings[key] : undefined
          const changedValue = key in projectSettings ? projectSettings[key] : undefined

          comparisonItems.push({
            key,
            originalValue,
            changedValue,
            found: key in printSettings,
            source: "print",
          })
        })
      }
    }

    // Process filament settings comparison (second element)
    if (filamentSettings && projectSettings.different_settings_to_system.length > 1) {
      const secondElement = projectSettings.different_settings_to_system[1]

      if (typeof secondElement === "string") {
        // Split the string by semicolon
        const filamentSettingKeys = secondElement.split(";").filter((key) => key.trim() !== "")
        console.log(`Found ${filamentSettingKeys.length} filament setting keys to compare:`, filamentSettingKeys)

        // Process each key
        filamentSettingKeys.forEach((key) => {
          // Get original value from filament settings, taking first element if it's an array
          let originalValue = key in filamentSettings ? filamentSettings[key] : undefined
          if (Array.isArray(originalValue) && originalValue.length > 0) {
            originalValue = originalValue[0]
          }

          // Get changed value from project settings, taking first element if it's an array
          let changedValue = key in projectSettings ? projectSettings[key] : undefined
          if (Array.isArray(changedValue) && changedValue.length > 0) {
            changedValue = changedValue[0]
          }

          comparisonItems.push({
            key,
            originalValue,
            changedValue,
            found: key in filamentSettings,
            source: "filament",
          })
        })
      }
    }

    setComparisonItems(comparisonItems)
    console.log(`Processed ${comparisonItems.length} total comparison items`)
  }

  // Format value for display
  const formatValue = (value: any): string => {
    if (value === undefined) return "Not found"
    if (value === null) return "null"
    if (Array.isArray(value)) {
      if (value.length === 0) return "[]"
      return `[${value.join(", ")}]`
    }
    if (typeof value === "object") return JSON.stringify(value)
    return String(value)
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">Loading settings comparison...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!printSettingsId || !projectSettings) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Settings Found</AlertTitle>
        <AlertDescription>Print settings ID or project settings not available.</AlertDescription>
      </Alert>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center">
          <DiffIcon className="h-5 w-5 mr-2 text-primary" />
          <CardTitle>Settings Comparison</CardTitle>
        </div>
        <CardDescription>Comparison between original print settings and modified values in the project</CardDescription>
      </CardHeader>
      <CardContent>
        {comparisonItems.length > 0 ? (
          <div className="space-y-4">
            <div className="bg-muted/30 p-4 rounded-lg">
              <div className="flex items-center mb-4">
                <FileJson className="h-5 w-5 mr-2 text-primary" />
                <h3 className="text-lg font-semibold">Modified Settings</h3>
              </div>

              <ScrollArea className="h-[500px] pr-4">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>Setting Key</TableHead>
                      <TableHead>Original Value</TableHead>
                      <TableHead>Changed Value</TableHead>
                      <TableHead className="w-[100px]">Source</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparisonItems.length > 0 ? (
                      comparisonItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-xs">{item.key}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-muted/50 font-mono text-xs">
                              {formatValue(item.originalValue)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="default" className="font-mono text-xs">
                              {formatValue(item.changedValue)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                item.source === "print"
                                  ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400"
                                  : "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400"
                              }
                            >
                              {item.source === "print" ? "Print" : "Filament"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {item.found ? (
                              <Badge
                                variant="outline"
                                className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400"
                              >
                                Found
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400"
                              >
                                Not found
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No settings comparison data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <AlertCircle className="h-10 w-10 mx-auto mb-4 opacity-30" />
            <p>No settings comparison data available</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="bg-muted/20 border-t">
        <div className="flex items-center text-sm text-muted-foreground">
          <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
          {comparisonItems.length > 0
            ? `Found ${comparisonItems.length} modified settings`
            : "No modified settings found"}
        </div>
      </CardFooter>
    </Card>
  )
}

