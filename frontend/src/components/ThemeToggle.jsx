import { FiMoon, FiSun } from 'react-icons/fi'
import { useTheme } from '../context/ThemeContext'

const modes = [
  { id: 'light', label: 'Light', hint: 'Bright pages for daytime use', Icon: FiSun },
  { id: 'dark', label: 'Dark', hint: 'Dim pages that are easier on the eyes', Icon: FiMoon },
]

export default function ThemeToggle({ className = '' }) {
  const { theme, setTheme } = useTheme()

  return (
    <div
      className={`inline-flex items-center rounded-full bg-stone-100 p-0.5 ring-1 ring-stone-200 ${className}`}
      role="group"
      aria-label="Colour theme. Choose light or dark visibility."
      title="Choose light or dark visibility"
    >
      {modes.map(({ id, label, hint, Icon }) => {
        const active = theme === id
        return (
          <button
            key={id}
            type="button"
            aria-pressed={active}
            aria-label={`${label} mode. ${hint}`}
            title={hint}
            onClick={() => setTheme(id)}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition sm:px-3 ${
              active
                ? 'bg-emerald-800 text-white shadow'
                : 'text-slate-600 hover:bg-white hover:text-emerald-950'
            }`}
          >
            <Icon size={14} aria-hidden />
            <span>{label}</span>
          </button>
        )
      })}
    </div>
  )
}
