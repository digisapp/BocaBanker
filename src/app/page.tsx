'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  Brain,
  Calculator,
  MessageCircle,
  Building2,
  DollarSign,
  Landmark,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import BocaBankerAvatar from '@/components/landing/BocaBankerAvatar'
import GuestChatWidget from '@/components/landing/GuestChatWidget'

/* ─── Scroll Reveal ─── */
function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el) } },
      { threshold: 0.12, rootMargin: '0px 0px -30px 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-700 ease-out',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

/* ─── Count Up ─── */
function CountUp({ target, suffix = '', prefix = '' }: { target: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [count, setCount] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !started.current) {
          started.current = true
          const t0 = performance.now()
          const tick = (now: number) => {
            const p = Math.min((now - t0) / 2000, 1)
            const eased = 1 - Math.pow(1 - p, 3)
            setCount(Math.floor(eased * target))
            if (p < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }
      },
      { threshold: 0.5 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [target])

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>
}

/* ─── Data ─── */

const features = [
  {
    icon: Brain,
    title: 'AI Chat Assistant',
    desc: 'Ask him anything about banking, mortgages, cost segregation, or property analysis. He responds in seconds with decades of financial expertise.',
    color: 'bg-sky-100 text-sky-600',
    border: 'border-sky-200',
  },
  {
    icon: Calculator,
    title: 'Cost Seg Calculator',
    desc: 'Tell him about your property and get MACRS depreciation schedules, bonus dep estimates, and tax savings projections on the spot.',
    color: 'bg-amber-100 text-amber-600',
    border: 'border-amber-200',
  },
  {
    icon: Building2,
    title: 'Real Estate Guidance',
    desc: 'From commercial acquisitions to multifamily strategies — get expert-level guidance on structuring your next deal.',
    color: 'bg-teal-100 text-teal-600',
    border: 'border-teal-200',
  },
  {
    icon: Landmark,
    title: 'Mortgage Intelligence',
    desc: 'Navigate rates, terms, and refinancing options with AI that understands South Florida lending inside and out.',
    color: 'bg-violet-100 text-violet-600',
    border: 'border-violet-200',
  },
  {
    icon: DollarSign,
    title: 'Tax Savings Strategy',
    desc: 'Discover exactly how much you could save through accelerated depreciation, bonus dep, and smart tax planning.',
    color: 'bg-emerald-100 text-emerald-600',
    border: 'border-emerald-200',
  },
  {
    icon: Search,
    title: 'Property Analysis',
    desc: 'Get a quick assessment of any property\'s cost segregation potential — residential, commercial, or mixed-use.',
    color: 'bg-rose-100 text-rose-600',
    border: 'border-rose-200',
  },
]

const stats = [
  { value: 2, suffix: 'B+', label: 'Property Values Analyzed', prefix: '$', emoji: '🏢' },
  { value: 500, suffix: '+', label: 'Studies Completed', prefix: '', emoji: '📊' },
  { value: 40, suffix: '+', label: 'Years of Experience', prefix: '', emoji: '🏦' },
  { value: 85, suffix: '%', label: 'Faster Than Manual Analysis', prefix: '', emoji: '⚡' },
]

/* ─── Page ─── */

export default function Home() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* ── NAV ── */}
      <nav
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
          scrolled
            ? 'bg-white/90 backdrop-blur-xl shadow-sm border-b border-gray-100'
            : 'bg-transparent'
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <BocaBankerAvatar size={36} />
            <span className="font-serif text-xl font-bold text-gray-900 hidden sm:block">
              Boca Banker
            </span>
          </Link>
          <Button asChild variant="ghost" className="text-gray-600 hover:text-gray-900 text-sm">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </nav>

      {/* ══════════════════════════════════════
         HERO — Light, fun, avatar-forward
         ══════════════════════════════════════ */}
      <section className="relative pt-24 pb-16 sm:pt-32 sm:pb-24 px-6 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-sky-50 via-white to-[#FAFAF8]" />
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 h-[400px] w-[400px] rounded-full bg-sky-200/30 blur-[80px]" />
          <div className="absolute top-[40%] -left-20 h-[300px] w-[300px] rounded-full bg-amber-200/20 blur-[80px]" />
          <div className="absolute bottom-0 right-[20%] h-[200px] w-[350px] rounded-full bg-teal-200/15 blur-[60px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Text side */}
            <div className="flex-1 text-center lg:text-left">
              <Reveal>
                <h1 className="font-serif font-bold tracking-tight text-gray-900 leading-[1.1]">
                  <span className="block text-4xl sm:text-5xl md:text-6xl bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-500 bg-clip-text text-transparent">
                    Boca Banker
                  </span>
                </h1>
              </Reveal>

              <Reveal delay={200}>
                <p className="mt-6 text-lg sm:text-xl text-gray-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
                  Your AI-powered financial specialist. He knows banking, mortgages, and cost segregation
                  inside and out, never takes a coffee break, and has the best tan in fintech.
                </p>
              </Reveal>


            </div>

            {/* Live chat widget */}
            <Reveal delay={200} className="flex-1 min-w-0 w-full lg:max-w-lg">
              <GuestChatWidget />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
         STATS BAR
         ══════════════════════════════════════ */}
      <section className="relative py-16 px-6 bg-white border-y border-gray-100">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s, i) => (
              <Reveal key={s.label} delay={i * 80}>
                <div className="text-center">
                  <div className="text-2xl mb-1">{s.emoji}</div>
                  <div className="text-3xl sm:text-4xl font-serif font-bold text-gray-900">
                    <CountUp target={s.value} suffix={s.suffix} prefix={s.prefix} />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{s.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
         FEATURES — Fun cards
         ══════════════════════════════════════ */}
      <section className="py-20 sm:py-28 px-6 bg-white">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="text-center mb-14">
              <p className="text-sm font-semibold tracking-widest uppercase text-amber-600 mb-3">
                What He Can Do
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900">
                Way more than just{' '}
                <span className="bg-gradient-to-r from-amber-600 to-yellow-500 bg-clip-text text-transparent">
                  good looks
                </span>
              </h2>
              <p className="mt-4 text-gray-500 max-w-lg mx-auto">
                Just ask Boca Banker — he handles cost seg analysis, mortgage guidance, real estate strategy, and tax planning so you don&apos;t have to.
              </p>
            </div>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <Reveal
                key={f.title}
                delay={i * 70}
              >
                <div className={cn(
                  'group h-full rounded-2xl border bg-white p-7 transition-all duration-300 hover:shadow-lg hover:shadow-black/5 hover:-translate-y-1',
                  f.border
                )}>
                  <div className={cn('inline-flex h-12 w-12 items-center justify-center rounded-xl mb-5 transition-transform duration-300 group-hover:scale-110', f.color)}>
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-serif text-xl font-semibold text-gray-900 mb-2">
                    {f.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-500">
                    {f.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
         HOW IT WORKS
         ══════════════════════════════════════ */}
      <section className="py-20 sm:py-28 px-6 bg-gradient-to-b from-sky-50 to-white">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <div className="text-center mb-16">
              <p className="text-sm font-semibold tracking-widest uppercase text-teal-600 mb-3">
                How It Works
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900">
                Three steps.{' '}
                <span className="bg-gradient-to-r from-teal-500 to-sky-500 bg-clip-text text-transparent">
                  Seriously.
                </span>
              </h2>
            </div>
          </Reveal>

          <div className="relative grid md:grid-cols-3 gap-10 md:gap-6">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-14 left-[18%] right-[18%] h-0.5 bg-gradient-to-r from-sky-200 via-amber-200 to-teal-200 rounded-full" />

            {[
              { num: '01', icon: MessageCircle, title: 'Ask Boca Banker', desc: 'Start a conversation about your property, mortgage, or tax situation. No signup required — just start chatting.', color: 'bg-sky-100 text-sky-600' },
              { num: '02', icon: Search, title: 'Get Expert Analysis', desc: 'Boca Banker analyzes your property and identifies cost segregation opportunities, tax savings, and strategy options.', color: 'bg-amber-100 text-amber-600' },
              { num: '03', icon: DollarSign, title: 'See Your Savings', desc: 'Get a personalized breakdown of how much you could save through accelerated depreciation and smart tax planning.', color: 'bg-teal-100 text-teal-600' },
            ].map((step, i) => (
              <Reveal key={step.num} delay={i * 120}>
                <div className="relative text-center flex flex-col items-center">
                  <div className="relative mb-5">
                    <div className={cn('flex h-28 w-28 items-center justify-center rounded-3xl shadow-lg shadow-black/5 bg-white border border-gray-100')}>
                      <step.icon className="h-10 w-10 text-gray-700" />
                    </div>
                    <div className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-xs font-bold text-white shadow-md">
                      {step.num}
                    </div>
                  </div>
                  <h3 className="font-serif text-xl font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-gray-500 max-w-xs">{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
         CTA
         ══════════════════════════════════════ */}
      <section className="py-24 sm:py-32 px-6 bg-gradient-to-br from-sky-500 via-sky-400 to-teal-400 relative overflow-hidden">
        {/* Decorative */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 -right-20 h-[300px] w-[300px] rounded-full bg-white/10 blur-[60px]" />
          <div className="absolute bottom-0 -left-20 h-[250px] w-[250px] rounded-full bg-amber-300/15 blur-[60px]" />
        </div>

        <Reveal>
          <div className="relative z-10 mx-auto max-w-3xl text-center">
            <div className="flex justify-center mb-6">
              <BocaBankerAvatar size={80} className="drop-shadow-xl" />
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight">
              Ready to put him to work?
            </h2>
            <p className="mt-5 text-lg text-white/80 max-w-xl mx-auto">
              Ask him about banking, mortgages, or cost segregation — he&apos;s ready to chat right now.
              Zero vacation days required.
            </p>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="mt-8 inline-flex items-center gap-2 bg-white text-sky-700 font-bold text-base px-8 py-3.5 rounded-xl hover:bg-white/90 shadow-xl shadow-black/10 transition-opacity"
            >
              <MessageCircle className="h-5 w-5" />
              Chat Now
            </button>
          </div>
        </Reveal>
      </section>

      {/* ══════════════════════════════════════
         FOOTER
         ══════════════════════════════════════ */}
      <footer className="bg-white border-t border-gray-100 py-10 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <BocaBankerAvatar size={32} />
              <span className="font-serif text-lg font-bold text-gray-900">
                Boca Banker
              </span>
            </div>
            <div className="flex items-center gap-8 text-sm text-gray-500">
              <Link href="/login" className="hover:text-gray-900 transition-colors">Sign In</Link>
            </div>
            <p className="text-xs text-gray-400">
              &copy; {new Date().getFullYear()} Boca Banker. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
