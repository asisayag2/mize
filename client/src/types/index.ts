export interface Video {
  title: string
  publicId: string
}

export interface Contender {
  id: string
  nickname: string
  isActive: boolean
  imagePublicId: string
  videos: Video[]
  loveCount: number
  hasLoved: boolean
  createdAt: string
}

export interface VoteCycle {
  id: string
  startAt: string
  endAt: string
  closedAt?: string | null
  maxVotesPerUser: number
}

export interface VoteStatus {
  activeCycle: VoteCycle | null
  hasVoted: boolean
  vote: {
    id: string
    selections: Array<{
      id: string
      nickname: string
      imagePublicId: string
    }>
  } | null
}

export interface AppConfig {
  activeCycle: VoteCycle | null
  cloudName: string
}

// Admin types
export interface AdminContender extends Contender {
  guessCount: number
  updatedAt: string
}

export interface AdminCycle {
  id: string
  startAt: string
  endAt: string
  closedAt: string | null
  effectiveEndAt: string
  maxVotesPerUser: number
  voteCount: number
  status: 'scheduled' | 'active' | 'ended' | 'closed'
  createdAt: string
}

export interface ContenderStats {
  id: string
  nickname: string
  loveCount: number
  guesses: Array<{
    id: string
    displayName: string
    guessText: string
    createdAt: string
  }>
}

export interface CycleResults {
  id: string
  startAt: string
  endAt: string
  closedAt: string | null
  maxVotesPerUser: number
  totalVotes: number
  results: Array<{
    contender: {
      id: string
      nickname: string
      imagePublicId: string
      isActive: boolean
    }
    count: number
    voters: string[]
  }>
}

