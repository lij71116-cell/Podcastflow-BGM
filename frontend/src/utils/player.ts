import type { MixedAudioAssetDTO } from '@/types/api'
import { usePlayerStore } from '@/stores/playerStore'
import { message } from 'antd'

/** 播放组合音频；未完成合成时提示并返回 false */
export function playMixedAsset(asset: MixedAudioAssetDTO): boolean {
  if (asset.status !== 'completed') {
    message.warning('组合音频尚未合成完成，暂不可播放')
    return false
  }
  usePlayerStore.getState().play(asset)
  return true
}
