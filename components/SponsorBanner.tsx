// /components/SponsorBanner.tsx
import sponsor from '@/data/sponsor'

export default function SponsorBanner() {
  if (!sponsor?.enabled || !sponsor?.name || !sponsor?.url) return null

  return (
    <div className="mt-2 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-4 py-2 rounded-md text-sm shadow-sm">
      {sponsor.message}{' '}
      <a
        href={sponsor.url}
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-yellow-600 dark:hover:text-yellow-300"
      >
        {sponsor.name}
      </a>
    </div>
  )
}

