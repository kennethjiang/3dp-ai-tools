import JSZip from "jszip"

/**
 * Extracts and validates a 3MF file in memory
 * @param file The uploaded 3MF file
 * @returns Object containing the extracted file contents or an error message
 */
export async function extract3mfFile(
  file: File,
): Promise<{ fileContents?: Record<string, Uint8Array>; error?: string }> {
  try {
    // Convert the file to an ArrayBuffer
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    // Verify it's a valid ZIP file and extract it in memory
    try {
      const zip = new JSZip()
      const zipContent = await zip.loadAsync(fileBuffer)

      // Check if the ZIP has any files
      if (Object.keys(zipContent.files).length === 0) {
        return { error: "The file is not a valid 3MF file (empty ZIP archive)" }
      }

      // Extract files to memory
      const fileContents: Record<string, Uint8Array> = {}

      // Process each file in the ZIP
      const extractionPromises = Object.keys(zipContent.files)
        .filter((filename) => !zipContent.files[filename].dir) // Skip directories
        .map(async (filename) => {
          const content = await zipContent.files[filename].async("uint8array")
          fileContents[filename] = content
        })

      // Wait for all extractions to complete
      await Promise.all(extractionPromises)

      console.log(`Extracted ${Object.keys(fileContents).length} files from the 3MF archive`)

      // Log all extracted files to help with debugging
      console.log("Extracted files:", Object.keys(fileContents).join(", "))

      // Check if this looks like a valid 3MF file
      const has3mfStructure = Object.keys(fileContents).some(
        (filename) =>
          filename.includes("3D/3dmodel.model") ||
          filename.includes("_rels/.rels") ||
          filename.includes("[Content_Types].xml"),
      )

      if (!has3mfStructure) {
        console.warn("Warning: The extracted files do not appear to have a standard 3MF structure")
      }

      return { fileContents }
    } catch (error) {
      console.error("Error extracting ZIP:", error)
      return { error: "The file is not a valid 3MF file (corrupt ZIP archive)" }
    }
  } catch (error) {
    console.error("Error in extraction process:", error)
    return {
      error: error instanceof Error ? `Error processing file: ${error.message}` : "Unknown error processing file",
    }
  }
}

