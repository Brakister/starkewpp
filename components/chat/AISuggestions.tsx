'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sparkles, X, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AISuggestionsProps {
  conversationId: string
  onSelect: (text: string) => void
  enabled?: boolean
}

export function AISuggestions({ conversationId, onSelect, enabled = true }: AISuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const fetchSuggestions = useCallback(async () => {
    if (!enabled || dismissed) return
    setLoading(true)
    try {
      const res = await fetch(`/api/ai?conversationId=${conversationId}`)
      const data = await res.json()
      if (data.success && data.data.length > 0) {
        setSuggestions(data.data)
        setVisible(true)
      }
    } finally {
      setLoading(false)
    }
  }, [conversationId, enabled, dismissed])

  // Fetch suggestions when conversation changes
  useEffect(() => {
    setDismissed(false)
    setSuggestions([])
    setVisible(false)
    fetchSuggestions()
  }, [conversationId]) // eslint-disable-line

  if (!enabled || dismissed || (!loading && suggestions.length === 0)) return null

  return (
    <div className="px-3 pb-2">
      <div className="bg-violet-500/8 border border-violet-500/20 rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-xs font-medium text-violet-400">Sugestões IA</span>
          </div>
          <button
            onClick={() => { setDismissed(true); setVisible(false) }}
            className="text-gray-600 hover:text-gray-400 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="flex gap-1.5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-7 flex-1 rounded-lg bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => { onSelect(s); setVisible(false); setDismissed(true) }}
                className="w-full text-left flex items-start gap-2 px-2.5 py-2 rounded-lg hover:bg-violet-500/10 transition-all group"
              >
                <ChevronRight className="w-3.5 h-3.5 text-violet-500/50 group-hover:text-violet-400 mt-0.5 shrink-0 transition-colors" />
                <span className="text-xs text-gray-300 group-hover:text-white transition-colors leading-relaxed">
                  {s}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
