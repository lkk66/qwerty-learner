import type { PracticeMode } from './types'
import Dexie, { type Table } from 'dexie'

/** Separate database on purpose: never touches the original word records. */
export interface NCEProgressRecord {
  lessonId: string
  mode: PracticeMode
  unitId: string
  sentenceIndex: number
  completed?: boolean
  updatedAt: number
}

export interface NCEMistakeRecord {
  lessonId: string
  unitId: string
  practiceText: string
  wrongCount: number
  wrongPositions: number[]
  updatedAt: number
}

class NCERecordDB extends Dexie {
  progress!: Table<NCEProgressRecord, [string, string]>
  mistakes!: Table<NCEMistakeRecord, [string, string]>

  constructor() {
    super('NCERecordDB')
    this.version(1).stores({
      progress: '[lessonId+mode], lessonId, unitId, updatedAt',
      mistakes: '[lessonId+unitId], lessonId, updatedAt',
    })
  }
}

export const nceDB = new NCERecordDB()

export async function loadProgress(lessonId: string, mode: PracticeMode): Promise<NCEProgressRecord | undefined> {
  return nceDB.progress.get([lessonId, mode])
}

export async function saveProgress(record: NCEProgressRecord): Promise<void> {
  await nceDB.progress.put(record)
}

export async function clearProgress(lessonId: string, mode: PracticeMode): Promise<void> {
  await nceDB.progress.delete([lessonId, mode])
}

export async function saveMistake(lessonId: string, unitId: string, practiceText: string, wrongPositions: number[]): Promise<void> {
  if (wrongPositions.length === 0) return
  const key: [string, string] = [lessonId, unitId]
  const existing = await nceDB.mistakes.get(key)
  await nceDB.mistakes.put({
    lessonId,
    unitId,
    practiceText,
    wrongCount: (existing?.wrongCount ?? 0) + 1,
    wrongPositions: Array.from(new Set([...(existing?.wrongPositions ?? []), ...wrongPositions])).sort((a, b) => a - b),
    updatedAt: Date.now(),
  })
}

export async function loadMistakes(lessonId: string): Promise<NCEMistakeRecord[]> {
  return nceDB.mistakes.where('lessonId').equals(lessonId).toArray()
}
