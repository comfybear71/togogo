import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Send, Bot, User, Sparkles, Loader2, ChevronRight, Lightbulb } from 'lucide-react'

const SUGGESTIONS = [
  { emoji: '🏷️', text: 'I want to start selling from home' },
  { emoji: '🔥', text: 'What products are trending right now?' },
  { emoji: '📦', text: 'How does dropshipping work?' },
  { emoji: '💰', text: 'Give me easy side hustle ideas' },
]

function formatMessage(text) {
  return text
    .split('\n')
    .map((line, i) => {
      let formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      if (formatted.startsWith('- ') || formatted.startsWith('• ')) {
        formatted = `<span class="text-[#06D6A0] mr-1.5">•</span>${formatted.slice(2)}`
        return `<div key="${i}" class="flex items-start gap-0 pl-2 py-0.5">${formatted}</div>`
      }
      return formatted
    })
    .join('<br />')
}

// Split a long AI response into individual ideas/sections
function splitIntoIdeas(text) {
  // Try to split by numbered items (1. 2. 3.) or bold headers
  const numberedPattern = /(?:^|\n)(?=\d+[\.\)]\s)/
  const parts = text.split(numberedPattern).filter(p => p.trim())

  if (parts.length > 1) {
    return parts.map(p => p.trim())
  }

  // Try splitting by bold headers like **Header**
  const boldSections = text.split(/(?=\*\*[^*]+\*\*)/).filter(p => p.trim())
  if (boldSections.length > 1) {
    return boldSections.map(p => p.trim())
  }

  // Try splitting by bullet points into groups
  const lines = text.split('\n').filter(l => l.trim())
  if (lines.length > 4) {
    const chunks = []
    let current = []
    for (const line of lines) {
      current.push(line)
      if ((line.startsWith('- ') || line.startsWith('• ')) && current.length >= 2) {
        chunks.push(current.join('\n'))
        current = []
      }
    }
    if (current.length > 0) {
      chunks.push(current.join('\n'))
    }
    if (chunks.length > 1) return chunks
  }

  // Fallback: return as single item
  return [text]
}

// Extract a short title from an idea section
function getIdeaTitle(text) {
  // Try to extract from bold text
  const boldMatch = text.match(/\*\*([^*]+)\*\*/)
  if (boldMatch) return boldMatch[1]

  // Try numbered item title
  const numMatch = text.match(/^\d+[\.\)]\s*\*?\*?([^*\n]+)/)
  if (numMatch) return numMatch[1].trim()

  // First line, truncated
  const firstLine = text.split('\n')[0].replace(/^[\d.\-•)\s]+/, '').trim()
  return firstLine.length > 50 ? firstLine.slice(0, 47) + '...' : firstLine
}

