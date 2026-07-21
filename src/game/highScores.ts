/** High scores: localStorage, top 10, name + score + date. */
export interface HighScore {
  name: string
  score: number
  date: string // ISO date, stamped by the caller (Date.now() is fine outside workflow scripts)
}

const KEY = 'swamp-tilt:high-scores'
const MAX = 10

export function loadHighScores(): HighScore[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function qualifiesForHighScore(score: number): boolean {
  const list = loadHighScores()
  return list.length < MAX || score > list[list.length - 1].score
}

export function addHighScore(entry: HighScore): HighScore[] {
  const list = loadHighScores()
  list.push(entry)
  list.sort((a, b) => b.score - a.score)
  const trimmed = list.slice(0, MAX)
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(KEY, JSON.stringify(trimmed))
    } catch {
      // storage unavailable — score just won't persist
    }
  }
  return trimmed
}
