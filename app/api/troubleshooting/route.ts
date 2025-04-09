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

    // Initialize configDataResult here to be accessible later
    let configDataResult: { [key: string]: string } | null = null;

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

    // Convert decompressed buffer to string
    const fileContentString = decompressedBuffer.toString('utf-8');
    const lines = fileContentString.split('\n');

    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('; CONFIG_BLOCK_START')) {
        startIndex = i;
      } else if (lines[i].startsWith('; CONFIG_BLOCK_END')) {
        endIndex = i;
        break; // Stop searching once end is found
      }
    }

    if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex -1) { // Ensure there are lines *between* start and end
      const configLines = lines.slice(startIndex + 1, endIndex); // Exclude start and end lines
      const localConfigData: { [key: string]: string } = {}; // Create local non-nullable object

      configLines.forEach(line => {
        const trimmedLine = line.startsWith('; ') ? line.substring(2) : line; // Remove '; '
        const separatorIndex = trimmedLine.indexOf('=');
        if (separatorIndex !== -1) {
          const key = trimmedLine.substring(0, separatorIndex).trim();
          const value = trimmedLine.substring(separatorIndex + 1).trim();
          localConfigData[key] = value; // Assign to local object
          // console.log(`Extracted: Key='${key}', Value='${value}'`); // Optional: log each pair
        } else {
            console.log(`Skipping line (no '=' found): ${line}`);
        }
      });
      configDataResult = localConfigData; // Assign completed local object to the result variable

      // Logs removed in previous step
    } else if (startIndex !== -1 && endIndex !== -1 && startIndex >= endIndex -1) {
        console.log('Configuration block found, but no data lines between start and end markers.');
    } else {
      console.log('Configuration block (; CONFIG_BLOCK_START / ; CONFIG_BLOCK_END) not found in the file.'); // Updated message slightly
    }

    // Return the configDataResult in the response
    return NextResponse.json(
        {
            message: "File received and decompressed",
            config: configDataResult // Include configDataResult (will be null if not found/processed)
        },
        { status: 200, headers: corsHeaders }
    )

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