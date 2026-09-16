import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left side - Welcome / Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center bg-background text-foreground p-12 relative overflow-hidden border-r border-border/50">
        <div className="max-w-md space-y-6 relative z-10">
          {/* Logo */}
          <div className="mb-8">
            <Image 
              src="/logo.png" 
              alt="AMAZ Hospital Logo" 
              width={350} 
              height={100} 
              className="object-contain drop-shadow-md h-20 w-auto object-left" 
            />
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight">Welcome <span className="italic font-serif text-primary">Back</span></h1>
          <p className="text-muted-foreground leading-relaxed text-lg pt-4">
            AMAZ Hospital is the leading platform for seamless, premium, and efficient healthcare workflows.
          </p>
        </div>
      </div>
      
      {/* Right side - Form */}
      <div className="flex w-full lg:w-1/2 flex-col justify-center items-center p-8 sm:p-12 lg:p-24 relative bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-400 via-indigo-900 to-slate-900">
        <div className="w-full max-w-sm xl:max-w-md relative z-10 bg-card text-card-foreground p-8 rounded-2xl shadow-[var(--shadow-diffuse)] border border-border/50">
          {children}
        </div>
      </div>
    </div>
  )
}
