"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Loader2,
  Upload,
  File,
  FileText,
  FileCode,
  FileJson,
  FileIcon,
  Settings,
  Info,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  BarChart,
  Target,
  Eye,
  Wrench,
  Scale,
  Layers,
  Printer,
  DiffIcon,
} from "lucide-react"
import type { AnalysisResults, ExtractedFile, ConfigFile } from "@/types/analysis"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FilamentInfo } from "@/components/filament-info"
import { PrintSettingsInfo } from "@/components/print-settings-info"
import { SettingsComparison } from "@/components/settings-comparison"
import { ErrorMessage } from "@/components/error-message"

interface ComparisonItem {
  key: string
  originalValue: any
  changedValue: any
  found: boolean
  source: "print" | "filament"
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isComparisonLoading, setIsComparisonLoading] = useState<boolean>(false)
  const [results, setResults] = useState<AnalysisResults | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<ExtractedFile | null>(null)
  const [projectSettings, setProjectSettings] = useState<any | null>(null)
  const [filamentSettingsId, setFilamentSettingsId] = useState<string | null>(null)
  const [printSettingsId, setPrintSettingsId] = useState<string | null>(null)
  const [comparisonItems, setComparisonItems] = useState<ComparisonItem[]>([])
  const [activeSection, setActiveSection] = useState<string>("overview")
  const [validationError, setValidationError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Extract settings IDs when project settings change
  useEffect(() => {
    if (projectSettings) {
      // Extract filament settings ID
      if (
        projectSettings.filament_settings_id &&
        Array.isArray(projectSettings.filament_settings_id) &&
        projectSettings.filament_settings_id.length > 0
      ) {
        const id = projectSettings.filament_settings_id[0]
        console.log("Found filament settings ID:", id)
        setFilamentSettingsId(id)
      } else {
        setFilamentSettingsId(null)
      }

      // Extract print settings ID
      if (projectSettings.print_settings_id && typeof projectSettings.print_settings_id === "string") {
        console.log("Found print settings ID:", projectSettings.print_settings_id)
        setPrintSettingsId(projectSettings.print_settings_id)
      } else {
        setPrintSettingsId(null)
      }
    } else {
      setFilamentSettingsId(null)
      setPrintSettingsId(null)
    }
  }, [projectSettings])

  // Fetch comparison data when settings IDs are available
  useEffect(() => {
    const fetchComparisonData = async () => {
      if (!projectSettings || (!printSettingsId && !filamentSettingsId)) return

      setIsComparisonLoading(true)
      setComparisonItems([])

      try {
        // Get the profile map using the environment variable
        const profileRoot = process.env.PROFILE_ROOT || "https://obico-public.s3.amazonaws.com/slicer-profiles/"
        const mapResponse = await fetch(`${profileRoot}profile_map.json`)

        if (!mapResponse.ok) {
          throw new Error(`Failed to fetch profile map: ${mapResponse.status} ${mapResponse.statusText}`)
        }

        const mapData = await mapResponse.json()
        let printSettingsData = null
        let filamentSettingsData = null

        // Fetch print settings if available
        if (printSettingsId && mapData.process_map) {
          const printEntry = mapData.process_map[printSettingsId]
          if (printEntry && printEntry.sub_path) {
            const detailUrl = `${profileRoot}${printEntry.sub_path}`
            console.log(`Fetching detailed print settings from: ${detailUrl}`)

            const detailResponse = await fetch(detailUrl)
            if (detailResponse.ok) {
              const detailData = await detailResponse.json()
              printSettingsData = detailData
              console.log("Print settings loaded successfully for comparison")
            }
          }
        }

        // Fetch filament settings if available
        if (filamentSettingsId && mapData.filament_map) {
          const filamentEntry = mapData.filament_map[filamentSettingsId]
          if (filamentEntry && filamentEntry.sub_path) {
            const detailUrl = `${profileRoot}${filamentEntry.sub_path}`
            console.log(`Fetching detailed filament settings from: ${detailUrl}`)

            const detailResponse = await fetch(detailUrl)
            if (detailResponse.ok) {
              const detailData = await detailResponse.json()
              filamentSettingsData = detailData
              console.log("Filament settings loaded successfully for comparison")
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
        setIsComparisonLoading(false)
      }
    }

    fetchComparisonData()
  }, [printSettingsId, filamentSettingsId, projectSettings])

  const processSettingsComparison = (printSettings: any, filamentSettings: any, projectSettings: any) => {
    if (!projectSettings || (!printSettings && !filamentSettings)) return

    // Check if different_settings_to_system exists and is an array
    if (!projectSettings.different_settings_to_system || !Array.isArray(projectSettings.different_settings_to_system)) {
      console.error("No different_settings_to_system array found in project settings")
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (selectedFile.name.endsWith(".3mf")) {
        setFile(selectedFile)
        setError(null)
        setValidationError(null)
      } else {
        setFile(null)
        setError("Please select a valid .3mf file")
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.name.endsWith(".3mf")) {
        setFile(droppedFile)
        setError(null)
        setValidationError(null)
      } else {
        setFile(null)
        setError("Please select a valid .3mf file")
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file) {
      setError("Please select a file to analyze")
      return
    }

    setIsLoading(true)
    setError(null)
    setResults(null)
    setSelectedFile(null)
    setProjectSettings(null)
    setFilamentSettingsId(null)
    setPrintSettingsId(null)
    setComparisonItems([])
    setValidationError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      })

      // Log the raw response for debugging
      console.log("API Response Status:", response.status)
      console.log("API Response Headers:", Object.fromEntries(response.headers.entries()))

      // Get the raw text first to inspect it
      const rawText = await response.text()
      console.log("Raw API Response:", rawText)

      // Try to parse as JSON
      let data
      try {
        data = JSON.parse(rawText)
      } catch (parseError) {
        console.error("Error parsing API response as JSON:", parseError)
        setError(`API returned invalid JSON: ${rawText.substring(0, 200)}${rawText.length > 200 ? "..." : ""}`)
        return
      }

      if (!response.ok) {
        if (data.error && data.error.includes("No project settings found")) {
          setValidationError(
            data.error + " Please try a different 3MF file that was created with PrusaSlicer or a compatible slicer.",
          )
        } else if (data.error && data.error.includes("OpenAI API")) {
          setError("OpenAI API Error: " + data.error)
        } else {
          throw new Error(data.error || "Failed to analyze file")
        }
        return
      }

      // Check if the required file exists (case-insensitive search)
      const requiredFilePath = "Metadata/project_settings.config"
      const hasRequiredFile = data.extractedFiles.some(
        (extractedFile: ExtractedFile) => extractedFile.name.toLowerCase() === requiredFilePath.toLowerCase(),
      )

      if (!hasRequiredFile) {
        setValidationError(`Invalid 3mf file. ${requiredFilePath} not found`)
        setResults(null)
      } else {
        setResults(data)

        // Find the project settings file in configFiles
        const settingsFile = data.configFiles.find(
          (configFile: ConfigFile) => configFile.path.toLowerCase() === requiredFilePath.toLowerCase(),
        )

        if (settingsFile) {
          console.log("Found settings file in configFiles:", settingsFile)
          setProjectSettings(settingsFile.content)
        } else {
          // Fallback: If not found in configFiles, try to find it in extractedFiles and parse it
          console.log("Settings file not found in configFiles, searching in extractedFiles...")
          const rawFile = data.extractedFiles.find(
            (file: ExtractedFile) => file.name.toLowerCase() === requiredFilePath.toLowerCase(),
          )

          if (rawFile && rawFile.content) {
            console.log("Found raw settings file in extractedFiles:", rawFile.name)
            try {
              // Try to parse the content as JSON
              const parsedContent = JSON.parse(rawFile.content)
              console.log("Successfully parsed settings file content")
              setProjectSettings(parsedContent)
            } catch (parseError) {
              console.error("Error parsing settings file:", parseError)
              setError(
                `Error parsing settings file: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
              )
            }
          } else {
            console.error("Settings file not found in extractedFiles either")
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const getFileIcon = (file: ExtractedFile) => {
    if (file.type === "text/xml") return <FileCode className="h-4 w-4" />
    if (file.type === "application/json") return <FileJson className="h-4 w-4" />
    if (file.type === "text/plain") return <FileText className="h-4 w-4" />
    return <FileIcon className="h-4 w-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <main className="container mx-auto py-10 px-4">
      <div className="flex items-center justify-center mb-8">
        <img src="/favicon.svg" alt="3MF Analyzer Logo" className="w-10 h-10 mr-3" />
        <h1 className="text-3xl font-bold">3MF File Analyzer</h1>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Upload 3MF File</CardTitle>
          <CardDescription>Upload a 3MF file to analyze its parameters and configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div
              className={`border-2 border-dashed rounded-lg p-8 mb-4 text-center cursor-pointer transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : file
                    ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={triggerFileInput}
            >
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".3mf" className="hidden" />

              {file ? (
                <div className="flex flex-col items-center">
                  <File className="h-10 w-10 text-green-500 mb-2" />
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Drag and drop your 3MF file here</p>
                  <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
                </div>
              )}
            </div>

            <Button type="submit" disabled={isLoading || !file} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Analyze 3MF File"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <ErrorMessage
          title="Analysis Error"
          message={error}
          type="error"
          suggestions={
            error.includes("API key")
              ? [
                  "Make sure you've added your OPENAI_API_KEY to the environment variables",
                  "Check that your API key is valid and has not expired",
                  "Verify that your OpenAI account has sufficient credits",
                ]
              : [
                  "Check your OpenAI API key is valid and has sufficient credits",
                  "Try again in a few moments as the API might be temporarily unavailable",
                  "If the error persists, try a different 3MF file",
                ]
          }
        />
      )}

      {validationError && (
        <ErrorMessage
          title="Invalid 3MF File"
          message={validationError}
          type="error"
          suggestions={[
            "Make sure you're uploading a 3MF file created with PrusaSlicer or a compatible slicer.",
            "Check if the file contains project settings (usually in Metadata/project_settings.config).",
            "Try exporting the 3MF file again from your slicer software with settings included.",
          ]}
        />
      )}

      {results && !validationError && (
        <>
          <Tabs defaultValue="analysis" className="space-y-8">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="analysis" className="flex items-center gap-1">
                <BarChart className="h-4 w-4" />
                <span>AI Analysis</span>
              </TabsTrigger>
              <TabsTrigger value="filament" className="flex items-center gap-1">
                <Layers className="h-4 w-4" />
                <span>Filament Preset</span>
              </TabsTrigger>
              <TabsTrigger value="print" className="flex items-center gap-1">
                <Printer className="h-4 w-4" />
                <span>Process Preset</span>
              </TabsTrigger>
              <TabsTrigger value="comparison" className="flex items-center gap-1">
                <DiffIcon className="h-4 w-4" />
                <span>Comparison</span>
              </TabsTrigger>
              <TabsTrigger value="files" className="flex items-center gap-1">
                <File className="h-4 w-4" />
                <span>Project Contents</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="analysis">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Sidebar Navigation */}
                <Card className="md:col-span-1">
                  <CardHeader className="pb-3">
                    <CardTitle>Analysis Sections</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <nav className="flex flex-col">
                      <Button
                        variant={activeSection === "overview" ? "default" : "ghost"}
                        className="justify-start rounded-none h-12"
                        onClick={() => setActiveSection("overview")}
                      >
                        <Info className="mr-2 h-4 w-4" />
                        Overview
                      </Button>
                      <Button
                        variant={activeSection === "visual" ? "default" : "ghost"}
                        className="justify-start rounded-none h-12"
                        onClick={() => setActiveSection("visual")}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Visual Effects
                      </Button>
                      <Button
                        variant={activeSection === "functional" ? "default" : "ghost"}
                        className="justify-start rounded-none h-12"
                        onClick={() => setActiveSection("functional")}
                      >
                        <Wrench className="mr-2 h-4 w-4" />
                        Functional Effects
                      </Button>
                      <Button
                        variant={activeSection === "tradeoffs" ? "default" : "ghost"}
                        className="justify-start rounded-none h-12"
                        onClick={() => setActiveSection("tradeoffs")}
                      >
                        <Scale className="mr-2 h-4 w-4" />
                        Trade-offs
                      </Button>
                      <Button
                        variant={activeSection === "optimization" ? "default" : "ghost"}
                        className="justify-start rounded-none h-12"
                        onClick={() => setActiveSection("optimization")}
                      >
                        <Lightbulb className="mr-2 h-4 w-4" />
                        Optimization
                      </Button>
                      <Button
                        variant={activeSection === "parameters" ? "default" : "ghost"}
                        className="justify-start rounded-none h-12"
                        onClick={() => setActiveSection("parameters")}
                      >
                        <Target className="mr-2 h-4 w-4" />
                        Parameters
                      </Button>
                    </nav>
                  </CardContent>
                </Card>

                {/* Main Content Area */}
                <div className="md:col-span-3">
                  {/* Overview Section */}
                  {activeSection === "overview" && (
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center">
                          <Info className="h-5 w-5 mr-2 text-primary" />
                          <CardTitle>Overview</CardTitle>
                        </div>
                        <CardDescription>Summary of the 3MF file analysis</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h3 className="text-lg font-semibold mb-2">Overall Purpose</h3>
                            <div className="bg-muted/50 p-4 rounded-lg">
                              <p>{results.overallPurpose}</p>
                            </div>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold mb-2">Model Type</h3>
                            <div className="bg-muted/50 p-4 rounded-lg">
                              <p>{results.modelType}</p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6">
                          <h3 className="text-lg font-semibold mb-2">Key Findings</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card>
                              <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-base flex items-center">
                                  <Eye className="h-4 w-4 mr-2 text-blue-500" />
                                  Visual
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="p-4 pt-0">
                                <p className="text-sm text-muted-foreground">{results.visualEffects[0]}</p>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-base flex items-center">
                                  <Wrench className="h-4 w-4 mr-2 text-green-500" />
                                  Functional
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="p-4 pt-0">
                                <p className="text-sm text-muted-foreground">{results.functionalEffects[0]}</p>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardHeader className="p-4 pb-2">
                                <CardTitle className="text-base flex items-center">
                                  <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
                                  Trade-off
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="p-4 pt-0">
                                <p className="text-sm text-muted-foreground">{results.tradeOffs[0]}</p>
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="border-t bg-muted/20 px-6 py-3">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                          Analysis completed successfully
                        </div>
                      </CardFooter>
                    </Card>
                  )}

                  {/* Visual Effects Section */}
                  {activeSection === "visual" && (
                    <Card>
                      <CardHeader>
                        <div className="flex items-center">
                          <Eye className="h-5 w-5 mr-2 text-blue-500" />
                          <CardTitle>Visual Effects</CardTitle>
                        </div>
                        <CardDescription>
                          How the modifications affect the visual appearance of the print
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {results.visualEffects.map((effect, index) => (
                            <Card key={index} className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/10">
                              <CardContent className="p-4">
                                <div className="flex items-start">
                                  <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-2 mr-4">
                                    <Eye className="h-5 w-5 text-blue-500" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium mb-1">Effect {index + 1}</h4>
                                    <p className="text-sm">{effect}</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                        <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                          <h4 className="font-semibold mb-2 flex items-center">
                            <Info className="h-4 w-4 mr-2" />
                            Visual Impact Summary
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            The visual modifications focus on minimizing visible support structures while maintaining
                            the aesthetic quality of the printed model.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Functional Effects Section */}
                  {activeSection === "functional" && (
                    <Card>
                      <CardHeader>
                        <div className="flex items-center">
                          <Wrench className="h-5 w-5 mr-2 text-green-500" />
                          <CardTitle>Functional Effects</CardTitle>
                        </div>
                        <CardDescription>
                          How the modifications affect the functionality and structural integrity
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {results.functionalEffects.map((effect, index) => (
                            <Card key={index} className="border-green-200 bg-green-50/50 dark:bg-green-950/10">
                              <CardContent className="p-4">
                                <div className="flex items-start">
                                  <div className="bg-green-100 dark:bg-green-900 rounded-full p-2 mr-4">
                                    <Wrench className="h-5 w-5 text-green-500" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium mb-1">Enhancement {index + 1}</h4>
                                    <p className="text-sm">{effect}</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                        <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                          <h4 className="font-semibold mb-2 flex items-center">
                            <Info className="h-4 w-4 mr-2" />
                            Functional Impact Summary
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            The functional modifications improve the structural integrity of the print, particularly for
                            complex geometries and overhanging sections.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Trade-offs Section */}
                  {activeSection === "tradeoffs" && (
                    <Card>
                      <CardHeader>
                        <div className="flex items-center">
                          <Scale className="h-5 w-5 mr-2 text-amber-500" />
                          <CardTitle>Trade-offs</CardTitle>
                        </div>
                        <CardDescription>Compromises made to achieve the desired results</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {results.tradeOffs.map((tradeOff, index) => (
                            <Card key={index} className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/10">
                              <CardContent className="p-4">
                                <div className="flex items-start">
                                  <div className="bg-amber-100 dark:bg-amber-900 rounded-full p-2 mr-4">
                                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium mb-1">Consideration {index + 1}</h4>
                                    <p className="text-sm">{tradeOff}</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                        <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                          <h4 className="font-semibold mb-2 flex items-center">
                            <Info className="h-4 w-4 mr-2" />
                            Trade-off Assessment
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            While the modifications improve structural support and adhesion, they come with increased
                            print time and potentially more complex post-processing requirements.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Optimization Suggestions Section */}
                  {activeSection === "optimization" && (
                    <Card>
                      <CardHeader>
                        <div className="flex items-center">
                          <Lightbulb className="h-5 w-5 mr-2 text-purple-500" />
                          <CardTitle>Optimization Suggestions</CardTitle>
                        </div>
                        <CardDescription>Recommendations for further improvements</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {results.optimizationSuggestions.map((suggestion, index) => (
                            <Card key={index} className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/10">
                              <CardContent className="p-4">
                                <div className="flex items-start">
                                  <div className="bg-purple-100 dark:bg-purple-900 rounded-full p-2 mr-4">
                                    <Lightbulb className="h-5 w-5 text-purple-500" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium mb-1">Suggestion {index + 1}</h4>
                                    <p className="text-sm">{suggestion}</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                        <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                          <h4 className="font-semibold mb-2 flex items-center">
                            <Info className="h-4 w-4 mr-2" />
                            Optimization Strategy
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Fine-tuning the support structures and brim settings based on the specific model geometry
                            can further improve print quality while reducing post-processing effort.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Parameter-Specific Analysis Section */}
                  {activeSection === "parameters" && (
                    <Card>
                      <CardHeader>
                        <div className="flex items-center">
                          <Target className="h-5 w-5 mr-2 text-primary" />
                          <CardTitle>Parameter-Specific Analysis</CardTitle>
                        </div>
                        <CardDescription>Detailed analysis of individual parameter changes</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[500px] pr-4">
                          <Table>
                            <TableHeader className="sticky top-0 bg-background">
                              <TableRow>
                                <TableHead className="w-[50px]">#</TableHead>
                                <TableHead>Parameter</TableHead>
                                <TableHead>Original Value</TableHead>
                                <TableHead>New Value</TableHead>
                                <TableHead>Purpose</TableHead>
                                <TableHead>Effect</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {results.parameterAnalysis.map((param, index) => (
                                <TableRow key={index}>
                                  <TableCell>{index}</TableCell>
                                  <TableCell className="font-medium">{param.parameter}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="bg-muted/50">
                                      {param.originalValue}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="default">{param.newValue}</Badge>
                                  </TableCell>
                                  <TableCell className="max-w-[200px]">{param.purpose}</TableCell>
                                  <TableCell className="max-w-[200px]">{param.effect}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                        <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                          <h4 className="font-semibold mb-2 flex items-center">
                            <Info className="h-4 w-4 mr-2" />
                            Parameter Impact Summary
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            The parameter changes focus on optimizing support structures and bed adhesion, which are
                            critical for successfully printing complex geometries with overhangs.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="filament">
              <FilamentInfo filamentSettingsId={filamentSettingsId} />
            </TabsContent>

            <TabsContent value="print">
              <PrintSettingsInfo printSettingsId={printSettingsId} />
            </TabsContent>

            <TabsContent value="comparison">
              {isComparisonLoading ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-10">
                    <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
                    <p className="text-muted-foreground">Loading settings comparison...</p>
                  </CardContent>
                </Card>
              ) : (
                <SettingsComparison
                  printSettingsId={printSettingsId}
                  filamentSettingsId={filamentSettingsId}
                  projectSettings={projectSettings}
                />
              )}
            </TabsContent>

            <TabsContent value="files">
              <Card>
                <CardHeader>
                  <CardTitle>Extracted Files</CardTitle>
                  <CardDescription>Files extracted from the 3MF archive</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border rounded-md overflow-hidden">
                      <div className="bg-muted p-2 font-medium">File Structure</div>
                      <div className="p-2 max-h-[400px] overflow-y-auto">
                        <ul className="space-y-1">
                          {results.extractedFiles.map((file, index) => (
                            <li
                              key={index}
                              className={`flex items-center p-1 rounded hover:bg-muted cursor-pointer ${
                                selectedFile?.name === file.name ? "bg-muted" : ""
                              }`}
                              onClick={() => setSelectedFile(file)}
                            >
                              {getFileIcon(file)}
                              <span className="ml-2 text-sm truncate">{file.name}</span>
                              <span className="ml-auto text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="border rounded-md overflow-hidden md:col-span-2">
                      <div className="bg-muted p-2 font-medium">
                        {selectedFile ? `File Content: ${selectedFile.name}` : "Select a file to view its content"}
                      </div>
                      <div className="p-2 max-h-[400px] overflow-y-auto">
                        {selectedFile ? (
                          selectedFile.content ? (
                            <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/30 p-2 rounded">
                              {selectedFile.content}
                            </pre>
                          ) : (
                            <div className="p-4 text-center text-muted-foreground">
                              Binary file content cannot be displayed
                            </div>
                          )
                        ) : (
                          <div className="p-4 text-center text-muted-foreground">
                            Select a file from the list to view its content
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </main>
  )
}

interface AnalysisSectionProps {
  title: string
  content: string | null
  children?: React.ReactNode
}

function AnalysisSection({ title, content, children }: AnalysisSectionProps) {
  return (
    <section>
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      {content && <p className="mb-4">{content}</p>}
      {children}
    </section>
  )
}

