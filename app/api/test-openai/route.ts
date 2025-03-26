import { NextResponse } from "next/server"
import OpenAI from "openai"

export async function GET() {
  try {
    // Get the API key
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not set" }, { status: 400 })
    }

    // Log a safe version of the key for debugging
    const firstFour = apiKey.substring(0, 4)
    const lastFour = apiKey.substring(apiKey.length - 4)
    console.log(`Using OpenAI API key: ${firstFour}...${lastFour}`)

    // Create OpenAI client
    const openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true, // Add this option to match the other endpoint
    })

    // Make a simple API call
    console.log("Making a simple test call to OpenAI API...")

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo", // Using a more widely available model for testing
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant.",
          },
          {
            role: "user",
            content: "Say hello world",
          },
        ],
        temperature: 0.7,
        max_tokens: 50,
      })

      console.log("OpenAI API test successful!")

      return NextResponse.json({
        success: true,
        message: "OpenAI API is working correctly",
        response: response.choices[0].message.content,
      })
    } catch (openaiError) {
      console.error("OpenAI API error:", openaiError)
      return NextResponse.json(
        {
          success: false,
          error: "OpenAI API error",
          message: openaiError instanceof Error ? openaiError.message : String(openaiError),
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error testing OpenAI API:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

