import { hapticFeedback } from '../../lib/telegram'

interface SegmentedOption {
  value: string
  label: string
  count?: number
}

interface SegmentedSwitchProps {
  options: string[] | SegmentedOption[]
  value?: string
  selected?: string
  onChange: (value: string) => void
}

export function SegmentedSwitch({ options, value, selected, onChange }: SegmentedSwitchProps) {
  const currentValue = value || selected || ''
  const normalizedOptions: SegmentedOption[] = typeof options[0] === 'string' 
    ? (options as string[]).map(o => ({ value: o, label: o }))
    : options as SegmentedOption[]
  
  const selectedIndex = normalizedOptions.findIndex(o => o.value === currentValue)
  
  const handleSelect = (option: string) => {
    if (option !== selected) {
      hapticFeedback('selection')
      onChange(option)
    }
  }
  
  return (
    <div className="relative bg-bg-secondary rounded-xl p-1 flex border border-border">
      {/* Sliding indicator */}
      <div 
        className="absolute top-1 bottom-1 rounded-lg bg-accent-primary/20 border border-accent-primary/30 transition-all duration-200 ease-out"
        style={{
          width: `calc(${100 / options.length}% - 4px)`,
          left: `calc(${(100 / options.length) * selectedIndex}% + 2px)`,
        }}
      />
      
      {/* Options */}
      {normalizedOptions.map((option) => (
        <button
          key={option.value}
          onClick={() => handleSelect(option.value)}
          className={`
            relative flex-1 py-2.5 px-4 text-sm font-medium rounded-lg transition-colors duration-200 z-10
            ${currentValue === option.value ? 'text-accent-primary' : 'text-text-muted'}
          `}
        >
          {option.label}
          {option.count !== undefined && (
            <span className="ml-1.5 text-xs opacity-60">({option.count})</span>
          )}
        </button>
      ))}
    </div>
  )
}
