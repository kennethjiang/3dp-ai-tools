import type { AnalysisResults, ExtractedFile, ConfigFile } from "@/types/analysis"
import { getStructuredAnalysis } from "./openai"

/**
 * Analyzes a 3MF file from its extracted contents
 * @param filename Original filename of the 3MF file (for reference)
 * @param fileContents Object containing the extracted file contents
 * @returns Analysis results
 */
export async function analyze3mfFile(
  filename: string,
  fileContents?: Record<string, Uint8Array>,
): Promise<AnalysisResults | { error: string }> {
  console.log(`Analyzing 3MF file: ${filename}`)

  // Prepare the extracted files information
  const extractedFiles: ExtractedFile[] = []
  const configFiles: ConfigFile[] = []
  let projectSettings: any = null

  if (!fileContents || Object.keys(fileContents).length === 0) {
    return { error: "No files found in the 3MF archive" }
  }

  console.log(`Extracted ${Object.keys(fileContents).length} files from the 3MF archive`)

  // Process each extracted file
  Object.entries(fileContents).forEach(([name, content]) => {
    // Determine file type based on extension
    let type = "binary"
    if (name.endsWith(".xml") || name.endsWith(".model") || name.endsWith(".rels")) {
      type = "text/xml"
    } else if (name.endsWith(".json") || name.endsWith(".config")) {
      type = "application/json"
    } else if (name.endsWith(".txt")) {
      type = "text/plain"
    }

    const file: ExtractedFile = {
      name,
      size: content.length,
      type,
    }

    // For text files, include the content
    if (type.startsWith("text/") || type === "application/json") {
      try {
        file.content = new TextDecoder().decode(content)
      } catch (error) {
        console.error(`Error decoding ${name}:`, error)
      }
    }

    extractedFiles.push(file)

    // Check if this is a config file in the Metadata folder or any .config file
    if (
      (name.toLowerCase().includes("/metadata/") || name.toLowerCase().includes("\\metadata\\")) &&
      (name.toLowerCase().endsWith(".config") || name.toLowerCase().endsWith(".json"))
    ) {
      try {
        const textContent = new TextDecoder().decode(content)
        let jsonContent

        try {
          jsonContent = JSON.parse(textContent)

          // Store project settings for analysis
          // Look for project_settings.config or any file that might contain settings
          if (
            name.toLowerCase().includes("project_settings") ||
            (jsonContent && (jsonContent.print_settings_id || jsonContent.filament_settings_id))
          ) {
            console.log(`Found potential project settings in: ${name}`)
            projectSettings = jsonContent
          }
        } catch (parseError) {
          console.error(`Error parsing config file ${name} as JSON:`, parseError)
          // Try to handle non-standard JSON (like with comments or trailing commas)
          // For now, just store the raw text if parsing fails
          jsonContent = { rawContent: textContent, parseError: true }
        }

        configFiles.push({
          name: name.split("/").pop() || name,
          path: name,
          content: jsonContent,
        })

        console.log(`Processed config file: ${name}`)
      } catch (error) {
        console.error(`Error processing config file ${name}:`, error)
      }
    }
  })

  // Sort files by name for better readability
  extractedFiles.sort((a, b) => a.name.localeCompare(b.name))
  configFiles.sort((a, b) => a.name.localeCompare(b.name))

  // If we still don't have project settings, try to find any JSON file that might contain settings
  if (!projectSettings) {
    console.log("No project settings found in standard locations, searching all files...")

    for (const file of extractedFiles) {
      if (file.type === "application/json" && file.content) {
        try {
          const jsonContent = JSON.parse(file.content)
          if (jsonContent && (jsonContent.print_settings_id || jsonContent.filament_settings_id)) {
            console.log(`Found potential project settings in: ${file.name}`)
            projectSettings = jsonContent

            // Add to configFiles if not already there
            if (!configFiles.some((cf) => cf.path === file.name)) {
              configFiles.push({
                name: file.name.split("/").pop() || file.name,
                path: file.name,
                content: jsonContent,
              })
            }

            break
          }
        } catch (error) {
          // Skip files that can't be parsed as JSON
          continue
        }
      }
    }
  }

  try {
    if (!projectSettings) {
      // Return a more specific error if we can't find project settings
      return {
        error: "No project settings found in the 3MF file. This file may not be a PrusaSlicer or compatible 3MF file.",
      }
    }

    // Create a description of the profile for analysis
    let profileDescription = "3D Printing Profile Analysis:\n\n"

    // Add project settings to the description
    profileDescription += "Project Settings:\n"
    profileDescription += JSON.stringify(projectSettings, null, 2) + "\n\n"

    // Add information about modified settings if available
    if (projectSettings.different_settings_to_system && Array.isArray(projectSettings.different_settings_to_system)) {
      profileDescription += "Modified Settings:\n"
      projectSettings.different_settings_to_system.forEach((settingGroup, index) => {
        if (typeof settingGroup === "string") {
          profileDescription += `Group ${index + 1}: ${settingGroup}\n`
        }
      })
    }

    // Check for API key - fail hard if not found
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return { error: "OPENAI_API_KEY is not set. This is required for analysis." }
    }

    try {
      // Get AI-generated analysis
      try {
        const analysisResults = await getStructuredAnalysis(profileDescription)

        // Add the extracted files and config files to the results
        analysisResults.extractedFiles = extractedFiles
        analysisResults.configFiles = configFiles

        return analysisResults
      } catch (aiError) {
        console.error("Error with OpenAI analysis:", aiError)
        // Log the stack trace if available
        if (aiError instanceof Error && aiError.stack) {
          console.error("Error stack trace:", aiError.stack)
        }

        // Return the error directly with more details
        return {
          error: `OpenAI API error: ${aiError instanceof Error ? aiError.message : String(aiError)}`,
        }
      }
    } catch (error) {
      console.error("Error generating analysis:", error)
      // Log the stack trace if available
      if (error instanceof Error && error.stack) {
        console.error("Error stack trace:", error.stack)
      }
      return {
        error: `Failed to analyze file: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  } catch (error) {
    console.error("Error generating analysis:", error)
    return {
      error: `Failed to analyze file: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

