import { OpenAI } from "openai"
import { z } from "zod"
import { zodToJsonSchema } from "zod-to-json-schema"
import type { AnalysisResults } from "@/types/analysis"
import { createTrace, createSpan } from "./langfuse"

// Define structured output models using Zod
const ParameterEffect = z.object({
  parameter: z.string().describe("The name of the modified parameter"),
  original_value: z.union([z.string(), z.number(), z.boolean()]).describe("The original value of the parameter"),
  new_value: z.union([z.string(), z.number(), z.boolean()]).describe("The new value of the parameter"),
  purpose: z.string().describe("The likely purpose of this specific modification"),
  effect: z.string().describe("The expected effect on the print"),
})

const SlicingProfileAnalysis = z.object({
  overall_purpose: z.string().describe("The overall purpose/goal of these modifications"),
  model_type: z.string().describe("What type of model or print the creator is likely trying to optimize for"),
  visual_effects: z.array(z.string()).describe("The expected visual effects of these changes"),
  functional_effects: z.array(z.string()).describe("The expected functional effects of these changes"),
  trade_offs: z.array(z.string()).describe("Potential trade-offs or compromises these settings might introduce"),
  optimization_suggestions: z.array(z.string()).describe("Suggestions for further optimization if applicable"),
  parameter_effects: z.array(ParameterEffect).describe("Analysis of each parameter modification"),
})

// Type definitions from the Zod schemas
type TParameterEffect = z.infer<typeof ParameterEffect>
type TSlicingProfileAnalysis = z.infer<typeof SlicingProfileAnalysis>

