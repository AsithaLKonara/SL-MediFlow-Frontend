import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Left side - Welcome / Branding Image */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-center items-center overflow-hidden">
        {/* Background Image using Next/Image for optimization */}
        <Image
          src="/images (8).jpeg"
          alt="Hospital Background"
          fill
          priority
          className="object-cover"
          sizes="50vw"
        />
        
        {/* Overlay based on theme (using 60-70% opacity dark overlay) */}
        <div className="absolute inset-0 bg-black/65 z-10 mix-blend-multiply" />
        
        {/* Subtle radial gradient to blend edges if needed */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.4)_100%)] z-10" />

        <div className="relative z-20 flex flex-col max-w-md p-12 text-white/90">
          {/* Logo - Assuming we use a white/monochrome version or adapt to the dark overlay */}
          <div className="mb-10">
            <div className="flex items-center gap-3">
              <Image 
                src="/logo.png" 
                alt="AMAZ Hospital Logo" 
                width={200} 
                height={50} 
                className="object-contain brightness-0 invert opacity-90" 
                priority
              />
            </div>
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-semibold tracking-tight text-white mb-4">
            Elevate your <br/>
            <span className="italic font-serif text-primary opacity-90">healthcare experience.</span>
          </h1>
          
          <p className="text-white/70 leading-relaxed text-base mt-2">
            AMAZ Hospital is the leading platform for seamless, premium, and AI-powered healthcare workflows.
          </p>
        </div>
      </div>
      
      {/* Right side - Form (Liquid Glass + Circular Gradients) */}
      <div className="flex w-full lg:w-1/2 flex-col justify-center items-center relative overflow-hidden bg-[#0a0a0a]">
        
        {/* Ambient Circular Gradients */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[140px] translate-y-1/3 -translate-x-1/4 pointer-events-none" />

        {/* The form container - seamlessly blending into the section (no card background) */}
        <div className="w-full max-w-sm xl:max-w-md relative z-10 p-6 sm:p-10 flex flex-col justify-center h-full">
          {children}
        </div>
      </div>
    </div>
  )
}
