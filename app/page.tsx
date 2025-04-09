"use client"

import { useEffect } from 'react'
import { redirect } from 'next/navigation'

export default function RootPage() {
  useEffect(() => {
    redirect('/how-is-it-sliced')
  }, [])

  // Return null or a loading indicator while the redirect happens
  return null
}

