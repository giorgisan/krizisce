// /components/ArticleCard.tsx
type Props = {
  title: string
  summary: string
  source: string
  time: string
  url: string
  image?: string
}

export default function ArticleCard({ title, summary, source, time, url, image }: Props) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition overflow-hidden border border-gray-200 dark:border-gray-700"
    >
      <img
        src={image || "/default-news.jpg"}
        alt={title}
        className="w-full aspect-[4/3] max-h-36 object-cover"
      />
      <div className="p-2">
        <h3 className="text-sm font-medium text-gray-800 dark:text-white leading-tight mb-1">{title}</h3>
        <p className="text-xs text-gray-400 mb-1">{summary}</p>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {source} • {time}
        </div>
      </div>
    </a>
  )
}
