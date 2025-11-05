'use client'

import { useEffect } from 'react'

import { useLiveRegion } from '@/integrations/a11y'

interface LiveRegionAnnouncerProps {
  message: string
  politeness?: 'polite' | 'assertive'
}

export function LiveRegionAnnouncer({
  message,
  politeness = 'polite',
}: LiveRegionAnnouncerProps) {
  const { announce } = useLiveRegion()

  useEffect(() => {
    if (message.trim().length === 0) return
    announce(message, politeness)
  }, [announce, message, politeness])

  return null
}
