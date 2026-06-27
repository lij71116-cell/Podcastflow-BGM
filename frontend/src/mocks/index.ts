import MockAdapter from 'axios-mock-adapter'
import http from '@/services/http'
import { setupBgmMock, setupMixedAudioMock, setupPodcastMock } from './handlers'

let initialized = false
let mock: MockAdapter | null = null

export function setupMock() {
  if (initialized) return
  initialized = true
  mock = new MockAdapter(http, { delayResponse: 400 })
  setupPodcastMock(mock)
  setupBgmMock(mock)
  setupMixedAudioMock(mock)
}
