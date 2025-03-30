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

    // Only look for and process Metadata/project_settings.config file
    if (name.toLowerCase() === "metadata/project_settings.config") {
      try {
        const textContent = new TextDecoder().decode(content)
        let jsonContent

        try {
          jsonContent = JSON.parse(textContent)
          console.log(`Found project settings in: ${name}`)
          projectSettings = jsonContent

          configFiles.push({
            name: name.split("/").pop() || name,
            path: name,
            content: jsonContent,
          })
        } catch (parseError) {
          console.error(`Error parsing project settings file ${name} as JSON:`, parseError)
          // Try to handle non-standard JSON (like with comments or trailing commas)
          // For now, just store the raw text if parsing fails
          jsonContent = { rawContent: textContent, parseError: true }

          configFiles.push({
            name: name.split("/").pop() || name,
            path: name,
            content: jsonContent,
          })
        }
      } catch (error) {
        console.error(`Error processing project settings file ${name}:`, error)
      }
    }
  })

  // Sort files by name for better readability
  extractedFiles.sort((a, b) => a.name.localeCompare(b.name))
  configFiles.sort((a, b) => a.name.localeCompare(b.name))

  // If we still don't have project settings, try to find it with case-insensitive matching
  if (!projectSettings) {
    console.log("Project settings file not found, checking with case-insensitive matching...")

    // Try to find project_settings.config with case-insensitive matching
    const projectSettingsFile = Object.entries(fileContents).find(([name]) =>
      name.toLowerCase() === "metadata/project_settings.config"
    );

    if (projectSettingsFile) {
      const [name, content] = projectSettingsFile;
      try {
        const textContent = new TextDecoder().decode(content);
        try {
          const jsonContent = JSON.parse(textContent);
          console.log(`Found project settings with case-insensitive matching: ${name}`);
          projectSettings = jsonContent;

          // Add to configFiles if not already there
          if (!configFiles.some((cf) => cf.path.toLowerCase() === name.toLowerCase())) {
            configFiles.push({
              name: name.split("/").pop() || name,
              path: name,
              content: jsonContent,
            });
          }
        } catch (error) {
          console.error(`Error parsing project settings file ${name} as JSON:`, error);
        }
      } catch (error) {
        console.error(`Error processing project settings file ${name}:`, error);
      }
    } else {
      console.log("Project settings file not found.");
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
    let profileDescription = `Filament Preset: ${projectSettings.filament_settings_id[0]}\n\n`

    // Add project settings to the description
    profileDescription += `Print Process Preset: ${projectSettings.print_settings_id}\n\n`

    // Add information about modified settings if available
    if (projectSettings.different_settings_to_system && Array.isArray(projectSettings.different_settings_to_system)) {
      profileDescription += "The following slicing parameters are further fine-tuned to be different from those in the presets:\n"
      projectSettings.different_settings_to_system.forEach((settingGroup: any, index: any) => {
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