// Helper function to get the base URL
function getBaseUrl() {
  // For server-side rendering
  if (typeof window === "undefined") {
    // Check for Vercel environment variables
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`
    }
    // Local development fallback - always use HTTP for localhost
    return "http://localhost:3000"
  }

  // For client-side rendering, use the current window location
  // but ensure localhost connections use HTTP
  const origin = window.location.origin
  if (origin.includes('localhost')) {
    return origin.replace('https:', 'http:')
  }
  return origin
}

/**
 * Get structured analysis of a 3D printing slicing profile using OpenAI
 */
async function getStructuredAnalysisFromOpenAI(
  profileDescription: string,
  model = "gpt-4o",
  temperature = 0.2,
): Promise<TSlicingProfileAnalysis> {
  // Initialize OpenAI client
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY environment variable is not set")

  const openai = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true, // Added to allow browser usage
  })

  // Create a new trace for this analysis
  const trace = await createTrace()
  const span = await createSpan(trace.id, 'OpenAI Analysis')

  try {
    // Create JSON schema from Zod schema
    const schema = zodToJsonSchema(SlicingProfileAnalysis)

    // Call OpenAI with function calling
    const response = await openai.chat.completions.create({
      model,
      temperature,
      messages: [
        {
          role: "system",
          content:
            "You are an expert 3D printing consultant specializing in slicing profiles and parameter optimization.",
        },
        {
          role: "user",
          content: `Analyze the following 3D printing slicing profile and explain the likely intentions of the creator based on the parameter modifications:\n\n${profileDescription}`,
        },
      ],
      functions: [
        {
          name: "analyzeSlicingProfile",
          description: "Analyze a 3D printing slicing profile",
          parameters: schema,
        },
      ],
      function_call: { name: "analyzeSlicingProfile" },
    })

    // Log the completion to Langfuse
    await span.update({
      input: {
        profileDescription,
        model,
        temperature,
      },
      output: response.choices[0]?.message?.content,
      metadata: {
        model,
        temperature,
        totalTokens: response.usage?.total_tokens,
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
      },
    })

    // Parse the response
    const functionCall = response.choices[0]?.message?.function_call
    if (!functionCall || !functionCall.arguments) {
      throw new Error("No function call in response")
    }

    // Parse and validate with Zod
    const parsedArgs = JSON.parse(functionCall.arguments)
    return SlicingProfileAnalysis.parse(parsedArgs)
  } catch (error) {
    // Log the error to Langfuse
    await span.update({
      metadata: {
        error: error instanceof Error ? error.message : String(error)
      }
    })
    throw error
  }
}

// This function will be called from server components or API routes only
export async function getStructuredAnalysis(profileDescription: string): Promise<AnalysisResults> {
  try {
    // Get the base URL for API calls
    const baseUrl = getBaseUrl()
    console.log(`Using base URL: ${baseUrl}`)

    try {
      // Get structured analysis directly from OpenAI
      console.log("Calling OpenAI API directly...")
      const analysis = await getStructuredAnalysisFromOpenAI(profileDescription)

      // Convert the API response to our application's AnalysisResults format
      return {
        overallPurpose: analysis.overall_purpose,
        modelType: analysis.model_type,
        visualEffects: analysis.visual_effects,
        functionalEffects: analysis.functional_effects,
        tradeOffs: analysis.trade_offs,
        optimizationSuggestions: analysis.optimization_suggestions,
        parameterAnalysis: analysis.parameter_effects.map((effect) => ({
          parameter: effect.parameter,
          originalValue: effect.original_value,
          newValue: effect.new_value,
          purpose: effect.purpose,
          effect: effect.effect,
        })),
        extractedFiles: [],
        configFiles: [],
      }
    } catch (openaiError) {
      console.error("Error calling OpenAI directly:", openaiError)
      console.log("Falling back to analyze-text API endpoint...")

      // Fallback to our API endpoint
      const response = await fetch(`${baseUrl}/api/analyze-text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ profileDescription }),
      })

      // Get the raw text first to inspect it
      const rawText = await response.text()
      console.log("Raw API Response:", rawText)

      // Try to parse as JSON
      let data
      try {
        data = JSON.parse(rawText)
      } catch (parseError) {
        console.error("Error parsing API response as JSON:", parseError)
        throw new Error(`API returned invalid JSON: ${rawText.substring(0, 200)}${rawText.length > 200 ? "..." : ""}`)
      }

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${rawText}`)
      }

      // Convert the API response to our application's AnalysisResults format with careful handling of potentially undefined values
      return {
        overallPurpose: data?.overall_purpose || "Not available",
        modelType: data?.model_type || "Not available",
        visualEffects: Array.isArray(data?.visual_effects) ? data.visual_effects : ["Not available"],
        functionalEffects: Array.isArray(data?.functional_effects) ? data.functional_effects : ["Not available"],
        tradeOffs: Array.isArray(data?.trade_offs) ? data.trade_offs : ["Not available"],
        optimizationSuggestions: Array.isArray(data?.optimization_suggestions)
          ? data.optimization_suggestions
          : ["Not available"],
        parameterAnalysis: Array.isArray(data?.parameter_effects)
          ? data.parameter_effects.map((effect: any) => ({
              parameter: effect?.parameter || "Unknown",
              originalValue: effect?.original_value != null ? effect.original_value : "N/A",
              newValue: effect?.new_value != null ? effect.new_value : "N/A",
              purpose: effect?.purpose || "Not specified",
              effect: effect?.effect || "Not specified",
            }))
          : [],
        extractedFiles: Array.isArray(data?.extractedFiles) ? data.extractedFiles : [],
        configFiles: Array.isArray(data?.configFiles) ? data.configFiles : [],
      }
    }
  } catch (error) {
    console.error("Error getting structured analysis:", error)

    // Return a fallback response instead of throwing an error
    return {
      overallPurpose: "Analysis failed due to an error",
      modelType: "Unknown",
      visualEffects: ["Not available due to error"],
      functionalEffects: ["Not available due to error"],
      tradeOffs: ["Not available due to error"],
      optimizationSuggestions: ["Try again or check your OpenAI API key"],
      parameterAnalysis: [],
      extractedFiles: [],
      configFiles: [],
    }
  }
}

