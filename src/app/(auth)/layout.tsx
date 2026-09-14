export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left side - Welcome / Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center bg-primary text-primary-foreground p-12 relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-foreground/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-primary-foreground/10 rounded-full blur-3xl"></div>
        
        <div className="max-w-md space-y-6 relative z-10">
          {/* Logo Placeholder */}
          <div className="w-16 h-16 border-4 border-primary-foreground rounded-full flex items-center justify-center mb-10">
             <span className="text-3xl font-extrabold">A</span>
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight">Welcome <span className="italic font-serif text-accent">Back</span></h1>
          <p className="text-primary-foreground/80 leading-relaxed text-lg pt-4">
            AMAZ Hospital is the leading platform for seamless, premium, and efficient healthcare workflows.
          </p>
        </div>
      </div>
      
      {/* Right side - Form */}
      <div className="flex w-full lg:w-1/2 flex-col justify-center items-center bg-background p-8 sm:p-12 lg:p-24 relative">
        <div className="w-full max-w-sm xl:max-w-md relative z-10">
          {children}
        </div>
      </div>
    </div>
  )
}
