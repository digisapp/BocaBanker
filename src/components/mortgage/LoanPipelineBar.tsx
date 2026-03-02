import { CheckCircle } from 'lucide-react'

const PIPELINE_STEPS = [
  { key: 'pre_qual', label: 'Pre-Qual' },
  { key: 'application', label: 'Application' },
  { key: 'processing', label: 'Processing' },
  { key: 'underwriting', label: 'Underwriting' },
  { key: 'clear_to_close', label: 'Clear to Close' },
  { key: 'funded', label: 'Funded' },
  { key: 'closed', label: 'Closed' },
]

export function LoanPipelineBar({ status }: { status: string }) {
  if (status === 'withdrawn') {
    return (
      <div className="flex items-center gap-2 text-sm text-red-500 font-medium">
        <div className="w-3 h-3 rounded-full bg-red-400" />
        Withdrawn
      </div>
    )
  }

  const currentIndex = PIPELINE_STEPS.findIndex((s) => s.key === status)

  return (
    <div className="flex items-center gap-1 w-full overflow-x-auto">
      {PIPELINE_STEPS.map((step, index) => {
        const isCompleted = index < currentIndex
        const isCurrent = index === currentIndex
        const isFuture = index > currentIndex

        return (
          <div key={step.key} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center flex-1 min-w-0">
              <div
                className={`w-full h-2 rounded-full transition-colors ${
                  isCompleted
                    ? 'bg-amber-400'
                    : isCurrent
                      ? 'bg-amber-500'
                      : 'bg-gray-200'
                }`}
              />
              <div className="flex items-center gap-1 mt-1.5">
                {isCompleted && (
                  <CheckCircle className="h-3 w-3 text-amber-500 shrink-0" />
                )}
                {isCurrent && (
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
                )}
                <span
                  className={`text-[10px] leading-tight truncate ${
                    isCurrent
                      ? 'text-amber-600 font-semibold'
                      : isCompleted
                        ? 'text-amber-500'
                        : isFuture
                          ? 'text-gray-400'
                          : 'text-gray-500'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
