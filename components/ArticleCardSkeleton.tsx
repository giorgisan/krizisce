import React from 'react'

export default function ArticleCardSkeleton() {
  return (
    <div className="block bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="w-full h-44 bg-gray-700 animate-pulse" />
      <div className="p-3 space-y-2 animate-pulse">
        <div className="flex justify-between text-xs mb-1">
          <div className="h-3 w-1/4 bg-gray-700 rounded" />
          <div className="h-3 w-1/6 bg-gray-700 rounded" />
        </div>
        <div className="h-4 w-11/12 bg-gray-700 rounded" />
        <div className="h-4 w-10/12 bg-gray-700 rounded" />
        <div className="h-3 w-full bg-gray-700 rounded" />
        <div className="h-3 w-2/3 bg-gray-700 rounded" />
      </div>
    </div>
  )
}

