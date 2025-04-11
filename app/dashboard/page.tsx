import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, BoxIcon, Layers, Settings } from "lucide-react"

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-zinc-400 mt-1">Welcome to your warehouse management system.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-zinc-900 border-zinc-800 text-zinc-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Boxes</CardTitle>
            <BoxIcon className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,284</div>
            <p className="text-xs text-zinc-400 mt-1">+12% from last month</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800 text-zinc-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Shelf Capacity</CardTitle>
            <Layers className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">76%</div>
            <p className="text-xs text-zinc-400 mt-1">+2% from last week</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800 text-zinc-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Warehouse Status</CardTitle>
            <Settings className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Optimal</div>
            <p className="text-xs text-zinc-400 mt-1">All systems operational</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800 text-zinc-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Efficiency</CardTitle>
            <BarChart3 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">92%</div>
            <p className="text-xs text-zinc-400 mt-1">+5% from last quarter</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
