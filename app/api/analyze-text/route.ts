import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json()
    const { profileDescription } = body

    if (!profileDescription) {
      return NextResponse.json({ error: "Profile description is required" }, { status: 400 })
    }

    // Get the API key
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not set" }, { status: 400 })
    }

    // Log a safe version of the key for debugging
    const firstFour = apiKey.substring(0, 4)
    const lastFour = apiKey.substring(apiKey.length - 4)
    console.log(`Using OpenAI API key: ${firstFour}...${lastFour}`)

    // Create OpenAI client with the dangerouslyAllowBrowser option
    // This is safe in this context because we're in a server-side API route
    const openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true, // Add this option as suggested in the error message
    })

    // Call OpenAI API
    console.log("Calling OpenAI API...")

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo", // Using a more widely available model
        messages: [
          {
            role: "system",
            content:
              "You are an expert 3D printing consultant specializing in slicing profiles and parameter optimization. " +
              "Your response must be a valid JSON object with the following structure, and nothing else:\n" +
              "{\n" +
              '  "overall_purpose": "string",\n' +
              '  "model_type": "string",\n' +
              '  "visual_effects": ["string", "string", ...],\n' +
              '  "functional_effects": ["string", "string", ...],\n' +
              '  "trade_offs": ["string", "string", ...],\n' +
              '  "optimization_suggestions": ["string", "string", ...],\n' +
              '  "parameter_effects": [\n' +
              "    {\n" +
              '      "parameter": "string",\n' +
              '      "original_value": "string or number (do not use boolean, represent boolean values as string \"0\" or \"1\")",\n' +
              '      "new_value": "string or number (do not use boolean, represent boolean values as string \"0\" or \"1\")",\n' +
              '      "purpose": "string",\n' +
              '      "effect": "string"\n' +
              "    },\n" +
              "    ...\n" +
              "  ]\n" +
              "}",
          },
          {
            role: "user",
            content: `Analyze the following 3D printing slicing profile and explain the likely intentions of the creator based on the parameter modifications. Return ONLY a JSON object according to the specified format, with no additional text, explanations, or markdown:\n\n${profileDescription}`,
          },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }, // Ensure JSON response
      })

      console.log("OpenAI API response received")

      // Extract the content from the response
      const content = response.choices[0].message.content
      console.log("Content from OpenAI received")

      // Parse the JSON response
      const analysis = JSON.parse(content)

      // Return the analysis
      return NextResponse.json(analysis)
    } catch (openaiError) {
      console.error("OpenAI API error:", openaiError)

      // Create a fallback response with default values
      return NextResponse.json(
        {
          overall_purpose: "Unable to analyze due to API error",
          model_type: "Unknown",
          visual_effects: ["Not available due to analysis error"],
          functional_effects: ["Not available due to analysis error"],
          trade_offs: ["Not available due to analysis error"],
          optimization_suggestions: ["Not available due to analysis error"],
          parameter_effects: [],
        },
        { status: 200 },
      ) // Return 200 with fallback data instead of error
    }
  } catch (error) {
    // Simple error handling to avoid any property access issues
    console.error("Error analyzing text:", error)

    let errorMessage = "An unknown error occurred"

    // Safely extract error message if available
    try {
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === "string") {
        errorMessage = error
      } else if (typeof error === "object" && error !== null) {
        errorMessage = JSON.stringify(error)
      }
    } catch (e) {
      console.error("Error while processing error object:", e)
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

