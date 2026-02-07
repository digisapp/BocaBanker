import Link from "next/link";
import { Brain, Calculator, Users, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Analysis",
    description:
      "Leverage artificial intelligence to identify cost segregation opportunities across your entire portfolio in minutes, not months.",
  },
  {
    icon: Calculator,
    title: "Cost Segregation Tools",
    description:
      "Automated property studies with IRS-compliant reports. Accelerate depreciation and maximize first-year tax deductions.",
  },
  {
    icon: Users,
    title: "Client CRM",
    description:
      "Manage your banking relationships with a purpose-built CRM designed for cost segregation professionals and advisors.",
  },
  {
    icon: Mail,
    title: "Email Outreach",
    description:
      "Intelligent email campaigns that connect you with property owners who stand to benefit most from cost segregation studies.",
  },
];

export default function Home() {
  return (
    <div className="relative min-h-screen bg-navy palm-pattern">
      {/* Ambient glow effects */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gold/5 blur-[120px]" />
        <div className="absolute -bottom-40 right-0 h-[400px] w-[600px] rounded-full bg-gold/3 blur-[100px]" />
      </div>

      {/* Hero Section */}
      <section className="relative flex min-h-[85vh] flex-col items-center justify-center px-6 text-center">
        <div className="mx-auto max-w-4xl">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-gold/20 bg-navy-light/60 px-4 py-1.5 text-sm text-gold-light backdrop-blur-sm">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold animate-pulse-gold" />
            Boca Raton&apos;s Premier Banking Intelligence Platform
          </div>

          {/* Title */}
          <h1 className="font-serif text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl">
            <span className="text-gold-gradient">Boca Banker</span>
          </h1>

          {/* Tagline */}
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-blue sm:text-xl md:text-2xl">
            40 Years of Boca Raton Banking Intelligence.{" "}
            <span className="text-gold-light">Now Powered by AI.</span>
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button
              asChild
              size="lg"
              className="h-12 min-w-[160px] bg-gold-gradient text-navy font-semibold text-base hover:opacity-90 gold-glow"
            >
              <Link href="/login">Login</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 min-w-[160px] border-gold/30 text-gold text-base hover:bg-gold/10 hover:text-gold-light"
            >
              <Link href="/signup">Sign Up</Link>
            </Button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div className="h-8 w-5 rounded-full border border-gold/30 p-1">
            <div className="h-2 w-1.5 mx-auto rounded-full bg-gold/60 animate-bounce" />
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto max-w-xs border-t border-gold/10" />

      {/* Features Section */}
      <section className="relative px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="font-serif text-3xl font-bold text-gold-gradient sm:text-4xl">
              Built for Banking Professionals
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-blue">
              Everything you need to identify, analyze, and close cost
              segregation opportunities -- powered by decades of industry
              expertise and modern AI.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="glass-card-hover p-6 flex flex-col items-start gap-4"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gold/10">
                  <feature.icon className="h-6 w-6 text-gold" />
                </div>
                <h3 className="font-serif text-lg font-semibold text-cream">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-blue">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer accent */}
      <div className="border-t border-gold/10 py-8 text-center text-sm text-slate-blue">
        <p>&copy; {new Date().getFullYear()} Boca Banker. All rights reserved.</p>
      </div>
    </div>
  );
}
