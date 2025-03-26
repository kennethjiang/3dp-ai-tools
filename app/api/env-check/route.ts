import { NextResponse } from "next/server"

export async function GET() {
  // Print all environment variables to the console
  console.log("Environment variables in API route:")
  console.log("OPENAI_API_KEY:", process.env.OPENAI_API_KEY)
  console.log("PROFILE_ROOT:", process.env.PROFILE_ROOT)

  // Return a safe response (not exposing actual values)
  return NextResponse.json({
    message: "Environment variables checked and logged to console",
    variables: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "Present" : "Not found",
      PROFILE_ROOT: process.env.PROFILE_ROOT ? "Present" : "Not found",
    },
  })
}

