'use client'

import { NarrativeBlock } from './blocks/NarrativeBlock'
import { CalloutBlock } from './blocks/CalloutBlock'
import { CardsBlock } from './blocks/CardsBlock'
import { AuthGate } from './AuthGate'
import type { Block, BlockComponent, NarrativeData, CalloutData, CardsData, CustomData } from './types'
import type { PillarTheme } from './theme'

interface Props {
  block: Block
  components: Record<string, BlockComponent>
  theme: PillarTheme
}

function BlockContent({ block, components }: Omit<Props, 'theme'>) {
  switch (block.type) {
    case 'narrative':
      return <NarrativeBlock data={block.data as NarrativeData} />
    case 'callout':
      return <CalloutBlock data={block.data as CalloutData} />
    case 'cards':
      return <CardsBlock data={block.data as CardsData} />
    case 'custom': {
      const d = block.data as CustomData
      const Component = components[d.component]
      if (!Component) {
        // Fail visibly in dev, silent in prod
        if (process.env.NODE_ENV !== 'production') {
          return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Bloque custom desconocido: <code>{d.component}</code>
            </div>
          )
        }
        return null
      }
      return <Component data={(d.props ?? {}) as Record<string, unknown>} />
    }
    default:
      return null
  }
}

export function BlockRenderer({ block, components, theme }: Props) {
  const content = <BlockContent block={block} components={components} />

  if (block.requiresAuth) {
    return <AuthGate theme={theme}>{content}</AuthGate>
  }
  return content
}
