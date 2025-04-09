import { type NextRequest, NextResponse } from "next/server"
import { Buffer } from "buffer"
import zlib from "zlib"

// Increase the body size limit for this route
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "25mb", // Reverted from 55mb
    },
  },
}

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
    const fileBlob = formData.get("file") as Blob | null

    if (!fileBlob) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400, headers: corsHeaders })
    }

    // Check decompressed size *after* decompression
    // Note: fileBlob.size is the *compressed* size here

    // Get the original filename (remove .gz)
    const originalFilename = (formData.get("file") as File)?.name.replace(/\.gz$/, "") || "unknown_file"

    // Read Blob as ArrayBuffer
    const compressedArrayBuffer = await fileBlob.arrayBuffer()
    // Convert ArrayBuffer to Buffer
    const compressedBuffer = Buffer.from(compressedArrayBuffer)

    // Log compressed size
    console.log(`Received compressed file blob: ${originalFilename}, compressed size: ${fileBlob.size} bytes`)

    // Decompress the buffer
    const decompressedBuffer = zlib.gunzipSync(compressedBuffer)

    // Check the *decompressed* size
    const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024 // Reverted from 50 MB
    if (decompressedBuffer.length > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: `Decompressed file size exceeds 20MB limit.` }, { status: 413, headers: corsHeaders }) // Revert error message
    }

    // Now you have the original file content in `decompressedBuffer`
    // You can convert it to a string, save it, or process it as needed.
    // Example: const fileContentString = decompressedBuffer.toString('utf-8');

    // Log decompressed size (already exists, just confirming)
    console.log(`Decompressed file: ${originalFilename}, original size: ${decompressedBuffer.length} bytes`)

    // Return a simple 200 OK response
    return NextResponse.json({ message: "File received and decompressed" }, { status: 200, headers: corsHeaders })

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