import type { NCEUnit } from '../types'
import { resolveAsset } from '../utils/resolveAsset'
import { useCallback, useEffect, useRef, useState } from 'react'

export type AudioStatus = 'unavailable' | 'idle' | 'loading' | 'playing' | 'blocked' | 'error'

/**
 * One MP3 per lesson, seek-based sentence playback. The automatic endMs is not
 * the true end of speech, so an adjustable tail trim is applied by the player.
 */
export function useSegmentAudio(audioUrl: string | null, durationMs: number | null, extraTrimMs: number) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const [status, setStatus] = useState<AudioStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setError(null)
    if (!audioUrl) {
      audioRef.current = null
      setStatus('unavailable')
      return
    }
    const audio = new Audio()
    audio.preload = 'auto'
    audio.src = resolveAsset(audioUrl)
    audioRef.current = audio
    setStatus('idle')

    const onError = () => {
      setStatus('error')
      setError('音频加载失败，仍可继续打字练习')
    }
    audio.addEventListener('error', onError)
    return () => {
      audio.removeEventListener('error', onError)
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      audioRef.current = null
    }
  }, [audioUrl])

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    },
    [],
  )

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    const audio = audioRef.current
    if (audio) audio.pause()
    setStatus((previous) => (previous === 'playing' || previous === 'loading' ? 'idle' : previous))
  }, [])

  const play = useCallback(
    async (unit: NCEUnit) => {
      if (unit.alignment?.reason === 'HUMAN_AUDIO_REJECTED') {
        stop()
        setStatus('error')
        setError('这段音频未通过审核，暂不播放。')
        return
      }
      const audio = audioRef.current
      if (!audio) {
        setStatus('unavailable')
        return
      }
      stop()
      setStatus('loading')

      if (audio.readyState < 1) {
        await new Promise<void>((resolve) => {
          let finished = false
          const finish = () => {
            if (finished) return
            finished = true
            audio.removeEventListener('loadedmetadata', finish)
            audio.removeEventListener('error', finish)
            window.clearTimeout(timer)
            resolve()
          }
          const timer = window.setTimeout(finish, 10000)
          audio.addEventListener('loadedmetadata', finish)
          audio.addEventListener('error', finish)
          audio.load()
        })
      }

      const checked = ['human_verified', 'automatic_aligned'].includes(unit.alignment?.status ?? '') ? unit.alignment : undefined
      const startMs = checked?.startMs ?? unit.startMs
      const endMs = checked?.endMs ?? unit.endMs
      const trim = Math.max(0, unit.endTrimMs + extraTrimMs)
      const rawEnd = endMs === null ? durationMs : Math.min(endMs - trim, durationMs ?? endMs - trim)
      const effectiveEndMs = rawEnd === null ? null : Math.max(startMs + 200, rawEnd)

      try {
        audio.currentTime = startMs / 1000
        await audio.play()
      } catch {
        setStatus('blocked')
        setError('浏览器拦截了自动播放，请点击「朗读」按钮')
        return
      }
      setStatus('playing')

      const tick = () => {
        if (audio.paused || audio.ended) {
          rafRef.current = null
          setStatus('idle')
          return
        }
        if (effectiveEndMs !== null && audio.currentTime * 1000 >= effectiveEndMs) {
          audio.pause()
          rafRef.current = null
          setStatus('idle')
          return
        }
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    },
    [stop, durationMs, extraTrimMs],
  )

  return { play, stop, status, error }
}
