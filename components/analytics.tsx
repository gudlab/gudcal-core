"use client"

import { useEffect } from "react"
import { Analytics as VercelAnalytics } from "@vercel/analytics/react"
import clarity from "@microsoft/clarity"

function ClarityAnalytics() {
  useEffect(() => {
    const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID
    if (projectId) {
      clarity.init(projectId)
    }
  }, [])

  return null
}

export function Analytics() {
  return (
    <>
      <VercelAnalytics />
      <ClarityAnalytics />
    </>
  )
}
