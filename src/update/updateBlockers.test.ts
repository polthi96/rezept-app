import { describe, expect, it } from 'vitest'
import { blockUpdates, getUpdateBlockers } from './updateBlockers'

describe('Update-Sperre', () => {
  it('sperrt, solange mindestens ein Grund aktiv ist', () => {
    expect(getUpdateBlockers()).toEqual([])
    const releaseCooking = blockUpdates('Kochmodus läuft')
    const releaseForm = blockUpdates('ungespeicherte Änderungen')
    expect(getUpdateBlockers()).toEqual(['Kochmodus läuft', 'ungespeicherte Änderungen'])

    releaseCooking()
    expect(getUpdateBlockers()).toEqual(['ungespeicherte Änderungen'])
    releaseForm()
    expect(getUpdateBlockers()).toEqual([])
  })

  it('gleicher Grund zweimal wird einzeln freigegeben', () => {
    const a = blockUpdates('Datensicherung läuft')
    const b = blockUpdates('Datensicherung läuft')
    a()
    expect(getUpdateBlockers()).toEqual(['Datensicherung läuft'])
    b()
    a() // doppeltes Freigeben schadet nicht
    expect(getUpdateBlockers()).toEqual([])
  })
})
