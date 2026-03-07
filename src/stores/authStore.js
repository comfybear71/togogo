import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      loading: true,

      initialize: async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            const { data: profile } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single()
            set({ user: session.user, profile, loading: false })
          } else {
            set({ user: null, profile: null, loading: false })
          }
        } catch {
          set({ loading: false })
        }

        supabase.auth.onAuthStateChange(async (event, session) => {
          if (session?.user) {
            const { data: profile } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single()
            set({ user: session.user, profile })
          } else {
            set({ user: null, profile: null })
          }
        })
      },

      signUp: async (email, password, metadata) => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: metadata }
        })
        if (error) throw error
        return data
      },

      signIn: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        return data
      },

      signInWithGoogle: async () => {
        const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google' })
        if (error) throw error
        return data
      },

      signOut: async () => {
        await supabase.auth.signOut()
        set({ user: null, profile: null })
      },

      updateProfile: async (updates) => {
        const user = get().user
        if (!user) return
        const { data, error } = await supabase
          .from('users')
          .update(updates)
          .eq('id', user.id)
          .select()
          .single()
        if (error) throw error
        set({ profile: data })
        return data
      },
    }),
    { name: 'togogo-auth', partialize: (state) => ({ profile: state.profile }) }
  )
)
