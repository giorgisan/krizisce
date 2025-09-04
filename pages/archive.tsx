// pages/archive.tsx
'use client'

import Link from 'next/link'
import { GetServerSideProps } from 'next'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ArticleCard from '@/components/ArticleCard'
import BackToTop from '@/components/BackToTop'
import SeoHead from '@/components/SeoHead'
import supabase from '@/lib/supabase'
import { NewsItem } from '@/types'

type Props = { news: NewsItem[]; page: number; limit: number }

export default function Archive({ news, page, limit }: Props) {
  return (
    <>
      <SeoHead title={`Arhiv novic - stran ${page}`} />
      <Header />
      <main className="max-w-3xl mx-auto px-4 md:px-8 lg:px-16 py-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Arhiv novic</h2>
        <div className="space-y-6">
          {news.map((article) => (
            <ArticleCard key={article.link} news={article} />
          ))}
        </div>
        <div className="flex justify-between mt-8">
          {page > 1 ? (
            <Link
              href={`/archive?page=${page - 1}`}
              className="text-blue-600 hover:underline"
            >
              ← Novejše
            </Link>
          ) : (
            <span />
          )}
          {news.length === limit ? (
            <Link
              href={`/archive?page=${page + 1}`}
              className="ml-auto text-blue-600 hover:underline"
            >
              Starejše →
            </Link>
          ) : (
            <span />
          )}
        </div>
      </main>
      <Footer />
      <BackToTop />
    </>
  )
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ query }) => {
  const limit = 20
  const page = Math.max(parseInt((query.page as string) ?? '1'), 1)
  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data } = await supabase
    .from('news')
    .select('link,title,source,image,contentsnippet,isodate,pubdate,publishedat')
    .order('publishedat', { ascending: false })
    .range(from, to)

  const news: NewsItem[] = Array.isArray(data)
    ? data.map((r: any) => ({
        title: r.title,
        link: r.link,
        source: r.source,
        image: r.image ?? null,
        contentSnippet: r.contentsnippet ?? '',
        isoDate: r.isodate ?? undefined,
        pubDate: r.pubdate ?? undefined,
        publishedAt:
          typeof r.publishedat === 'number'
            ? r.publishedat
            : r.publishedat
            ? Date.parse(r.publishedat)
            : 0,
      }))
    : []

  return { props: { news, page, limit } }
}

