'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  Brain,
  Calculator,
  Users,
  Mail,
  ArrowRight,
  Shield,
  Zap,
  TrendingUp,
  Building2,
  BarChart3,
  FileText,
  Sparkles,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/* ─────────────────────────────────────────────
   SCROLL REVEAL — animates children on scroll
   ───────────────────────────────────────────── */
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
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.unobserve(el)
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
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

/* ─────────────────────────────────────────────
   COUNT-UP — animates a number from 0 to target
   ───────────────────────────────────────────── */
function CountUp({
  target,
  suffix = '',
  prefix = '',
  duration = 2000,
}: {
  target: number
  suffix?: string
  prefix?: string
  duration?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [count, setCount] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const startTime = performance.now()
          const animate = (now: number) => {
            const elapsed = now - startTime
            const progress = Math.min(elapsed / duration, 1)
            // ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3)
            setCount(Math.floor(eased * target))
            if (progress < 1) requestAnimationFrame(animate)
          }
          requestAnimationFrame(animate)
        }
      },
      { threshold: 0.5 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [target, duration])

  return (
    <span ref={ref}>
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </span>
  )
}

/* ─────────────────────────────────────────────
   DATA
   ───────────────────────────────────────────── */

const features = [
  {
    icon: Brain,
    title: 'AI Banking Assistant',
    description:
      'Chat with Boca Banker — an AI powered by xAI Grok with 40 years of banking intelligence built in. Get instant answers on cost segregation, tax strategy, and property analysis.',
    accent: 'from-sky-deep/20 to-sky/10',
    iconBg: 'bg-sky-deep/15',
    iconColor: 'text-sky',
    span: 'bento-span-2',
  },
  {
    icon: Calculator,
    title: 'Cost Segregation Engine',
    description:
      'MACRS-compliant depreciation calculations with bonus depreciation, NPV analysis, and IRS-ready reports. Turn a 39-year asset into a first-year tax deduction.',
    accent: 'from-gold/20 to-gold-light/10',
    iconBg: 'bg-gold/15',
    iconColor: 'text-gold',
    span: 'bento-row-2',
  },
  {
    icon: Users,
    title: 'Client CRM',
    description:
      'Purpose-built for banking professionals. Import 40 years of client data via CSV, tag, filter, and track every relationship.',
    accent: 'from-teal/20 to-teal/10',
    iconBg: 'bg-teal/15',
    iconColor: 'text-teal',
    span: '',
  },
  {
    icon: Mail,
    title: 'Email Outreach',
    description:
      'Branded email campaigns powered by Resend. Reach property owners with personalized cost segregation opportunity reports.',
    accent: 'from-coral/20 to-coral/10',
    iconBg: 'bg-coral/15',
    iconColor: 'text-coral',
    span: '',
  },
  {
    icon: BarChart3,
    title: 'Visual Reports',
    description:
      'Interactive charts showing asset breakdowns, depreciation schedules, and tax savings over time. Print-ready PDF generation.',
    accent: 'from-sky/20 to-teal/10',
    iconBg: 'bg-sky/15',
    iconColor: 'text-sky',
    span: '',
  },
  {
    icon: FileText,
    title: 'Document Vault',
    description:
      'Secure document storage tied to clients, properties, and studies. Upload appraisals, tax returns, and study deliverables.',
    accent: 'from-gold-light/20 to-sand/10',
    iconBg: 'bg-gold-light/15',
    iconColor: 'text-gold-light',
    span: '',
  },
]

const stats = [
  { value: 40, suffix: '+', label: 'Years of Experience', prefix: '' },
  { value: 2, suffix: 'B+', label: 'Property Value Analyzed', prefix: '$' },
  { value: 500, suffix: '+', label: 'Studies Completed', prefix: '' },
  { value: 85, suffix: '%', label: 'Average Time Saved', prefix: '' },
]

