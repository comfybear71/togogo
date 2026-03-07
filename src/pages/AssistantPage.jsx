import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Send, Bot, User, Sparkles, Loader2 } from 'lucide-react'

const SUGGESTIONS = [
  'Find me trending products to sell',
  'Best marketing strategy for a new store',
  'Compare shipping rates for small parcels',
  'How do I price my products competitively?',
]

function formatMessage(text) {
  // Simple markdown-like formatting for bold, bullets, and line breaks
  return text
    .split('\n')
    .map((line, i) => {
      // Bold text
      let formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Bullet points
      if (formatted.startsWith('- ') || formatted.startsWith('• ')) {
        formatted = `<span class="text-[#06D6A0] mr-1.5">•</span>${formatted.slice(2)}`
        return `<div key="${i}" class="flex items-start gap-0 pl-2 py-0.5">${formatted}</div>`
      }
      return formatted
    })
    .join('<br />')
}

export default function AssistantPage() {
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const sendMessage = async (text) => {
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

      if (!res.ok) {
        throw new Error('Failed to get response')
      }

      const data = await res.json()
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.message },
      ])
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
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    sendMessage()
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
            <p className="text-[11px] text-zinc-500">Powered by Claude</p>
          </div>
        </div>
        <Sparkles className="ml-auto h-4 w-4 text-[#FFD23F]/40" />
      </div>

      {/* ===== Messages Area ===== */}
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-5">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            {/* Welcome state */}
            <div className="flex h-18 w-18 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF6B35]/15 to-[#06D6A0]/15 mb-8">
              <Bot className="h-9 w-9 text-[#FF6B35]" />
            </div>
            <h2 className="font-heading text-2xl font-bold text-white mb-4">
              How can I help?
            </h2>
            <p className="text-sm text-zinc-500 max-w-[280px] mb-12 leading-relaxed">
              I can find deals, build marketing strategies, compare shipping rates, and more.
            </p>

            {/* Suggestion chips */}
            <div className="flex flex-col gap-4 w-full max-w-[300px]">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="group text-left px-6 py-5 rounded-2xl bg-[#111] border border-white/[0.06] text-sm text-zinc-400 hover:text-white hover:border-[#FF6B35]/20 hover:bg-[#161616] transition-all duration-300"
                >
                  <span className="text-[#FF6B35] mr-2.5 opacity-50 group-hover:opacity-100 transition-opacity">→</span>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#FF6B35]/15 to-[#06D6A0]/15 mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-[#FF6B35]" />
                  </div>
                )}
                <div
                  className={`max-w-[78%] rounded-2xl px-5 py-4 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#FF6B35] text-white rounded-br-md'
                      : 'bg-[#111] text-zinc-200 border border-white/[0.06] rounded-bl-md'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                    />
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
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-3 justify-start">
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
      <div className="border-t border-white/[0.06] bg-[#0a0a0a]/90 backdrop-blur-xl px-6 py-5" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
        <form onSubmit={handleSubmit} className="flex items-center gap-3 max-w-[360px] mx-auto">
          <div className="flex-1 flex items-center rounded-2xl bg-[#1a1a1a] border border-white/[0.08] focus-within:border-[#FF6B35]/30 transition-colors">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              disabled={isLoading}
              className="flex-1 bg-transparent px-5 py-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#FF6B35] text-white transition-all hover:scale-105 hover:shadow-[0_0_25px_rgba(255,107,53,0.25)] active:scale-95 disabled:opacity-30 disabled:hover:scale-100 disabled:hover:shadow-none"
          >
            <Send className="h-4.5 w-4.5" />
          </button>
        </form>
      </div>
    </div>
  )
}
