import Link from "next/link"
import { Layers } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function WelcomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-50">
      <div className="flex flex-1 flex-col items-center justify-center px-4 text-center sm:px-6">
        <div className="flex items-center justify-center mb-8">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
            <Layers className="h-10 w-10 text-emerald-500" />
          </div>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
          Welcome to <span className="text-emerald-500">Nestiha</span> Warehouse
        </h1>
        <p className="mt-6 max-w-3xl text-lg text-zinc-400 md:text-xl">
          Your comprehensive warehouse management system for efficient inventory tracking, shelf management, and
          real-time monitoring.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
            <Link href="/dashboard">Enter Dashboard</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-zinc-800 hover:bg-zinc-900">
            <Link href="/dashboard/monitoring">View Warehouse</Link>
          </Button>
        </div>
      </div>
      <footer className="border-t border-zinc-800 py-6 text-center text-sm text-zinc-500">
        <p>© {new Date().getFullYear()} Nestiha Warehouse. All rights reserved.</p>
      </footer>
    </div>
  )
}
