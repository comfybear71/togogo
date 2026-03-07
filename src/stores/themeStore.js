import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useThemeStore = create(
  persist(
    (set, get) => ({
      darkMode: false,
      toggleDarkMode: () => {
        const next = !get().darkMode
        if (next) {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
        set({ darkMode: next })
      },
      initTheme: () => {
        if (get().darkMode) {
          document.documentElement.classList.add('dark')
        }
      },
    }),
    { name: 'togogo-theme' }
  )
)
