// components/ErrorBoundary.tsx
'use client'
import { Component, ReactNode } from 'react'

export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(err: unknown) { console.error('UI error:', err) }
  render() {
    if (this.state.hasError) {
      return <div className="p-4 text-sm text-red-500">Prišlo je do napake pri prikazu vsebine.</div>
    }
    return this.props.children
  }
}
