import { X, Bell, Clock, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { hapticFeedback } from '../../lib/telegram'

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

  const options: { value: FrequencyOption; label: string; icon?: string }[] = [
    { value: 'never', label: 'Never', icon: '🔕' },
    { value: '1m', label: '1 Min', icon: '⚡' },
    { value: '5m', label: '5 Min', icon: '🔔' },
    { value: '15m', label: '15 Min', icon: '📊' },
    { value: '1h', label: '1 Hour', icon: '⏰' },
    { value: '2h', label: '2 Hours', icon: '📈' },
    { value: '4h', label: '4 Hours', icon: '🎯' },
    { value: 'daily', label: 'Daily', icon: '📅' },
  ]

  const handleSave = () => {
    hapticFeedback('impact', 'medium')
    onSave(frequency, time)
  }

  const handleFrequencySelect = (value: FrequencyOption) => {
    hapticFeedback('selection')
    setFrequency(value)
  }

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md animate-scale-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated gradient border */}
        <div className="absolute -inset-[1px] bg-gradient-to-r from-accent-primary via-accent-success to-accent-primary rounded-3xl opacity-70 blur-[1px] animate-pulse" />
        
        {/* Main card */}
        <div className="relative bg-bg-primary rounded-3xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl shadow-accent-primary/20">
          {/* Gradient overlay at top */}
          <div 
            className="absolute top-0 left-0 right-0 h-40 pointer-events-none opacity-30"
            style={{
              background: `
                linear-gradient(to bottom, var(--accent-primary) 0%, transparent 100%)
              `,
            }}
          />
          
          {/* Animated particles */}
          <div className="absolute top-4 right-12 w-2 h-2 bg-accent-primary rounded-full animate-ping opacity-60" />
          <div className="absolute top-8 right-20 w-1.5 h-1.5 bg-accent-success rounded-full animate-ping opacity-40" style={{ animationDelay: '0.5s' }} />
          <div className="absolute top-6 right-8 w-1 h-1 bg-accent-primary rounded-full animate-ping opacity-50" style={{ animationDelay: '1s' }} />

          {/* Header */}
          <div className="relative flex items-center justify-between p-5 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-primary/20 to-accent-success/20 flex items-center justify-center">
                  <Bell className="w-6 h-6 text-accent-primary" />
                </div>
                {/* Glow effect */}
                <div className="absolute inset-0 w-12 h-12 rounded-2xl bg-accent-primary/20 blur-xl animate-pulse" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                  Settings
                  <Sparkles className="w-4 h-4 text-accent-primary animate-pulse" />
                </h2>
                <p className="text-xs text-text-muted">Customize your notifications</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-bg-secondary/80 hover:bg-bg-tertiary flex items-center justify-center transition-all hover:scale-105 btn-press"
            >
              <X className="w-5 h-5 text-text-muted" />
            </button>
          </div>

          {/* Body */}
          <div className="relative p-5 overflow-y-auto flex-1">
            {/* Notification Frequency */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-4 bg-accent-primary rounded-full" />
                <h3 className="text-sm font-semibold text-text-primary">
                  Notification Frequency
                </h3>
              </div>
              <p className="text-xs text-text-muted mb-4 ml-3">
                Choose how often you receive portfolio updates
              </p>

              <div className="grid grid-cols-2 gap-2">
                {options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleFrequencySelect(opt.value)}
                    className={`relative px-4 py-3 rounded-xl text-sm font-medium transition-all overflow-hidden group ${
                      frequency === opt.value
                        ? 'bg-gradient-to-r from-accent-primary to-accent-success text-black shadow-lg shadow-accent-primary/30 scale-[1.02]'
                        : 'bg-bg-secondary/80 text-text-secondary hover:bg-bg-tertiary border border-border/50 hover:border-accent-primary/30'
                    }`}
                  >
                    {/* Selected indicator glow */}
                    {frequency === opt.value && (
                      <div className="absolute inset-0 bg-gradient-to-r from-accent-primary/20 to-accent-success/20 animate-pulse" />
                    )}
                    
                    {/* Hover shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
                    
                    <span className="relative flex items-center justify-center gap-2">
                      <span>{opt.icon}</span>
                      <span>{opt.label}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Notification Time (for daily) */}
            {frequency === 'daily' && (
              <div className="mb-6 animate-fade-up">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 bg-accent-success rounded-full" />
                  <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                    <Clock className="w-4 h-4 text-accent-success" />
                    Notification Time
                  </h3>
                </div>
                <p className="text-xs text-text-muted mb-3 ml-3">
                  Choose your preferred time for daily updates
                </p>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-bg-secondary/80 border border-border/50 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary/50 transition-all"
                />
              </div>
            )}

            {/* Save Message */}
            {saveMessage && (
              <div
                className={`mb-4 p-4 rounded-xl text-sm flex items-center gap-2 animate-fade-up ${
                  saveMessage.includes('success') || saveMessage.includes('saved')
                    ? 'bg-accent-success/10 text-accent-success border border-accent-success/20'
                    : 'bg-accent-danger/10 text-accent-danger border border-accent-danger/20'
                }`}
              >
                <span className="text-lg">{saveMessage.includes('success') || saveMessage.includes('saved') ? '✅' : '❌'}</span>
                {saveMessage}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="relative p-5 border-t border-border/50">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="relative w-full py-4 rounded-2xl font-semibold text-base overflow-hidden transition-all disabled:opacity-50 disabled:cursor-not-allowed group bg-gradient-to-r from-accent-primary to-accent-success text-black shadow-lg shadow-accent-primary/25 hover:shadow-accent-primary/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              
              <span className="relative flex items-center justify-center gap-2">
                {isSaving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Save Settings
                  </>
                )}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
