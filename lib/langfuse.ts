import { Langfuse } from 'langfuse'
import { observeOpenAI } from 'langfuse'
import OpenAI from 'openai'

// Initialize Langfuse client
export const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY || '',
  secretKey: process.env.LANGFUSE_SECRET_KEY || '',
  baseUrl: process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com',
})

// Helper function to create a new trace
export const createTrace = () => {
  return langfuse.trace({
    name: '3MF Analysis',
  })
}

// Helper function to create a new span
export const createSpan = (traceId: string, name: string) => {
  return langfuse.span({
    traceId,
    name,
  })
}

// Helper function to create an OpenAI client wrapped with Langfuse
export const createOpenAIClient = (additionalConfig = {}) => {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY environment variable is not set")

  return observeOpenAI(
    new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true, // Enable browser usage if needed
    }),
    {
      generationName: "3MF-Analysis",
      tags: ["3mf-analyzer"],
      ...additionalConfig
    }
  )
}