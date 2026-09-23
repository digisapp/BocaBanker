import Link from 'next/link'
import {
  Brain,
  Calculator,
  MessageCircle,
  Building2,
  DollarSign,
  Landmark,
  Search,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import BocaBankerAvatar from '@/components/landing/BocaBankerAvatar'
import MobileChatButton from '@/components/landing/MobileChatButton'
import {
  Reveal,
  CountUp,
  LandingNav,
  ScrollButton,
  HeroChatWidget,
  ReviewsPreview,
} from '@/components/landing/LandingClient'

// Server component: static marketing markup ships as HTML; interactive bits
// (scroll reveal, count-up, nav shadow, chat, reviews) are client islands.

/* ─── Data ─── */

const features = [
  {
    icon: Landmark,
    title: 'Mortgage Expertise',
    desc: 'Navigate rates, loan programs, and refinancing options with an advisor who understands South Florida home lending inside and out.',
    color: 'bg-amber-100 text-amber-600',
    border: 'border-amber-200',
  },
  {
    icon: Brain,
    title: 'AI Chat Assistant',
    desc: 'Ask him anything about home loans, pre-approvals, refinancing, or cost segregation. He responds in seconds with decades of financial expertise.',
    color: 'bg-sky-100 text-sky-600',
    border: 'border-sky-200',
  },
  {
    icon: Building2,
    title: 'Real Estate Guidance',
    desc: 'From first-time homebuyers to seasoned investors — get expert-level guidance on financing your next property.',
    color: 'bg-teal-100 text-teal-600',
    border: 'border-teal-200',
  },
  {
    icon: DollarSign,
    title: 'Rate & Payment Tools',
    desc: 'Compare loan programs, estimate monthly payments, and find the best rate for your situation — conventional, FHA, VA, jumbo, and more.',
    color: 'bg-violet-100 text-violet-600',
    border: 'border-violet-200',
  },
  {
    icon: Calculator,
    title: 'Cost Segregation',
    desc: 'For investment properties — get MACRS depreciation schedules, bonus depreciation estimates, and tax savings projections on the spot.',
    color: 'bg-emerald-100 text-emerald-600',
    border: 'border-emerald-200',
  },
  {
    icon: Search,
    title: 'Property Analysis',
    desc: 'Get a quick assessment of any property\'s value, loan eligibility, or cost segregation potential — residential, commercial, or mixed-use.',
    color: 'bg-rose-100 text-rose-600',
    border: 'border-rose-200',
  },
]

const stats = [
  { value: 2, suffix: 'B+', label: 'In Loans Closed', prefix: '$', emoji: '🏠' },
  { value: 61, suffix: '+', label: '5-Star Reviews', prefix: '', emoji: '⭐' },
  { value: 40, suffix: '+', label: 'Years of Experience', prefix: '', emoji: '🏦' },
  { value: 500, suffix: '+', label: 'Cost Seg Studies', prefix: '', emoji: '📊' },
]

/* ─── Page ─── */

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* ── NAV ── */}
      <header>
        <LandingNav>
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
            <Link href="/" className="flex items-center gap-2.5">
              <BocaBankerAvatar size={36} priority />
              <span className="font-serif text-xl font-bold text-gray-900 hidden sm:block">
                Boca Banker
              </span>
            </Link>
            <div className="flex items-center gap-1">
              <Button asChild variant="ghost" className="text-gray-600 hover:text-gray-900 text-sm">
                <Link href="/reviews">Reviews</Link>
              </Button>
              <Button asChild variant="ghost" className="text-gray-600 hover:text-gray-900 text-sm">
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </LandingNav>
      </header>

      <main>
      {/* ══════════════════════════════════════
         HERO — Light, fun, avatar-forward
         ══════════════════════════════════════ */}
      <section aria-label="Hero" className="relative pt-24 pb-16 sm:pt-32 sm:pb-24 px-6 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-sky-50 via-white to-[#FAFAF8]" />
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 h-[400px] w-[400px] rounded-full bg-sky-200/30 blur-[80px]" />
          <div className="absolute top-[40%] -left-20 h-[300px] w-[300px] rounded-full bg-amber-200/20 blur-[80px]" />
          <div className="absolute bottom-0 right-[20%] h-[200px] w-[350px] rounded-full bg-teal-200/15 blur-[60px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl">
          <div className="flex flex-col lg:flex-row items-center gap-6 sm:gap-10 lg:gap-16">
            {/* Text side */}
            <div className="flex-1 text-center lg:text-left">
              {/* Hero copy is the LCP element: render it immediately rather than
                  behind a JS-driven scroll reveal (which kept it opacity-0 until
                  hydration). */}
              <div>
                <h1 className="font-serif font-bold tracking-tight text-gray-900 leading-[1.1]">
                  <span className="block text-3xl sm:text-4xl md:text-5xl lg:text-6xl bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-500 bg-clip-text text-transparent">
                    Boca Banker
                  </span>
                  <span className="block text-base sm:text-lg md:text-xl lg:text-2xl text-gray-500 font-medium mt-2">
                    South Florida&apos;s Mortgage &amp; Real Estate Finance Expert
                  </span>
                </h1>
              </div>

              <div className="animate-fade-in">
                <p className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl text-gray-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
                  Your AI-powered mortgage specialist. He knows home loans, refinancing, and real estate finance
                  inside and out, never takes a coffee break, and has the best tan in fintech.
                </p>
              </div>


            </div>

            {/* Live chat widget (desktop only — mobile uses floating button) */}
            <Reveal delay={200} className="hidden lg:block flex-1 min-w-0 w-full lg:max-w-lg">
              <div className="bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-500 rounded-[28px] p-3 shadow-2xl shadow-blue-500/25">
                <HeroChatWidget />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
         STATS BAR
         ══════════════════════════════════════ */}
      <section aria-label="Statistics" className="relative py-10 sm:py-16 px-4 sm:px-6 bg-white border-y border-gray-100">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
            {stats.map((s, i) => (
              <Reveal key={s.label} delay={i * 80}>
                <div className="text-center">
                  <div className="text-2xl mb-1">{s.emoji}</div>
                  <div className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-gray-900">
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
      <section id="features" aria-label="Features" className="py-20 sm:py-28 px-6 bg-white">
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
                Just ask Boca Banker — he handles mortgage guidance, rate comparisons, real estate strategy, and cost segregation so you don&apos;t have to.
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
                  'group h-full rounded-2xl border bg-white p-5 sm:p-6 md:p-7 transition-all duration-300 hover:shadow-lg hover:shadow-black/5 hover:-translate-y-1',
                  f.border
                )}>
                  <div className={cn('inline-flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl mb-4 sm:mb-5 transition-transform duration-300 group-hover:scale-110', f.color)}>
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
      <section id="how-it-works" aria-label="How it works" className="py-20 sm:py-28 px-6 bg-gradient-to-b from-sky-50 to-white">
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
              { num: '01', icon: MessageCircle, title: 'Ask Boca Banker', desc: 'Start a conversation about your mortgage, home purchase, refinance, or investment property. No signup required — just start chatting.', color: 'bg-sky-100 text-sky-600' },
              { num: '02', icon: Search, title: 'Get Expert Guidance', desc: 'Boca Banker analyzes your situation and recommends the best loan programs, rates, and financing strategies for your goals.', color: 'bg-amber-100 text-amber-600' },
              { num: '03', icon: DollarSign, title: 'Save Money', desc: 'Get a personalized breakdown of your best options — from the lowest rates to cost segregation tax savings on investment properties.', color: 'bg-teal-100 text-teal-600' },
            ].map((step, i) => (
              <Reveal key={step.num} delay={i * 120}>
                <div className="relative text-center flex flex-col items-center">
                  <div className="relative mb-5">
                    <div className={cn('flex h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 items-center justify-center rounded-2xl sm:rounded-3xl shadow-lg shadow-black/5 bg-white border border-gray-100')}>
                      <step.icon className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 text-gray-700" />
                    </div>
                    <div className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-xs font-bold text-white shadow-md">
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
         FAQ
         ══════════════════════════════════════ */}
      <section id="faq" aria-label="Frequently asked questions" className="py-20 sm:py-28 px-6 bg-white">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <div className="text-center mb-14">
              <p className="text-sm font-semibold tracking-widest uppercase text-amber-600 mb-3">
                FAQ
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900">
                Common{' '}
                <span className="bg-gradient-to-r from-amber-600 to-yellow-500 bg-clip-text text-transparent">
                  questions
                </span>
              </h2>
            </div>
          </Reveal>

          <div className="space-y-4">
            {[
              {
                q: 'What mortgage options are available in South Florida?',
                a: 'South Florida offers a wide range of lending options including conventional loans, FHA/VA, jumbo loans for high-value properties, DSCR loans for investors, and commercial financing. Boca Banker specializes in finding the right fit for each client \u2014 whether you\u2019re a first-time buyer, seasoned investor, or looking to refinance.',
              },
              {
                q: 'What makes Boca Banker different from other loan officers?',
                a: 'With 40+ years of banking experience in South Florida and a perfect 5-star rating from 61+ client reviews, Boca Banker combines deep local market knowledge with a genuinely personal approach. He\u2019s not just closing loans \u2014 he\u2019s building long-term relationships and helping clients make smart financial decisions for their future.',
              },
              {
                q: 'How does Boca Banker work?',
                a: 'Simply start a conversation with Boca Banker\u2019s AI chat. Describe your mortgage needs, home purchase, or refinance situation and he\u2019ll guide you to the best loan programs and rates \u2014 plus cost segregation analysis for investment properties \u2014 all powered by 40 years of Boca Raton banking expertise.',
              },
              {
                q: 'What is cost segregation?',
                a: 'Cost segregation is a tax strategy that accelerates depreciation deductions on commercial and investment real estate by reclassifying building components into shorter depreciation categories (5, 7, or 15 years instead of 27.5 or 39 years). This can generate significant tax savings in the first years of ownership.',
              },
              {
                q: 'How much can I save with a cost segregation study?',
                a: 'Typical savings range from 15% to 40% of a property\u2019s depreciable basis, accelerated into the first few years. For a $1M commercial property, this could mean $150,000\u2013$400,000 in accelerated depreciation deductions. Boca Banker provides instant AI-powered estimates based on your specific property.',
              },
              {
                q: 'What types of properties qualify for cost segregation?',
                a: 'Almost any commercial or investment property can benefit \u2014 office buildings, retail centers, warehouses, multifamily apartments, hotels, restaurants, and even mixed-use properties. Residential rental properties (27.5-year class) and commercial properties (39-year class) both qualify. Generally, properties valued at $500K or more see the most meaningful tax savings.',
              },
            ].map((faq, i) => (
              <Reveal key={faq.q} delay={i * 60}>
                <details className="group rounded-2xl border border-gray-200 bg-white overflow-hidden">
                  <summary className="flex items-center justify-between cursor-pointer px-4 sm:px-6 py-4 sm:py-5 text-left font-semibold text-sm sm:text-base text-gray-900 hover:bg-gray-50 transition-colors">
                    <span>{faq.q}</span>
                    <ChevronDown className="h-5 w-5 text-gray-400 shrink-0 ml-2 sm:ml-4 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="px-4 sm:px-6 pb-4 sm:pb-5 text-sm leading-relaxed text-gray-500">
                    {faq.a}
                  </div>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
         REVIEWS — Social proof
         ══════════════════════════════════════ */}
      <ReviewsPreview />

      {/* ══════════════════════════════════════
         CTA
         ══════════════════════════════════════ */}
      <section aria-label="Call to action" className="py-24 sm:py-32 px-6 bg-gradient-to-br from-sky-500 via-sky-400 to-teal-400 relative overflow-hidden">
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
              Ask him about home loans, refinancing, or cost segregation — he&apos;s ready to chat right now.
              Zero vacation days required.
            </p>
            <ScrollButton
              className="mt-8 inline-flex items-center gap-2 bg-white text-sky-700 font-bold text-sm sm:text-base px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl hover:bg-white/90 shadow-xl shadow-black/10 transition-opacity"
            >
              <MessageCircle className="h-5 w-5" />
              Chat Now
            </ScrollButton>
          </div>
        </Reveal>
      </section>

      </main>

      {/* ══════════════════════════════════════
         FOOTER
         ══════════════════════════════════════ */}
      <footer className="bg-gray-50 border-t border-gray-200 py-14 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <BocaBankerAvatar size={32} />
                <span className="font-serif text-lg font-bold text-gray-900">
                  Boca Banker
                </span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
                South Florida&apos;s trusted mortgage and real estate finance expert — powered by 40 years of Boca Raton banking experience. Home loans, refinancing, and cost segregation analysis.
              </p>
              <p className="text-xs text-gray-400 mt-3">Boca Raton, FL</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 text-sm mb-4">Platform</h3>
              <nav aria-label="Footer navigation" className="flex flex-col gap-2.5 text-sm text-gray-500">
                <ScrollButton className="text-left hover:text-gray-900 transition-colors">AI Chat</ScrollButton>
                <ScrollButton targetId="features" className="text-left hover:text-gray-900 transition-colors">Features</ScrollButton>
                <ScrollButton targetId="how-it-works" className="text-left hover:text-gray-900 transition-colors">How It Works</ScrollButton>
                <ScrollButton targetId="faq" className="text-left hover:text-gray-900 transition-colors">FAQ</ScrollButton>
                <Link href="/reviews" className="text-left hover:text-gray-900 transition-colors">Reviews</Link>
              </nav>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 text-sm mb-4">Get Started</h3>
              <nav className="flex flex-col gap-2.5 text-sm text-gray-500">
                <Link href="/login" className="hover:text-gray-900 transition-colors">Sign In</Link>
                <Link href="/reset-password" className="hover:text-gray-900 transition-colors">Reset Password</Link>
              </nav>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-400">
              &copy; {new Date().getFullYear()} Boca Banker. All rights reserved.
            </p>
            <p className="text-xs text-gray-400">
              Home mortgages &middot; Refinancing &middot; South Florida loans &middot; Cost segregation
            </p>
          </div>
        </div>
      </footer>

      {/* Mobile floating chat button + fullscreen overlay */}
      <MobileChatButton />
    </div>
  )
}
