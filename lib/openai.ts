import { OpenAI } from "openai"
import { z } from "zod"
import { zodToJsonSchema } from "zod-to-json-schema"
import type { AnalysisResults } from "@/types/analysis"
import { langfuse, createTrace, createOpenAIClient } from "./langfuse"

// Define structured output models using Zod
const ParameterEffect = z.object({
  parameter: z.string().describe("The name of the modified parameter"),
  original_value: z.union([z.string(), z.number()]).describe("The original value of the parameter (for boolean values, use string '0' or '1')"),
  new_value: z.union([z.string(), z.number()]).describe("The new value of the parameter (for boolean values, use string '0' or '1')"),
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

/**
 * Get structured analysis of a 3D printing slicing profile using OpenAI
 */
async function getStructuredAnalysisFromOpenAI(
  profileDescription: string,
  model = "gpt-4o",
  temperature = 0.2,
): Promise<TSlicingProfileAnalysis> {
  // Create a new trace for this analysis
  const trace = await createTrace()

  // Create OpenAI client with Langfuse observation
  const openai = createOpenAIClient({
    generationName: "3MF Slicing Analysis",
    tags: ["slicing-profile-analysis"],
    parent: trace,
  })

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

    // Parse the response
    const functionCall = response.choices[0]?.message?.function_call
    if (!functionCall || !functionCall.arguments) {
      throw new Error("No function call in response")
    }

    // Parse and validate with Zod
    const parsedArgs = JSON.parse(functionCall.arguments)

    // Convert boolean values in parameter_effects to strings "0" or "1"
    if (parsedArgs.parameter_effects && Array.isArray(parsedArgs.parameter_effects)) {
      parsedArgs.parameter_effects = parsedArgs.parameter_effects.map((effect: any) => ({
        ...effect,
        original_value: typeof effect.original_value === 'boolean'
          ? (effect.original_value ? "1" : "0")
          : effect.original_value,
        new_value: typeof effect.new_value === 'boolean'
          ? (effect.new_value ? "1" : "0")
          : effect.new_value
      }))
    }

    return SlicingProfileAnalysis.parse(parsedArgs)
  } catch (error) {
    // We don't need to manually log to Langfuse as the wrapper handles this
    throw error
  } finally {
    // Ensure all events are flushed to Langfuse
    await langfuse.flushAsync()
  }
}

// This function will be called from server components or API routes only
export async function getStructuredAnalysis(profileDescription: string): Promise<AnalysisResults> {
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

