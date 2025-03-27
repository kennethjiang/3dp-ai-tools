import { type NextRequest, NextResponse } from "next/server"
import { analyze3mfFile } from "@/lib/analyzer"
import { extract3mfFile } from "@/lib/fileHandler"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    // Check if it's a 3MF file
    if (!file.name.endsWith(".3mf")) {
      return NextResponse.json({ error: "File must be a .3mf file" }, { status: 400 })
    }

    // Check file size (20MB limit)
    const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File size exceeds 20MB limit" }, { status: 400 })
    }

    console.log(`Processing file: ${file.name}, size: ${file.size} bytes`)

    // Extract the 3MF file in memory
    const { fileContents, error: extractionError } = await extract3mfFile(file)

    // If there was an error during extraction
    if (extractionError) {
      console.error("Extraction error:", extractionError)
      return NextResponse.json({ error: extractionError }, { status: 400 })
    }

    if (!fileContents || Object.keys(fileContents).length === 0) {
      console.error("No files extracted from the 3MF archive")
      return NextResponse.json({ error: "No files found in the 3MF archive" }, { status: 400 })
    }

    console.log(`Successfully extracted ${Object.keys(fileContents).length} files from the 3MF archive`)

    // Call our analysis function with the extracted file contents
    try {
      const analysisResult = await analyze3mfFile(file.name, fileContents)

      // Check if there was an error during analysis
      if ("error" in analysisResult) {
        console.error("Analysis error:", analysisResult.error)
        return NextResponse.json({ error: analysisResult.error }, { status: 400 })
      }

      return NextResponse.json(analysisResult)
    } catch (analysisError) {
      console.error("Detailed analysis error:", analysisError)
      // Log the stack trace if available
      if (analysisError instanceof Error && analysisError.stack) {
        console.error("Error stack trace:", analysisError.stack)
      }
      return NextResponse.json(
        { error: analysisError instanceof Error ? analysisError.message : "Failed to analyze file" },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error("Error processing file:", error)
    // Log the stack trace if available
    if (error instanceof Error && error.stack) {
      console.error("Error stack trace:", error.stack)
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to analyze file" },
      { status: 500 },
    )
  }
}

