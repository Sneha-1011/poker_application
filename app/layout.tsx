import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { ToastProvider } from "@/components/ui/use-toast"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Texas Hold'em Poker Game",
  description: "A fully-featured Texas Hold'em poker game with AI opponents and game theory-based recommendations",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
          storageKey="poker-theme"
        >
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
        <div data-toast-container className="fixed bottom-0 right-0 p-4 space-y-2 z-50"></div>
      </body>
    </html>
  )
}