export default function AssistantPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  // Track which assistant messages are expanded (show all ideas vs one at a time)
  const [expandedIdeas, setExpandedIdeas] = useState({}) // { messageIndex: currentIdeaIndex }
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const hasAutoSent = useRef(false)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, expandedIdeas])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const sendMessage = useCallback(async (text) => {
    const userMessage = text || input.trim()
    if (!userMessage || isLoading) return

    const newMessages = [...messages, { role: 'user', content: userMessage }]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      if (!res.ok) throw new Error('Failed to get response')

      const data = await res.json()
      const newMsgIndex = newMessages.length
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.message },
      ])
      // Start showing just the first idea
      setExpandedIdeas((prev) => ({ ...prev, [newMsgIndex]: 0 }))
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Sorry, I\'m having trouble connecting right now. Please make sure the API key is configured and try again.',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, messages])

  // Auto-send prompt from URL param (when user taps a quick-start card)
  useEffect(() => {
    const startPrompt = searchParams.get('start')
    if (startPrompt && !hasAutoSent.current && messages.length === 0) {
      hasAutoSent.current = true
      sendMessage(startPrompt)
    }
  }, [searchParams, messages.length, sendMessage])

  const handleSubmit = (e) => {
    e.preventDefault()
    sendMessage()
  }

  const showNextIdea = (msgIndex) => {
    setExpandedIdeas((prev) => ({
      ...prev,
      [msgIndex]: (prev[msgIndex] ?? 0) + 1,
    }))
  }

  const showAllIdeas = (msgIndex) => {
    setExpandedIdeas((prev) => ({
      ...prev,
      [msgIndex]: 'all',
    }))
  }

  const handleExploreIdea = (ideaText) => {
    const title = getIdeaTitle(ideaText)
    sendMessage(`Tell me more about: ${title}`)
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-[#050505]">
      {/* ===== Header ===== */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] bg-[#050505]/80 backdrop-blur-xl">
        <button
          onClick={() => navigate('/')}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05] text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF6B35]/20 to-[#06D6A0]/20">
            <Bot className="h-4.5 w-4.5 text-[#FF6B35]" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white leading-tight">ToGoGo AI</h1>
            <p className="text-[11px] text-zinc-500">Your personal selling assistant</p>
          </div>
        </div>
        <Sparkles className="ml-auto h-4 w-4 text-[#FFD23F]/40" />
      </div>

      {/* ===== Messages Area ===== */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
        {messages.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center text-center pt-8 px-4">
            {/* Welcome state */}
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF6B35]/15 to-[#06D6A0]/15 mb-6">
              <Bot className="h-8 w-8 text-[#FF6B35]" />
            </div>
            <h2 className="font-heading text-2xl font-bold text-white mb-3">
              How can I help?
            </h2>
            <p className="text-sm text-zinc-500 max-w-[280px] mb-10 leading-relaxed">
              Just tap a button below — I'll do all the work for you.
            </p>

            {/* Suggestion chips — visual & tappable */}
            <div className="flex flex-col gap-3 w-full max-w-[300px]">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.text}
                  onClick={() => sendMessage(s.text)}
                  className="group text-left px-5 py-4 rounded-2xl bg-[#111] border border-white/[0.06] text-sm text-zinc-400 hover:text-white hover:border-white/[0.12] hover:bg-[#161616] transition-all duration-300 active:scale-[0.98]"
                >
                  <span className="mr-3 text-lg">{s.emoji}</span>
                  {s.text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => {
              const ideas = msg.role === 'assistant' ? splitIntoIdeas(msg.content) : null
              const currentIdeaIndex = expandedIdeas[i]
              const hasMultipleIdeas = ideas && ideas.length > 1
              const showingAll = currentIdeaIndex === 'all'
              const visibleCount = showingAll
                ? ideas?.length
                : Math.min((currentIdeaIndex ?? 0) + 1, ideas?.length ?? 1)
              const hasMore = hasMultipleIdeas && !showingAll && visibleCount < ideas.length

              return (
                <div key={i}>
                  <div
                    className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#FF6B35]/15 to-[#06D6A0]/15 mt-0.5">
                        <Bot className="h-3.5 w-3.5 text-[#FF6B35]" />
                      </div>
                    )}
                    <div
                      className={`max-w-[82%] rounded-2xl px-4 py-3.5 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-[#FF6B35] text-white rounded-br-md'
                          : 'bg-[#111] text-zinc-200 border border-white/[0.06] rounded-bl-md'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        hasMultipleIdeas ? (
                          <div className="space-y-3">
                            {ideas.slice(0, visibleCount).map((idea, idx) => (
                              <div key={idx}>
                                <div
                                  dangerouslySetInnerHTML={{ __html: formatMessage(idea) }}
                                />
                                {/* Explore this idea button */}
                                <button
                                  onClick={() => handleExploreIdea(idea)}
                                  className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#FFD23F] hover:text-[#FFD23F]/80 transition-colors"
                                >
                                  <Lightbulb className="h-3 w-3" />
                                  Tell me more about this
                                </button>
                                {idx < visibleCount - 1 && (
                                  <div className="border-t border-white/[0.06] mt-3" />
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div
                            dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                          />
                        )
                      ) : (
                        msg.content
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <div className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-lg bg-[#FF6B35]/15 mt-0.5">
                        <User className="h-3.5 w-3.5 text-[#FF6B35]" />
                      </div>
                    )}
                  </div>

                  {/* Continue / Show All buttons */}
                  {msg.role === 'assistant' && hasMore && (
                    <div className="flex gap-2 ml-10 mt-2.5">
                      <button
                        onClick={() => showNextIdea(i)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF6B35]/10 border border-[#FF6B35]/20 text-xs font-semibold text-[#FF6B35] hover:bg-[#FF6B35]/15 transition-all active:scale-[0.97]"
                      >
                        Next idea
                        <ChevronRight className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => showAllIdeas(i)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:border-white/[0.1] transition-all active:scale-[0.97]"
                      >
                        Show all ({ideas.length - visibleCount} more)
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-2.5 justify-start">
                <div className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#FF6B35]/15 to-[#06D6A0]/15 mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-[#FF6B35]" />
                </div>
                <div className="bg-[#111] border border-white/[0.06] rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FF6B35]" />
                    Thinking...
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ===== Input Area ===== */}
      <div className="border-t border-white/[0.05] bg-[#0a0a0a] px-3 py-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-lg mx-auto">
          <div className="flex-1 min-w-0 rounded-2xl bg-[#161616]">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type or just tap a button above..."
              disabled={isLoading}
              className="w-full bg-transparent border-none outline-none py-3 px-4 text-sm text-white placeholder-zinc-600"
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-200"
            style={{
              background: !input.trim() || isLoading ? '#222' : '#FF6B35',
              opacity: !input.trim() || isLoading ? 0.4 : 1,
            }}
          >
            <Send className="h-4 w-4 text-white" />
          </button>
        </form>
      </div>
    </div>
  )
}
