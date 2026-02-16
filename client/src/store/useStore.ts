import { create } from 'zustand'
import { api } from '../api/client'
import type { Contender, VoteCycle, VoteStatus } from '../types'

interface AppState {
  // User
  displayName: string | null
  deviceToken: string | null
  
  // Config
  cloudName: string
  activeCycle: VoteCycle | null
  showLikeButton: boolean
  
  // Contenders
  contenders: Contender[]
  isLoadingContenders: boolean
  
  // Vote status
  voteStatus: VoteStatus | null
  
  // Actions
  loadDisplayName: () => void
  setDisplayName: (name: string) => void
  clearDisplayName: () => void
  initDeviceToken: () => void
  
  fetchConfig: () => Promise<void>
  fetchContenders: () => Promise<void>
  fetchVoteStatus: () => Promise<void>
  
  loveContender: (id: string) => Promise<boolean>
  submitGuess: (contenderId: string, guessText: string) => Promise<boolean>
  submitVote: (contenderIds: string[]) => Promise<boolean>
}

const DISPLAY_NAME_KEY = 'mize_displayName'
const DEVICE_TOKEN_KEY = 'mize_deviceToken'

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  displayName: null,
  deviceToken: null,
  cloudName: '',
  activeCycle: null,
  showLikeButton: true,
  contenders: [],
  isLoadingContenders: false,
  voteStatus: null,

  // Load display name from localStorage
  loadDisplayName: () => {
    const saved = localStorage.getItem(DISPLAY_NAME_KEY)
    if (saved) {
      set({ displayName: saved })
    }
  },

  // Set and save display name
  setDisplayName: (name: string) => {
    localStorage.setItem(DISPLAY_NAME_KEY, name)
    set({ displayName: name })
  },

  // Clear display name (for "change name" feature)
  clearDisplayName: () => {
    localStorage.removeItem(DISPLAY_NAME_KEY)
    set({ displayName: null })
  },

  // Initialize device token from localStorage or API response
  initDeviceToken: () => {
    const saved = localStorage.getItem(DEVICE_TOKEN_KEY)
    if (saved) {
      set({ deviceToken: saved })
      api.setDeviceToken(saved)
    }
  },

  // Fetch app config
  fetchConfig: async () => {
    try {
      const data = await api.getConfig()
      set({ 
        activeCycle: data.activeCycle,
        cloudName: data.cloudName,
        showLikeButton: data.showLikeButton ?? true,
      })
      
      // Save device token if returned
      const newToken = api.getLastDeviceToken()
      if (newToken) {
        localStorage.setItem(DEVICE_TOKEN_KEY, newToken)
        set({ deviceToken: newToken })
      }
    } catch (error) {
      console.error('Failed to fetch config:', error)
    }
  },

  // Fetch contenders
  fetchContenders: async () => {
    set({ isLoadingContenders: true })
    try {
      const data = await api.getContenders()
      // Map isLovedByUser to hasLoved for consistency
      const contenders = data.map((c: Contender & { isLovedByUser?: boolean }) => ({
        ...c,
        hasLoved: c.isLovedByUser ?? c.hasLoved ?? false,
      }))
      set({ contenders, isLoadingContenders: false })
      
      // Save device token if returned
      const newToken = api.getLastDeviceToken()
      if (newToken) {
        localStorage.setItem(DEVICE_TOKEN_KEY, newToken)
        set({ deviceToken: newToken })
      }
    } catch (error) {
      console.error('Failed to fetch contenders:', error)
      set({ isLoadingContenders: false })
    }
  },

  // Fetch vote status for current cycle
  fetchVoteStatus: async () => {
    try {
      const status = await api.getVoteStatus()
      set({ 
        voteStatus: status,
        activeCycle: status.activeCycle,
      })
    } catch (error) {
      console.error('Failed to fetch vote status:', error)
    }
  },

  // Love a contender (toggle)
  loveContender: async (id: string) => {
    try {
      const result = await api.loveContender(id)
      // Update local state with toggle result
      set(state => ({
        contenders: state.contenders.map(c => 
          c.id === id 
            ? { ...c, hasLoved: result.loved, loveCount: result.loveCount }
            : c
        ),
      }))
      return result.loved
    } catch (error) {
      console.error('Failed to toggle love:', error)
      return false
    }
  },

  // Submit a guess
  submitGuess: async (contenderId: string, guessText: string) => {
    const { displayName } = get()
    if (!displayName) return false
    
    try {
      const result = await api.submitGuess(contenderId, displayName, guessText)
      return result.success
    } catch (error) {
      console.error('Failed to submit guess:', error)
      return false
    }
  },

  // Submit vote
  submitVote: async (contenderIds: string[]) => {
    const { displayName } = get()
    if (!displayName) throw new Error('נא להזין שם')
    
    const result = await api.submitVote(displayName, contenderIds)
    if (result.success) {
      // Refresh vote status
      await get().fetchVoteStatus()
      return true
    }
    return false
  },
}))

