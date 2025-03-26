"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Loader2, AlertCircle, CheckCircle, Printer, FileJson, Settings } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface PrintSettingsInfoProps {
  printSettingsId: string | null
}

interface PrintSettingsMapEntry {
  id: string
  name: string
  sub_path?: string
  [key: string]: any
}

export function PrintSettingsInfo({ printSettingsId }: PrintSettingsInfoProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [printSettingsMapEntry, setPrintSettingsMapEntry] = useState<PrintSettingsMapEntry | null>(null)
  const [detailedProfile, setDetailedProfile] = useState<any | null>(null)
  const [activeTab, setActiveTab] = useState<string>("summary")

  useEffect(() => {
    const fetchPrintSettings = async () => {
      if (!printSettingsId) return

      setIsLoading(true)
      setError(null)
      setPrintSettingsMapEntry(null)
      setDetailedProfile(null)

      try {
        // Get the profile map using the environment variable
        const profileRoot = process.env.PROFILE_ROOT || "https://obico-public.s3.amazonaws.com/slicer-profiles/"
        const mapResponse = await fetch(`${profileRoot}profile_map.json`)

        if (!mapResponse.ok) {
          throw new Error(`Failed to fetch profile map: ${mapResponse.status} ${mapResponse.statusText}`)
        }

        const mapData = await mapResponse.json()

        if (!mapData.process_map) {
          throw new Error("Profile map does not contain process_map property")
        }

        const entry = mapData.process_map[printSettingsId]

        if (!entry) {
          throw new Error(`No print settings found for ID: ${printSettingsId}`)
        }

        setPrintSettingsMapEntry(entry)

        // If the entry has a sub_path, fetch the detailed profile
        if (entry.sub_path) {
          const detailUrl = `${profileRoot}${entry.sub_path}`
          console.log(`Fetching detailed print settings from: ${detailUrl}`)

          const detailResponse = await fetch(detailUrl)

          if (!detailResponse.ok) {
            throw new Error(
              `Failed to fetch detailed print settings: ${detailResponse.status} ${detailResponse.statusText}`,
            )
          }

          const detailData = await detailResponse.json()
          setDetailedProfile(detailData)
        }
      } catch (err) {
        console.error("Error fetching print settings:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch print settings")
      } finally {
        setIsLoading(false)
      }
    }

    fetchPrintSettings()
  }, [printSettingsId])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">Loading print settings information...</p>
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

  if (!printSettingsId) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Print Settings ID</AlertTitle>
        <AlertDescription>No print settings ID found in the project settings.</AlertDescription>
      </Alert>
    )
  }

  if (!printSettingsMapEntry) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center">
          <Settings className="h-5 w-5 mr-2 text-primary" />
          <CardTitle>Print Settings Profile</CardTitle>
        </div>
        <CardDescription>Information about the print settings used in this project</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="summary" className="flex items-center gap-1">
              <Printer className="h-4 w-4" />
              <span>Basic Info</span>
            </TabsTrigger>
            <TabsTrigger value="detailed" className="flex items-center gap-1" disabled={!detailedProfile}>
              <FileJson className="h-4 w-4" />
              <span>Detailed Profile</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Print Settings ID</h3>
                  <p className="font-mono text-xs bg-muted p-2 rounded">{printSettingsId}</p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Name</h3>
                  <p className="font-medium">{printSettingsMapEntry.name}</p>
                </div>
              </div>

              {printSettingsMapEntry.sub_path && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Profile Path</h3>
                  <p className="text-xs font-mono truncate">{printSettingsMapEntry.sub_path}</p>
                </div>
              )}

              {/* Additional properties */}
              <div className="mt-4 pt-4 border-t">
                <h3 className="text-sm font-medium mb-3">Additional Properties</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(printSettingsMapEntry)
                    .filter(([key]) => !["id", "name", "sub_path"].includes(key))
                    .map(([key, value]) => (
                      <div key={key} className="flex justify-between p-2 bg-muted/30 rounded">
                        <span className="text-xs font-medium">{key.replace(/_/g, " ")}</span>
                        <span className="text-xs">
                          {typeof value === "object" ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="detailed">
            {detailedProfile ? (
              <div className="space-y-4">
                <div className="bg-muted/30 p-4 rounded-lg">
                  <div className="flex items-center mb-4">
                    <FileJson className="h-5 w-5 mr-2 text-primary" />
                    <h3 className="text-lg font-semibold">Detailed Print Settings Profile</h3>
                  </div>
                  <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/50 p-4 rounded overflow-auto max-h-[500px]">
                    {JSON.stringify(detailedProfile, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <Loader2 className="h-10 w-10 mx-auto mb-4 animate-spin opacity-30" />
                <p>Loading detailed profile information...</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="bg-muted/20 border-t">
        <div className="flex items-center text-sm text-muted-foreground">
          <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
          {detailedProfile
            ? "Detailed print settings profile loaded successfully"
            : "Basic print settings information loaded"}
        </div>
      </CardFooter>
    </Card>
  )
}

