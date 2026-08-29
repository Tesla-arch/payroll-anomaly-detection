import { useEffect, useState } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { authSlides } from '../data/authSlides'
import ThemeToggle from './ThemeToggle'

export default function AuthShell({ children }) {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return undefined
    const timer = setInterval(() => {
      setActive((current) => (current + 1) % authSlides.length)
    }, 5500)
    return () => clearInterval(timer)
  }, [paused])

  const go = (direction) => {
    setActive((current) => (current + direction + authSlides.length) % authSlides.length)
  }

  const slide = authSlides[active]

  return (
    <div className="min-h-dvh bg-[#f4f1ea] lg:grid lg:grid-cols-2">
      <section
        className="relative h-52 overflow-hidden sm:h-80 lg:h-auto lg:min-h-dvh"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {authSlides.map((item, index) => (
          <img
            key={item.src}
            src={item.src}
            alt={item.title}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${index === active ? 'login-slide-active opacity-100' : 'opacity-0'}`}
          />
        ))}
        <div className="absolute inset-0 hero-scrim" />

        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 sm:p-5 lg:p-8">
          <div className="flex min-w-0 items-center gap-3 text-white">
            <div className="bg-accent grid h-11 w-11 shrink-0 place-items-center rounded-full font-bold">
              SMS
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">School Management System</p>
              <p className="text-xs text-emerald-100">Ghana basic schools · GES</p>
            </div>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 lg:p-10">
          <p className="text-accent text-xs font-semibold uppercase tracking-[0.22em]">{slide.title}</p>
          <h1 className="mt-2 max-w-xl text-xl font-semibold leading-snug text-white sm:text-2xl lg:text-4xl">
            Staff payroll portal for Ghanaian basic schools
          </h1>
          <p className="mt-3 max-w-lg text-sm text-emerald-50 lg:text-base">{slide.caption}</p>
          <div className="mt-5 flex items-center gap-3">
            <button type="button" className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25" onClick={() => go(-1)} aria-label="Previous photo">
              <FiChevronLeft size={18} />
            </button>
            <div className="flex gap-2">
              {authSlides.map((item, index) => (
                <button
                  key={item.src}
                  type="button"
                  aria-label={item.title}
                  onClick={() => setActive(index)}
                  className={`h-2 rounded-full transition-all ${index === active ? 'bg-accent w-8' : 'w-2 bg-white/50 hover:bg-white'}`}
                />
              ))}
            </div>
            <button type="button" className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25" onClick={() => go(1)} aria-label="Next photo">
              <FiChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-8 sm:py-8">
        <div className="flex w-full max-w-md flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-slate-500">Visibility</p>
            <ThemeToggle />
          </div>
          {children}
        </div>
      </section>
    </div>
  )
}
