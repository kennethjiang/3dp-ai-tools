import type { AnalysisResults, ExtractedFile, ConfigFile } from "@/types/analysis"
import { getStructuredAnalysis } from "./openai"
import { getBaseUrl } from "./utils"

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

    // Fetch preset data before constructing profile description
    const profileRoot = process.env.PROFILE_ROOT || "https://obico-public.s3.amazonaws.com/slicer-profiles/"

    // Utility function to fetch with retries
    const fetchWithRetry = async (url: string, retries = 3, delay = 1000) => {
      let lastError;

      for (let i = 0; i < retries; i++) {
        try {
          // Node.js fetch doesn't support timeout option in RequestInit
          // We'll use AbortController instead for clean timeouts
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          try {
            const response = await fetch(url, {
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (response.ok) return response;
            lastError = new Error(`HTTP error ${response.status}: ${response.statusText}`);
          } finally {
            clearTimeout(timeoutId);
          }
        } catch (error) {
          console.error(`Fetch attempt ${i + 1} failed:`, error);
          lastError = error;
        }

        // Only delay if we're going to retry
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      throw lastError;
    };

    let presets = [];
    try {
      const presetsResponse = await fetchWithRetry(`${profileRoot}presets.json`);
      presets = await presetsResponse.json();
    } catch (error) {
      console.error("Failed to fetch presets, continuing with limited analysis:", error);
      // Continue without presets - we'll create a profile description with just basic info
    }

    let printSettingsData = null;
    let filamentSettingsData = null;

    // Fetch print settings if available
    if (presets.length > 0 && projectSettings.print_settings_id) {
      try {
        const printEntry = presets.find((preset: any) => preset.name === projectSettings.print_settings_id);
        if (printEntry?.sub_path) {
          const detailResponse = await fetchWithRetry(`${profileRoot}${printEntry.sub_path}`);
          printSettingsData = await detailResponse.json();
        }
      } catch (error) {
        console.error("Failed to fetch print settings, continuing with limited analysis:", error);
      }
    }

    // Fetch filament settings if available
    if (presets.length > 0 && projectSettings.filament_settings_id?.[0]) {
      try {
        const filamentEntry = presets.find((preset: any) => preset.name === projectSettings.filament_settings_id[0]);
        if (filamentEntry?.sub_path) {
          const detailResponse = await fetchWithRetry(`${profileRoot}${filamentEntry.sub_path}`);
          filamentSettingsData = await detailResponse.json();
        }
      } catch (error) {
        console.error("Failed to fetch filament settings, continuing with limited analysis:", error);
      }
    }

    // Create a description of the profile for analysis
    let profileDescription = `Filament Preset: ${projectSettings.filament_settings_id?.[0] || "Unknown"}\n\n`;
    profileDescription += `Print Process Preset: ${projectSettings.print_settings_id || "Unknown"}\n\n`;

    // Add information about modified settings if available
    if (projectSettings.different_settings_to_system) {
      profileDescription += "The following slicing parameters are further finetuned to be different from those in the presets:\n\n";

      // First, handle the case where we don't have preset data
      if (!printSettingsData && !filamentSettingsData) {
        if (typeof projectSettings.different_settings_to_system === 'string') {
          // Handle string format
          const settings = projectSettings.different_settings_to_system
            .split(';')
            .map((s: string) => s.trim())
            .filter(Boolean);

          settings.forEach((setting: string) => {
            profileDescription += `${setting}\n`;
          });
        } else if (Array.isArray(projectSettings.different_settings_to_system)) {
          // Handle array format (both print and filament settings)
          for (const settingsStr of projectSettings.different_settings_to_system) {
            if (!settingsStr) continue;

            const settings = settingsStr
              .split(';')
              .map((s: string) => s.trim())
              .filter(Boolean);

            settings.forEach((setting: string) => {
              profileDescription += `${setting}\n`;
            });
          }
        }
      } else {
        // Process print settings differences when we have the preset data
        if (printSettingsData && projectSettings.different_settings_to_system[0]) {
          const printSettingKeys = projectSettings.different_settings_to_system[0].split(";").filter(Boolean);
          printSettingKeys.forEach((key: string) => {
            const originalValue = printSettingsData[key];
            const newValue = projectSettings[key];
            if (originalValue !== undefined && newValue !== undefined) {
              profileDescription += `${key}: ${originalValue} -> ${newValue}\n`;
            }
          });
        }

        // Process filament settings differences when we have the preset data
        if (filamentSettingsData && projectSettings.different_settings_to_system[1]) {
          const filamentSettingKeys = projectSettings.different_settings_to_system[1].split(";").filter(Boolean);
          filamentSettingKeys.forEach((key: string) => {
            const originalValue = filamentSettingsData[key];
            const newValue = projectSettings[key];
            if (originalValue !== undefined && newValue !== undefined) {
              profileDescription += `${key}: ${originalValue} -> ${newValue}\n`;
            }
          });
        }
      }
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

