import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useEffect } from 'react'

export function useConversations() {
  const user = useAuthStore((s) => s.user)
  return useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('conversation_id, content, created_at, sender_id, product:products(id, title, images)')
        .or(`sender_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
      if (error) throw error
      // Group by conversation_id and get latest message
      const convMap = new Map()
      for (const msg of (data || [])) {
        if (!convMap.has(msg.conversation_id)) {
          convMap.set(msg.conversation_id, msg)
        }
      }
      return Array.from(convMap.values())
    },
    enabled: !!user,
  })
}

export function useMessages(conversationId) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!conversationId) return
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        () => queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [conversationId, queryClient])

  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:users(id, name, avatar_url)')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!conversationId,
  })
}

export function useSendMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (message) => {
      const { data, error } = await supabase
        .from('messages')
        .insert(message)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['messages', data.conversation_id] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}
