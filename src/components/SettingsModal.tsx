import { X } from 'lucide-react'
import { useState } from 'react'

type FrequencyOption = 'never' | '1m' | '5m' | '15m' | '1h' | '2h' | '4h' | 'daily'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  currentFrequency: FrequencyOption
  currentTime: string
  onSave: (frequency: FrequencyOption, time: string) => void
  saveMessage: string
  isSaving: boolean
}

export function SettingsModal({
  isOpen,
  onClose,
  currentFrequency,
  currentTime,
  onSave,
  saveMessage,
  isSaving
}: SettingsModalProps) {
  const [frequency, setFrequency] = useState<FrequencyOption>(currentFrequency)
  const [time, setTime] = useState(currentTime)

  if (!isOpen) return null

  const options: { value: FrequencyOption; label: string }[] = [
    { value: 'never', label: 'Never' },
    { value: '1m', label: '1 Min' },
    { value: '5m', label: '5 Min' },
    { value: '15m', label: '15 Min' },
    { value: '1h', label: '1 Hour' },
    { value: '2h', label: '2 Hours' },
    { value: '4h', label: '4 Hours' },
    { value: 'daily', label: 'Daily' },
  ]

  const handleSave = () => {
    onSave(frequency, time)
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-bg-primary border border-border rounded-2xl w-full max-w-md shadow-2xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-bold text-text-primary">Settings</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-bg-secondary hover:bg-bg-secondary/80 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Notification Frequency */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-text-primary mb-2">
              Notification Frequency
            </h3>
            <p className="text-xs text-text-muted mb-4">
              Choose how often you receive portfolio updates
            </p>

            <div className="grid grid-cols-2 gap-2">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFrequency(opt.value)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    frequency === opt.value
                      ? 'bg-accent-success text-white shadow-lg'
                      : 'bg-bg-secondary text-text-muted hover:bg-bg-secondary/80 border border-border'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notification Time (for daily) */}
          {frequency === 'daily' && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-text-primary mb-2">
                Notification Time
              </h3>
              <p className="text-xs text-text-muted mb-3">
                Choose your preferred time for daily updates
              </p>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-bg-secondary border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-success"
              />
            </div>
          )}

          {/* Save Message */}
          {saveMessage && (
            <div
              className={`mb-4 p-3 rounded-lg text-sm ${
                saveMessage.includes('success') || saveMessage.includes('saved')
                  ? 'bg-accent-success/10 text-accent-success'
                  : 'bg-accent-danger/10 text-accent-danger'
              }`}
            >
              {saveMessage}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-3 rounded-xl bg-accent-success text-white font-semibold hover:bg-accent-success/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
