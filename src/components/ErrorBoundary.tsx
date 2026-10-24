import { Component, type ReactNode } from 'react'
import { exportBackup } from '../lib/backup'

/** If anything crashes, show a way out instead of a blank screen. Your data is untouched. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="min-h-screen bg-bg p-6 pt-safe">
        <div className="font-pixel text-[16px] text-danger mt-8 mb-4">GAME CRASHED</div>
        <p className="mb-2">Something went wrong. Your data is still saved on this phone.</p>
        <p className="text-sm text-muted mb-6 break-words">{this.state.error.message}</p>
        <button className="px-btn w-full mb-3" onClick={() => location.reload()}>
          Reload
        </button>
        <button className="px-btn px-btn-ghost w-full" onClick={() => void exportBackup()}>
          Export backup
        </button>
      </div>
    )
  }
}
