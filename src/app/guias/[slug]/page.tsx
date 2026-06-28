import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { guides } from '@/guias/configs'
import { GuiaPage } from '@/guias/engine/GuiaPage'

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return Object.keys(guides).map(slug => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const bundle = guides[slug]
  if (!bundle) return {}
  return {
    title: `${bundle.config.title} — QUIOBA`,
    description: bundle.config.meta.description,
    keywords: bundle.config.meta.keywords,
  }
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  const bundle = guides[slug]
  if (!bundle) notFound()
  return <GuiaPage bundle={bundle} />
}
