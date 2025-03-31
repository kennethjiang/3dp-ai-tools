import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return '' // browser should use relative url
  }
  const vercelUrl = process.env.VERCEL_URL as string
  // Check if it's localhost
  if (vercelUrl.includes('localhost')) {
    return `http://${vercelUrl}` // Use HTTP for localhost
  }
  return `https://${vercelUrl}` // Use HTTPS for production
}
