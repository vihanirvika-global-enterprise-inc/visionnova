import type { OrderStatus } from '@/types'

// The happy path an order travels. cancelled and payment_failed are deliberately
// absent: they are exits, not points along it.
export const ORDER_TIMELINE = [
  'pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
] as const

type TimelineStatus = (typeof ORDER_TIMELINE)[number]

const STEP_LABELS: Record<TimelineStatus, string> = {
  pending: 'Placed',
  paid: 'Paid',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
}

const EXCEPTION_MESSAGES: Record<string, string> = {
  cancelled: 'This order was cancelled.',
  payment_failed: 'Payment failed — this order was not completed.',
}

function stepState(index: number, currentIndex: number): 'complete' | 'current' | 'upcoming' {
  if (index < currentIndex) return 'complete'
  if (index === currentIndex) return 'current'
  return 'upcoming'
}

const STATE_STYLES: Record<string, string> = {
  complete: 'bg-primary text-white',
  current: 'bg-primary text-white ring-4 ring-primary/20',
  upcoming: 'bg-slate-200 text-muted',
}

export default function OrderStatusTimeline({ status }: { status: OrderStatus }) {
  const exception = EXCEPTION_MESSAGES[status]
  if (exception) {
    return (
      <div role="alert" className="card border-red-200 bg-red-50 p-4">
        <p className="text-sm font-medium text-red-700">{exception}</p>
      </div>
    )
  }

  const currentIndex = ORDER_TIMELINE.indexOf(status as TimelineStatus)

  return (
    <ol aria-label="Order progress" className="flex flex-col gap-4 sm:flex-row sm:gap-2">
      {ORDER_TIMELINE.map((step, index) => {
        const state = stepState(index, currentIndex)
        return (
          <li
            key={step}
            data-state={state}
            aria-current={state === 'current' ? 'step' : undefined}
            className="flex flex-1 items-center gap-3 sm:flex-col sm:gap-2 sm:text-center"
          >
            <span
              aria-hidden="true"
              className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold ${STATE_STYLES[state]}`}
            >
              {state === 'complete' ? (
                <svg
                  aria-hidden="true"
                  data-testid="step-complete-icon"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : (
                index + 1
              )}
            </span>
            <span
              className={
                state === 'upcoming'
                  ? 'text-sm text-muted'
                  : 'text-sm font-medium text-dark'
              }
            >
              {STEP_LABELS[step]}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
