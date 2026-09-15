import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import { VirtualKeyboardProvider } from "@/components/VirtualKeyboardProvider";
import { SidebarProvider } from "@/components/dashboard/SidebarProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "AMAZ Hospital",
  description: "Seamless Patient Management",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} font-sans h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SidebarProvider>
            <VirtualKeyboardProvider>
              {children}
              <Toaster />
            </VirtualKeyboardProvider>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
