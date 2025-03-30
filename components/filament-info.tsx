"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertCircle, CheckCircle, Printer, Layers, FileJson } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface FilamentInfoProps {
  filamentSettingsId: string | null
}

interface Preset {
  name: string
  material?: string
  vendor?: string
  sub_path?: string
  [key: string]: any
}

export function FilamentInfo({ filamentSettingsId }: FilamentInfoProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [filamentPreset, setFilamentPreset] = useState<Preset | null>(null)
  const [detailedProfile, setDetailedProfile] = useState<any | null>(null)
  const [activeTab, setActiveTab] = useState<string>("summary")

  useEffect(() => {
    const fetchFilamentProfile = async () => {
      if (!filamentSettingsId) return

      setIsLoading(true)
      setError(null)
      setFilamentPreset(null)
      setDetailedProfile(null)

      try {
        // Get the presets using the environment variable
        const profileRoot = process.env.PROFILE_ROOT || "https://obico-public.s3.amazonaws.com/slicer-profiles/"
        const presetsResponse = await fetch(`${profileRoot}presets.json`)

        if (!presetsResponse.ok) {
          throw new Error(`Failed to fetch presets: ${presetsResponse.status} ${presetsResponse.statusText}`)
        }

        const presets = await presetsResponse.json() as Preset[]

        const entry = presets.find(preset => preset.name === filamentSettingsId)

        if (!entry) {
          throw new Error(`No filament profile found for ID: ${filamentSettingsId}`)
        }

        setFilamentPreset(entry)

        // If the entry has a sub_path, fetch the detailed profile
        if (entry.sub_path) {
          const detailUrl = `${profileRoot}${entry.sub_path}`
          console.log(`Fetching detailed profile from: ${detailUrl}`)

          const detailResponse = await fetch(detailUrl)

          if (!detailResponse.ok) {
            throw new Error(`Failed to fetch detailed profile: ${detailResponse.status} ${detailResponse.statusText}`)
          }

          const detailData = await detailResponse.json()
          setDetailedProfile(detailData)
        }
      } catch (err) {
        console.error("Error fetching filament profile:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch filament profile")
      } finally {
        setIsLoading(false)
      }
    }

    fetchFilamentProfile()
  }, [filamentSettingsId])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">Loading filament information...</p>
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

  if (!filamentSettingsId) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Filament ID</AlertTitle>
        <AlertDescription>No filament settings ID found in the project settings.</AlertDescription>
      </Alert>
    )
  }

  if (!filamentPreset) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center">
          <Layers className="h-5 w-5 mr-2 text-primary" />
          <CardTitle>Filament Profile</CardTitle>
        </div>
        <CardDescription>Information about the filament used in this project</CardDescription>
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
                  <h3 className="text-sm font-medium text-muted-foreground">Filament ID</h3>
                  <p className="font-mono text-xs bg-muted p-2 rounded">{filamentSettingsId}</p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Name</h3>
                  <p className="font-medium">{filamentPreset.name}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Material</h3>
                  <Badge variant="outline" className="text-sm">
                    {filamentPreset.material || "Unknown"}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Vendor</h3>
                  <p>{filamentPreset.vendor || "Unknown"}</p>
                </div>

                {filamentPreset.sub_path && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Profile Path</h3>
                    <p className="text-xs font-mono truncate">{filamentPreset.sub_path}</p>
                  </div>
                )}
              </div>

              {/* Additional properties */}
              <div className="mt-4 pt-4 border-t">
                <h3 className="text-sm font-medium mb-3">Additional Properties</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(filamentPreset)
                    .filter(([key]) => !["name", "material", "vendor", "sub_path"].includes(key))
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
                    <h3 className="text-lg font-semibold">Detailed Filament Profile</h3>
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
          {detailedProfile ? "Detailed filament profile loaded successfully" : "Basic filament information loaded"}
        </div>
      </CardFooter>
    </Card>
  )
}

