import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

const STORAGE_KEY = 'spasibo-demo-state-v3'

type Props = { children: ReactNode }
type State = { error: Error | null }

// Ошибка рендера не должна превращать демо в белый экран: показываем понятный экран и даём сброс.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Демо упало:', error, info.componentStack)
  }

  reset = () => {
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Если хранилище недоступно, всё равно перезагружаемся.
    }
    window.location.hash = '#/'
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-background p-5 text-center">
        <section className="surface w-full max-w-md p-8">
          <h1 className="display-font text-2xl font-semibold">Демо остановилось</h1>
          <p className="mt-3 text-muted-foreground">
            Похоже, локальные данные демо повреждены. Сброс вернёт исходные данные — платежи и сотрудники,
            созданные вручную, будут удалены.
          </p>
          <p className="mt-3 break-all font-mono text-xs text-muted-foreground">{this.state.error.message}</p>
          <button
            type="button"
            onClick={this.reset}
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-primary px-5 font-extrabold text-primary-foreground"
          >
            Сбросить демо и перезагрузить
          </button>
        </section>
      </div>
    )
  }
}
