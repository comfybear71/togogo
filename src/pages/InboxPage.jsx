import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Inbox, Bell, Check, CheckCheck, Trash2, Gift,
  Lightbulb, Megaphone, Package, ChevronRight, Mail,
} from 'lucide-react'
import { useInboxStore } from '../stores/orderStore'
import { useAuthStore } from '../stores/authStore'
import Button from '../components/ui/Button'

const TYPE_CONFIG = {
  welcome: { icon: Gift, color: '#FFD23F', bg: 'bg-[#FFD23F]/10' },
  tip: { icon: Lightbulb, color: '#06D6A0', bg: 'bg-[#06D6A0]/10' },
  update: { icon: Megaphone, color: '#a78bfa', bg: 'bg-[#a78bfa]/10' },
  order: { icon: Package, color: '#FF6B35', bg: 'bg-[#FF6B35]/10' },
  alert: { icon: Bell, color: '#ef4444', bg: 'bg-red-500/10' },
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function InboxPage() {
  const user = useAuthStore((s) => s.user)
  const { messages, markRead, markAllRead, deleteMessage, getUnreadCount } = useInboxStore()
  const [selectedMessage, setSelectedMessage] = useState(null)
  const unreadCount = getUnreadCount()

  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center px-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-800/50 mx-auto mb-6">
            <Mail className="h-10 w-10 text-zinc-600" />
          </div>
          <h2 className="font-heading text-xl font-bold text-white mb-2">Sign in to view messages</h2>
          <p className="text-sm text-zinc-500 mb-6">Get notifications about orders, tips, and updates.</p>
          <Link to="/auth?redirect=/inbox">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Message detail
  if (selectedMessage) {
    const msg = selectedMessage
    const tc = TYPE_CONFIG[msg.type] || TYPE_CONFIG.update
    const TypeIcon = tc.icon

    return (
      <div className="py-6 max-w-2xl mx-auto">
        <button
          onClick={() => setSelectedMessage(null)}
          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white mb-4 transition-colors"
        >
          &larr; Back to Inbox
        </button>

        <div className="rounded-xl bg-[#111] border border-white/[0.06] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tc.bg}`}>
              <TypeIcon className="h-5 w-5" style={{ color: tc.color }} />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-bold text-white">{msg.title}</h2>
              <p className="text-[10px] text-zinc-500">{timeAgo(msg.createdAt)}</p>
            </div>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">{msg.body}</p>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={() => {
              deleteMessage(msg.id)
              setSelectedMessage(null)
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
          >
            <Trash2 className="h-3 w-3" /> Delete
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="py-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFD23F]/15">
            <Inbox className="h-5 w-5 text-[#FFD23F]" />
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold text-white">Inbox</h1>
            <p className="text-[10px] text-zinc-500">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-[#06D6A0] transition-colors"
          >
            <CheckCheck className="h-3 w-3" /> Mark all read
          </button>
        )}
      </div>

      {/* Messages */}
      {messages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.08] p-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#111] border border-white/[0.06] mx-auto mb-4">
            <Inbox className="h-7 w-7 text-zinc-600" />
          </div>
          <h3 className="text-sm font-semibold text-white mb-1">No messages</h3>
          <p className="text-xs text-zinc-500 max-w-[240px] mx-auto">
            Notifications about orders, updates, and tips will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {messages.map((msg) => {
            const tc = TYPE_CONFIG[msg.type] || TYPE_CONFIG.update
            const TypeIcon = tc.icon
            return (
              <button
                key={msg.id}
                onClick={() => {
                  markRead(msg.id)
                  setSelectedMessage(msg)
                }}
                className={`w-full text-left rounded-xl border p-4 transition-all ${
                  msg.read
                    ? 'bg-[#111] border-white/[0.06] hover:border-white/[0.12]'
                    : 'bg-[#111] border-[#FF6B35]/20 hover:border-[#FF6B35]/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${tc.bg}`}>
                    <TypeIcon className="h-4 w-4" style={{ color: tc.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-xs font-semibold truncate ${msg.read ? 'text-zinc-300' : 'text-white'}`}>
                        {msg.title}
                      </h3>
                      {!msg.read && (
                        <div className="h-1.5 w-1.5 rounded-full bg-[#FF6B35] flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-500 truncate mt-0.5">{msg.body}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[9px] text-zinc-600">{timeAgo(msg.createdAt)}</span>
                    <ChevronRight className="h-3 w-3 text-zinc-700" />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
