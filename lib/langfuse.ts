import { Langfuse } from 'langfuse'

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