const steps = [
  {
    num: '01',
    icon: Users,
    title: 'Import Your Clients',
    description:
      'Upload your existing client database via CSV. Boca Banker maps columns automatically and organizes your 40 years of relationships.',
  },
  {
    num: '02',
    icon: Zap,
    title: 'Run AI Analysis',
    description:
      'Our AI engine identifies cost segregation opportunities across your portfolio. Get property-specific recommendations in minutes.',
  },
  {
    num: '03',
    icon: TrendingUp,
    title: 'Deliver Tax Savings',
    description:
      'Generate IRS-compliant reports with MACRS depreciation schedules, bonus depreciation, and NPV-optimized tax savings projections.',
  },
]

/* ─────────────────────────────────────────────
   PAGE COMPONENT
   ───────────────────────────────────────────── */

export default function Home() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* ── FLOATING NAV ── */}
      <nav
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
          scrolled
            ? 'bg-navy/80 backdrop-blur-xl border-b border-gold/10 shadow-lg shadow-black/20'
            : 'bg-transparent'
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-gradient shadow-lg">
              <Building2 className="h-5 w-5 text-navy" />
            </div>
            <span className="text-gold-gradient font-serif text-xl font-bold hidden sm:block">
              Boca Banker
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Button
              asChild
              variant="ghost"
              className="text-cream/70 hover:text-gold hover:bg-gold/5 text-sm"
            >
              <Link href="/login">Login</Link>
            </Button>
            <Button
              asChild
              className="bg-gold-gradient text-navy font-semibold hover:opacity-90 text-sm px-5"
            >
              <Link href="/signup">
                Get Started
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════════
         HERO SECTION
         ══════════════════════════════════════ */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center mesh-gradient-bg grain-overlay">
        {/* Floating Orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Large gold orb */}
          <div className="absolute top-[15%] left-[10%] h-[350px] w-[350px] rounded-full bg-gold/[0.04] blur-[100px] animate-float-slow" />
          {/* Medium sky orb */}
          <div className="absolute top-[60%] right-[8%] h-[280px] w-[280px] rounded-full bg-sky-deep/[0.06] blur-[90px] animate-float-medium" />
          {/* Small teal orb */}
          <div className="absolute top-[30%] right-[25%] h-[200px] w-[200px] rounded-full bg-teal/[0.04] blur-[80px] animate-float-fast" />
          {/* Bottom gold accent */}
          <div className="absolute bottom-[10%] left-[30%] h-[250px] w-[400px] rounded-full bg-gold/[0.03] blur-[120px] animate-float-medium" />
          {/* Decorative ring */}
          <div className="absolute top-[20%] right-[15%] h-[300px] w-[300px] rounded-full border border-gold/[0.04] animate-spin-slow" />
          <div className="absolute top-[20%] right-[15%] h-[200px] w-[200px] mt-[50px] ml-[50px] rounded-full border border-sky/[0.03] animate-spin-slow" style={{ animationDirection: 'reverse', animationDuration: '45s' }} />
        </div>

        {/* Content */}
        <div className="relative z-10 mx-auto max-w-5xl">
          {/* Badge */}
          <Reveal>
            <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-gold/15 bg-navy-light/40 px-5 py-2 text-sm backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-gold" />
              <span className="text-sand-light">Boca Raton &bull; Palm Beach &bull; South Florida</span>
            </div>
          </Reveal>

          {/* Headline */}
          <Reveal delay={100}>
            <h1 className="font-serif font-bold tracking-tight leading-[1.1]">
              <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-cream/90">
                The Future of
              </span>
              <span className="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-shimmer mt-2">
                Banking Intelligence
              </span>
            </h1>
          </Reveal>

          {/* Subheadline */}
          <Reveal delay={200}>
            <p className="mx-auto mt-8 max-w-2xl text-lg sm:text-xl text-slate-blue leading-relaxed">
              40 years of Boca Raton banking expertise, now powered by{' '}
              <span className="text-sky font-medium">artificial intelligence</span>.
              Maximize tax savings with automated cost segregation analysis.
            </p>
          </Reveal>

          {/* CTA Buttons */}
          <Reveal delay={300}>
            <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button
                asChild
                size="lg"
                className="h-14 min-w-[200px] bg-gold-gradient text-navy font-bold text-base hover:opacity-90 gold-glow rounded-xl"
              >
                <Link href="/signup">
                  Start Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-14 min-w-[200px] border-gold/20 text-gold text-base hover:bg-gold/5 hover:text-gold-light hover:border-gold/30 rounded-xl"
              >
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          </Reveal>

          {/* Trust Signals */}
          <Reveal delay={400}>
            <div className="mt-16 flex items-center justify-center gap-6 text-sm text-slate-blue/70">
              <div className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-teal/70" />
                <span>Bank-Grade Security</span>
              </div>
              <div className="hidden sm:block h-4 w-px bg-gold/10" />
              <div className="hidden sm:flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-gold/70" />
                <span>AI-Powered</span>
              </div>
              <div className="hidden md:block h-4 w-px bg-gold/10" />
              <div className="hidden md:flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-sky/70" />
                <span>IRS Compliant</span>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2">
          <div className="flex flex-col items-center gap-2 text-gold/40">
            <span className="text-xs tracking-widest uppercase">Explore</span>
            <ChevronDown className="h-4 w-4 animate-bounce" />
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-navy to-transparent" />
      </section>

      {/* ══════════════════════════════════════
         STATS BAR
         ══════════════════════════════════════ */}
      <section className="relative bg-navy py-20 px-6">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
              {stats.map((stat, i) => (
                <Reveal key={stat.label} delay={i * 100}>
                  <div className="text-center">
                    <div className="text-4xl sm:text-5xl font-serif font-bold text-gold-gradient">
                      <CountUp
                        target={stat.value}
                        suffix={stat.suffix}
                        prefix={stat.prefix}
                      />
                    </div>
                    <p className="mt-2 text-sm text-slate-blue">{stat.label}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </Reveal>
        </div>

        {/* Decorative line */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-xs">
          <div className="h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
        </div>
      </section>

      {/* ══════════════════════════════════════
         BENTO FEATURES GRID
         ══════════════════════════════════════ */}
      <section className="relative bg-navy py-24 px-6 grain-overlay">
        {/* Background accents */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-[20%] left-0 h-[400px] w-[300px] rounded-full bg-sky-deep/[0.04] blur-[120px]" />
          <div className="absolute bottom-[10%] right-0 h-[350px] w-[350px] rounded-full bg-gold/[0.03] blur-[100px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl">
          <Reveal>
            <div className="text-center mb-16">
              <p className="text-sm font-medium tracking-widest uppercase text-sky mb-4">
                Platform
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-cream">
                Everything You Need,{' '}
                <span className="text-gold-gradient">One Platform</span>
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-slate-blue leading-relaxed">
                From client onboarding to tax savings delivery — Boca Banker
                combines AI, analytics, and automation into a single luxury
                banking experience.
              </p>
            </div>
          </Reveal>

          <div className="bento-grid">
            {features.map((feature, i) => (
              <Reveal
                key={feature.title}
                delay={i * 80}
                className={feature.span}
              >
                <div
                  className={cn(
                    'glass-card-premium p-7 sm:p-8 h-full flex flex-col gap-5 group',
                    feature.span === 'bento-row-2' && 'justify-between'
                  )}
                >
                  {/* Icon */}
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110',
                      feature.iconBg
                    )}
                  >
                    <feature.icon className={cn('h-6 w-6', feature.iconColor)} />
                  </div>

                  {/* Text */}
                  <div className="flex-1">
                    <h3 className="font-serif text-xl font-semibold text-cream mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-blue">
                      {feature.description}
                    </p>
                  </div>

                  {/* Subtle gradient accent at bottom */}
                  <div
                    className={cn(
                      'h-0.5 w-12 rounded-full bg-gradient-to-r opacity-50 group-hover:w-20 group-hover:opacity-80 transition-all duration-500',
                      feature.accent
                    )}
                  />
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
         HOW IT WORKS
         ══════════════════════════════════════ */}
      <section className="relative bg-navy py-24 px-6">
        {/* Gradient divider at top */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/15 to-transparent" />

        <div className="mx-auto max-w-5xl">
          <Reveal>
            <div className="text-center mb-20">
              <p className="text-sm font-medium tracking-widest uppercase text-teal mb-4">
                How It Works
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-cream">
                Three Steps to{' '}
                <span className="text-gold-gradient">Tax Savings</span>
              </h2>
            </div>
          </Reveal>

          <div className="relative grid md:grid-cols-3 gap-12 md:gap-8">
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px bg-gradient-to-r from-sky/20 via-gold/20 to-teal/20" />

            {steps.map((step, i) => (
              <Reveal key={step.num} delay={i * 150}>
                <div className="relative text-center flex flex-col items-center">
                  {/* Step number badge */}
                  <div className="relative mb-6">
                    <div className="flex h-24 w-24 items-center justify-center rounded-2xl glass-card-premium animate-border-glow">
                      <step.icon className="h-10 w-10 text-gold" />
                    </div>
                    <div className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-lg bg-gold-gradient text-xs font-bold text-navy">
                      {step.num}
                    </div>
                  </div>

                  <h3 className="font-serif text-xl font-semibold text-cream mb-3">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-blue max-w-xs">
                    {step.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
         CTA SECTION
         ══════════════════════════════════════ */}
      <section className="relative py-32 px-6 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 mesh-gradient-bg" />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[700px] rounded-full bg-gold/[0.04] blur-[150px]" />
        </div>

        {/* Top divider */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/15 to-transparent" />

        <Reveal>
          <div className="relative z-10 mx-auto max-w-3xl text-center">
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-cream leading-tight">
              Ready to Transform{' '}
              <span className="text-shimmer">Your Practice?</span>
            </h2>
            <p className="mt-6 text-lg text-slate-blue max-w-xl mx-auto leading-relaxed">
              Join banking professionals across South Florida who trust Boca
              Banker to identify millions in tax savings for their clients.
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button
                asChild
                size="lg"
                className="h-14 min-w-[220px] bg-gold-gradient text-navy font-bold text-base hover:opacity-90 gold-glow rounded-xl"
              >
                <Link href="/signup">
                  Create Free Account
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-14 min-w-[180px] border-gold/20 text-gold text-base hover:bg-gold/5 hover:border-gold/30 rounded-xl"
              >
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ══════════════════════════════════════
         FOOTER
         ══════════════════════════════════════ */}
      <footer className="relative bg-navy border-t border-gold/8 py-12 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-gradient">
                <Building2 className="h-4 w-4 text-navy" />
              </div>
              <span className="text-gold-gradient font-serif text-lg font-bold">
                Boca Banker
              </span>
            </div>

            {/* Links */}
            <div className="flex items-center gap-8 text-sm text-slate-blue">
              <Link
                href="/login"
                className="hover:text-gold transition-colors"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="hover:text-gold transition-colors"
              >
                Sign Up
              </Link>
              <Link
                href="/dashboard"
                className="hover:text-gold transition-colors"
              >
                Dashboard
              </Link>
            </div>

            {/* Copyright */}
            <p className="text-xs text-slate-blue/60">
              &copy; {new Date().getFullYear()} Boca Banker. All rights
              reserved.
            </p>
          </div>

          {/* Bottom accent */}
          <div className="mt-8 h-px bg-gradient-to-r from-transparent via-gold/10 to-transparent" />
          <p className="mt-4 text-center text-xs text-slate-blue/40">
            Boca Raton &bull; Palm Beach &bull; South Florida
          </p>
        </div>
      </footer>
    </div>
  )
}
