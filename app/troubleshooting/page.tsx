"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card"
import { Loader2, Upload, File } from "lucide-react"
import { ErrorMessage } from "@/components/error-message"
import ErrorBoundary from "@/components/error-boundary"

export default function TroubleshootingPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false) // Renamed from isAnalyzing
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]

      setError(null)
      setIsSubmitting(false)

      // Basic file type check - can be expanded later
      if (!selectedFile.name.endsWith(".3mf")) {
        setFile(null)
        setError("Please select a valid .3mf file")
        return
      }

      // Basic file size check - adjust as needed
      const MAX_FILE_SIZE_MB = 10 // Example: 10MB limit
      if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setFile(null)
        setError(`File size exceeds ${MAX_FILE_SIZE_MB}MB limit. Please select a smaller file.`)
        return
      }

      setFile(selectedFile)
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

      setError(null)
      setIsSubmitting(false)

      // Basic file type check
      if (!droppedFile.name.endsWith(".3mf")) {
        setFile(null)
        setError("Please select a valid .3mf file")
        return
      }

      // Basic file size check
      const MAX_FILE_SIZE_MB = 10
      if (droppedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setFile(null)
        setError(`File size exceeds ${MAX_FILE_SIZE_MB}MB limit. Please select a smaller file.`)
        return
      }

      setFile(droppedFile)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file) {
      setError("Please select a file to analyze")
      return
    }

    setIsSubmitting(true)
    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file!)

      const response = await fetch("/api/troubleshooting", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit file for troubleshooting")
      }

      console.log("Troubleshooting submission successful:", data)
      // Here you would typically handle the response, e.g., show a success message or results
      // For now, we just log it.

    } catch (err) {
      console.error("Troubleshooting submission error:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred during submission")
    } finally {
      setIsLoading(false)
      // Keep isSubmitting true until results are displayed or reset
      // You might want to reset isSubmitting later based on response handling
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <ErrorBoundary>
      <main className="container mx-auto py-10 px-4 md:px-10">
        <div className="mb-8">
          <div className="flex items-center">
            <h1 className="font-bold text-3xl">
              Print Troubleshooting
            </h1>
          </div>
        </div>

        <h5 className="font-semibold mb-8">Having trouble with a print? Upload the 3MF file, and let the AI help diagnose the potential issues based on the slicer settings.</h5>

        <Card className="mb-8">
          <CardHeader>
            <CardDescription></CardDescription>
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
                    <p className="text-xs text-muted-foreground mt-4 italic">Maximum file size: 10MB</p>
                  </div>
                )}
              </div>

              <Button type="submit" disabled={isLoading || !file} className="w-full text-lg">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Take a deep breath...
                  </>
                ) : (
                  "AI lord, tell me what went wrong!"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {error && (
          <ErrorMessage
            title="Submission Error"
            message={error}
            type="error"
            suggestions={[
              "Ensure the uploaded file is a valid .3mf file.",
              "Check your internet connection.",
              "If the problem persists, try a different file or contact support.",
            ]}
          />
        )}

        {isSubmitting && !isLoading && !error && (
          <Card className="mt-8">
            <CardHeader>
              <h2 className="text-xl font-semibold">Troubleshooting Results</h2>
            </CardHeader>
            <CardContent>
              <p>Analysis complete. Results will appear here.</p>
            </CardContent>
          </Card>
        )}
      </main>
    </ErrorBoundary>
  )
}