import { hapticFeedback } from '../lib/telegram'

interface SegmentedSwitchProps {
  options: string[]
  selected: string
  onChange: (value: string) => void
}

export function SegmentedSwitch({ options, selected, onChange }: SegmentedSwitchProps) {
  const selectedIndex = options.indexOf(selected)
  
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
      {options.map((option) => (
        <button
          key={option}
          onClick={() => handleSelect(option)}
          className={`
            relative flex-1 py-2.5 px-4 text-sm font-medium rounded-lg transition-colors duration-200 z-10
            ${selected === option ? 'text-accent-primary' : 'text-text-muted'}
          `}
        >
          {option}
        </button>
      ))}
    </div>
  )
}
