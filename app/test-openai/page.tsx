"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function TestOpenAI() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const testOpenAI = async () => {
    setIsLoading(true)
    setResult(null)
    setError(null)

    try {
      const response = await fetch("/api/test-openai")

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
        setError(data.error || "An error occurred")
        return
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6">OpenAI API Test</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Test OpenAI API Connection</CardTitle>
          <CardDescription>Click the button below to test your OpenAI API connection</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={testOpenAI} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              "Test OpenAI API"
            )}
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col items-start">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md w-full mb-4">
              <h3 className="font-bold mb-2">Error</h3>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {result && (
            <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-md w-full">
              <h3 className="font-bold mb-2">Success!</h3>
              <p className="text-sm mb-2">OpenAI API is working correctly.</p>
              <div className="bg-white p-3 rounded border border-green-100">
                <p className="font-medium text-sm">Response:</p>
                <p className="text-sm mt-1">{result.response}</p>
              </div>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

