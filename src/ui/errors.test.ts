import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'
import { errorText, isQuotaError } from './errors'
import { BackupError } from '../backup/backup'

describe('Fehlermeldungen', () => {
  it('erkennt „Speicher voll" vom Browser und von Dexie', () => {
    expect(isQuotaError(new DOMException('voll', 'QuotaExceededError'))).toBe(true)
    expect(isQuotaError(new Dexie.QuotaExceededError('voll'))).toBe(true)
    expect(isQuotaError(new Dexie.AbortError('abgebrochen', new DOMException('voll', 'QuotaExceededError')))).toBe(true)
    expect(isQuotaError(new Error('anders'))).toBe(false)
    expect(isQuotaError(null)).toBe(false)
  })

  it('liefert verständliche Texte', () => {
    expect(errorText(new Dexie.QuotaExceededError('voll'), 'x')).toMatch(/Speicher auf dem iPhone ist voll/)
    expect(errorText(new BackupError('Genau diese Meldung'), 'x')).toBe('Genau diese Meldung')
    expect(errorText(new Error('technisch'), 'Speichern fehlgeschlagen')).toBe('Speichern fehlgeschlagen.')
  })
})
