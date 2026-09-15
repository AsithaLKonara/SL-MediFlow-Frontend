import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Customer Display | AMAZ Hospital",
  description: "Customer facing display for POS and Tokens",
};

export default function CustomerDisplayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {children}
    </div>
  );
}
