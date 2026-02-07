export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#0F1B2D] bg-navy-gradient palm-pattern">
      {/* Subtle decorative gradient overlay */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(201,168,76,0.04)_0%,transparent_70%)]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(201,168,76,0.03)_0%,transparent_70%)]" />
      </div>

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  )
}
