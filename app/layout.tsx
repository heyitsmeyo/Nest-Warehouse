import type React from "react";
import Link from "next/link";
import { BarChart3, BoxIcon, Layers, Settings, Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ChatBot } from "@/components/chat-bot";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-50">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-zinc-800 bg-zinc-950/80 px-4 backdrop-blur-sm sm:px-6">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="border-zinc-800 bg-zinc-950 text-zinc-50"
          >
            <div className="flex flex-col gap-6 py-4">
              <div className="flex items-center gap-2 px-4">
                <Layers className="h-6 w-6 text-emerald-500" />
                <span className="text-lg font-semibold">WarehouseOS</span>
              </div>
              <nav className="flex flex-col gap-1 px-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-zinc-800/50"
                  >
                    <item.icon className="h-5 w-5 text-zinc-400" />
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2">
          <Layers className="h-6 w-6 text-emerald-500" />
          <span className="text-lg font-semibold hidden md:inline-flex">
            WarehouseOS
          </span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder-user.jpg" alt="User" />
                  <AvatarFallback className="bg-zinc-800 text-zinc-50">
                    U
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 border-zinc-800 bg-zinc-950 text-zinc-50"
            >
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem>Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <div className="flex flex-1">
        <aside className="hidden w-64 shrink-0 border-r border-zinc-800 bg-zinc-900 md:block">
          <div className="flex flex-col gap-6 py-4">
            <nav className="flex flex-col gap-1 px-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-zinc-800/50 transition-colors"
                >
                  <item.icon className="h-5 w-5 text-zinc-400" />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </aside>
        <main className="flex-1 overflow-auto">
          <div className="container py-6">{children}</div>
        </main>
      </div>
      <ChatBot />
    </div>
  );
}

const navItems = [
  {
    name: "Boxes",
    href: "/dashboard/boxes",
    icon: BoxIcon,
  },
  {
    name: "Shelves",
    href: "/dashboard/shelves",
    icon: Layers,
  },
  {
    name: "Warehouse Configuration",
    href: "/dashboard/configuration",
    icon: Settings,
  },
  {
    name: "Monitoring",
    href: "/dashboard/monitoring",
    icon: BarChart3,
  },
];
