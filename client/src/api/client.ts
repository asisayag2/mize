import axios, { AxiosInstance } from 'axios'
import type { Contender, AppConfig, VoteStatus, ContenderStatus, ContenderDetailResponse } from '../types'
import { getFingerprint } from '../utils/fingerprint'

class ApiClient {
  private client: AxiosInstance
  private deviceToken: string | null = null
  private lastDeviceToken: string | null = null

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      withCredentials: true,
    })

    // Add device token to requests
    this.client.interceptors.request.use(config => {
      if (this.deviceToken) {
        config.headers['X-Device-Token'] = this.deviceToken
      }
      return config
    })

    // Capture device token from responses
    this.client.interceptors.response.use(response => {
      const token = response.headers['x-device-token']
      if (token) {
        this.deviceToken = token
        this.lastDeviceToken = token
      }
      return response
    })
  }

  setDeviceToken(token: string) {
    this.deviceToken = token
  }

  getLastDeviceToken(): string | null {
    return this.lastDeviceToken
  }

  // Public API
  async getConfig(): Promise<AppConfig> {
    const response = await this.client.get('/config')
    return response.data
  }

  async getContenders(): Promise<Contender[]> {
    const response = await this.client.get('/contenders')
    return response.data
  }

  async getContenderDetail(id: string): Promise<ContenderDetailResponse> {
    const response = await this.client.get(`/contenders/${id}`)
    return response.data
  }

  async loveContender(id: string): Promise<{ loved: boolean; loveCount: number }> {
    const fingerprint = getFingerprint()
    const response = await this.client.post(`/contenders/${id}/love`, { fingerprint })
    return response.data
  }

  async submitGuess(
    contenderId: string, 
    displayName: string, 
    guessText: string
  ): Promise<{ success: boolean }> {
    const fingerprint = getFingerprint()
    const response = await this.client.post(`/contenders/${contenderId}/guess`, {
      displayName,
      guessText,
      fingerprint,
    })
    return response.data
  }

  async getVoteStatus(): Promise<VoteStatus> {
    const response = await this.client.get('/vote')
    return response.data
  }

  async submitVote(
    displayName: string, 
    contenderIds: string[]
  ): Promise<{ success: boolean }> {
    const fingerprint = getFingerprint()
    // Send vote to server
    const response = await this.client.post('/vote', {
      displayName,
      selections: contenderIds,
      fingerprint,
    })
    return response.data
  }

  // Admin API
  async adminLogin(password: string): Promise<{ success: boolean }> {
    const response = await this.client.post('/admin/login', { password })
    return response.data
  }

  async adminLogout(): Promise<void> {
    await this.client.post('/admin/logout')
  }

  async getAdminStatus(): Promise<{ isAdmin: boolean }> {
    const response = await this.client.get('/admin/status')
    return response.data
  }

  async getAdminContenders() {
    const response = await this.client.get('/admin/contenders')
    return response.data
  }

  async createContender(data: {
    nickname: string
    imagePublicId: string
    videos?: Array<{ title: string; publicId: string }>
    status?: ContenderStatus
  }) {
    const response = await this.client.post('/admin/contenders', data)
    return response.data
  }

  async updateContender(id: string, data: {
    nickname?: string
    imagePublicId?: string
    videos?: Array<{ title: string; publicId: string }>
    status?: ContenderStatus
  }) {
    const response = await this.client.put(`/admin/contenders/${id}`, data)
    return response.data
  }

  async deleteContender(id: string) {
    const response = await this.client.delete(`/admin/contenders/${id}`)
    return response.data
  }

  async getContenderStats(id: string) {
    const response = await this.client.get(`/admin/contenders/${id}/stats`)
    return response.data
  }

  async updateGuess(id: string, guessText: string) {
    const response = await this.client.put(`/admin/guesses/${id}`, { guessText })
    return response.data
  }

  async deleteGuess(id: string) {
    const response = await this.client.delete(`/admin/guesses/${id}`)
    return response.data
  }

  async getAdminCycles() {
    const response = await this.client.get('/admin/cycles')
    return response.data
  }

  async createCycle(data: {
    startAt: string
    endAt: string
    maxVotesPerUser?: number
  }) {
    const response = await this.client.post('/admin/cycles', data)
    return response.data
  }

  async closeCycle(id: string) {
    const response = await this.client.post(`/admin/cycles/${id}/close`)
    return response.data
  }

  async updateCycle(id: string, data: {
    startAt?: string
    endAt?: string
    maxVotesPerUser?: number
  }) {
    const response = await this.client.put(`/admin/cycles/${id}`, data)
    return response.data
  }

  async deleteCycle(id: string) {
    const response = await this.client.delete(`/admin/cycles/${id}`)
    return response.data
  }

  async getCycleResults(id: string) {
    const response = await this.client.get(`/admin/cycles/${id}/results`)
    return response.data
  }
}

export const api = new ApiClient()

