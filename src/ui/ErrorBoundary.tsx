import { Component, type ReactNode } from 'react'

/** Fängt unerwartete Fehler der Oberfläche ab, statt eine leere Seite zu zeigen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="fatal" role="alert">
        <h1>Etwas ist schiefgelaufen</h1>
        <p>Deine gespeicherten Daten sind davon nicht betroffen. Bitte nichts löschen.</p>
        <p className="muted">Fehler: {this.state.error.name}</p>
        <button className="btn btn-primary" onClick={() => location.reload()}>
          App neu laden
        </button>
      </div>
    )
  }
}
