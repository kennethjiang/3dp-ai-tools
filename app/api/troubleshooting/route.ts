import { type NextRequest, NextResponse } from "next/server"

// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

// Handle OPTIONS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  })
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400, headers: corsHeaders })
    }

    // For now, just acknowledge the file was received
    console.log(`Received file for troubleshooting: ${file.name}, size: ${file.size} bytes`)

    // Return a simple 200 OK response
    return NextResponse.json({ message: "File received for troubleshooting" }, { status: 200, headers: corsHeaders })

  } catch (error) {
    console.error("Error processing troubleshooting request:", error)
    // Log the stack trace if available
    if (error instanceof Error && error.stack) {
      console.error("Error stack trace:", error.stack)
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process troubleshooting request" },
      { status: 500, headers: corsHeaders },
    )
  }
}