import { type NextRequest, NextResponse } from "next/server"
import { Buffer } from "buffer"
import zlib from "zlib"
import { OpenAI } from "openai"
import dedent from "ts-dedent"
import { langfuse, createTrace, createOpenAIClient } from "@/lib/langfuse"

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
  let trace: ReturnType<typeof createTrace> | undefined;

  try {
    const formData = await request.formData()
    const fileBlob = formData.get("file") as Blob | null
    const description = formData.get("description") as string | null

    if (!fileBlob) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400, headers: corsHeaders })
    }
    if (!description || description.trim().length === 0) {
      return NextResponse.json({ error: "Problem description is missing" }, { status: 400, headers: corsHeaders })
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

    } else if (startIndex !== -1 && endIndex !== -1 && startIndex >= endIndex - 1) {
        console.log('Configuration block found, but no data lines between start and end markers.');
        // Proceed with configDataResult being null or empty
    } else {
      // Markers not found - return specific error
      console.log('Configuration block (; CONFIG_BLOCK_START / ; CONFIG_BLOCK_END) not found in the file.'); // Keep log for server info
      return NextResponse.json(
        {
          error: "Can't find slicing parameters in your gcode file. Currently only G-Code files generated by OrcaSlicer can be analyzed."
        },
        { status: 400, headers: corsHeaders }
      );
    }

    let aiResponseContent: string | null = null;

    // --- Start of OpenAI call logic ---
    if (configDataResult && description) {
      console.log("Preparing to call OpenAI API for troubleshooting...");

      // Format parameters for the prompt
      const parametersString = Object.entries(configDataResult)
        .map(([key, value]) => `- ${key}: ${value}`)
        .join('\n');

      // Construct the system prompt
      const system_prompt = dedent`
        You are a AI assistant knowledgeable in 3D printing and slicing.
        You are responsible for helping the user troubleshoot their print issues.
        You will be given a description of the problem the user is experiencing, and a list of slicing parameters.

        Given the following slicing parameters extracted from the G-code file:
        ${parametersString}

        Follow these steps:
        1. Determine if the print issue the user reported is clear. If not, respond with a message asking the user to clarify their intent.
        2. Determine all possible causes of the print issue the user described, and how likely each cause is to be the issue. Order the causes from most likely to least likely.
        3. Examine the slicing parameters and determine if they have made some of the causes more or less likely. If so, adjust the likelihood of the causes accordingly.
        4. Describe the causes and their likelihoods to the user. Use the slicing parameters to explain why you think the cause is more or less likely.

        Respond in a direct and engaging manner.
        - Avoid referring to 'the user' and speak naturally.
        - Avoid revealing your internal logic.
        - Use markdown formatting in your response.
        `;

      try {
        // Create Langfuse trace using langfuse.trace directly
        trace = langfuse.trace({ // Use langfuse.trace directly
          name: "TroubleshootingAnalysis",
          input: { description, parameters: configDataResult },
          tags: ["troubleshooting"],
        });

        // Create OpenAI client with Langfuse observation - restoring config
        const openai = createOpenAIClient({
          generationName: "Troubleshooting Guidance",
          tags: ["troubleshooting-ai"],
        });

        // Call OpenAI API
        const aiResponse = await openai.chat.completions.create({
          model: "gpt-4o", // Or your preferred model
          messages: [
            { role: "system", content: system_prompt },
            { role: "user", content: description }
          ],
          temperature: 0.7, // Adjust as needed
        });

        aiResponseContent = aiResponse.choices[0]?.message?.content;
        console.log("Received AI response.");

      } catch (aiError) {
        console.error("Error calling OpenAI API:", aiError);
        // Don't block the response, just log the error
        // You might want to return a specific error message or status
      } finally {
        // Ensure all events are flushed to Langfuse
        if (trace) {
            await langfuse.flushAsync()
        }
      }
    }
    // --- End of OpenAI call logic ---

    // Return the configDataResult and AI response in the response
    return NextResponse.json(
        {
            message: "File received, decompressed, and analyzed",
            config: configDataResult,
            ai_guidance: aiResponseContent
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