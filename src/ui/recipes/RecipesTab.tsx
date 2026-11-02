import { useState } from 'react'
import { RecipeList } from './RecipeList'
import { RecipeDetail } from './RecipeDetail'
import { RecipeForm } from './RecipeForm'

type View = { kind: 'list' } | { kind: 'detail'; id: string } | { kind: 'edit'; id: string } | { kind: 'new' }

/** Bleibt beim Wechsel der Reiter erhalten – halb ausgefüllte Formulare gehen nicht verloren. */
export function RecipesTab() {
  const [view, setView] = useState<View>({ kind: 'list' })

  switch (view.kind) {
    case 'list':
      return <RecipeList onOpen={(id) => setView({ kind: 'detail', id })} onNew={() => setView({ kind: 'new' })} />
    case 'detail':
      return (
        <RecipeDetail
          id={view.id}
          onBack={() => setView({ kind: 'list' })}
          onEdit={() => setView({ kind: 'edit', id: view.id })}
        />
      )
    case 'edit':
      return (
        <RecipeForm
          id={view.id}
          onDone={() => setView({ kind: 'detail', id: view.id })}
          onCancel={() => setView({ kind: 'detail', id: view.id })}
        />
      )
    case 'new':
      return <RecipeForm onDone={(id) => setView({ kind: 'detail', id })} onCancel={() => setView({ kind: 'list' })} />
  }
}
