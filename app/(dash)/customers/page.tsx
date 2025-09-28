import { IconFilter, IconUserPlus, IconUsers } from "@tabler/icons-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getCustomers } from "@/lib/mock-data"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount)
}

const statusStyles: Record<string, string> = {
  Active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "At Risk": "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  Prospect: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  Inactive: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
}

export default async function CustomersPage() {
  const customers = await getCustomers()
  const totalSpend = customers.reduce((sum, customer) => sum + customer.spend, 0)
  const activeCustomers = customers.filter((customer) => customer.status === "Active").length
  const riskCustomers = customers.filter((customer) => customer.status === "At Risk").length

  return (
    <div className="flex flex-1 flex-col gap-6 py-4 md:py-6">
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Customers</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Manage WhatsApp-first customer relationships, retention campaigns, and CRM health in one place.
          </p>
        </div>
      </div>

      <div className="grid gap-4 px-4 lg:grid-cols-3 lg:px-6">
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Total customers</CardTitle>
              <CardDescription>Accounts synced from CRM + WhatsApp</CardDescription>
            </div>
            <IconUsers className="text-muted-foreground size-8" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{customers.length}</p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Monthly recurring spend</CardTitle>
            <CardDescription>Transactional volume across channels</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatCurrency(totalSpend)}</p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Retention signals</CardTitle>
            <CardDescription>Active vs at-risk cohorts</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-semibold">{activeCustomers}</p>
            </div>
            <Separator orientation="vertical" className="h-12" />
            <div>
              <p className="text-sm text-muted-foreground">At Risk</p>
              <p className="text-2xl font-semibold text-amber-500">{riskCustomers}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader className="gap-4 pb-2 sm:flex sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <CardTitle>Customer directory</CardTitle>
              <CardDescription>Syncs directly from the POS and WhatsApp contact book.</CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" className="gap-2">
                <IconFilter className="size-4" />
                Quick filters
              </Button>
              <Button className="gap-2">
                <IconUserPlus className="size-4" />
                Add customer
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-48">Customer</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Last WhatsApp touch</TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  <TableHead className="text-right">Lifetime spend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id} className="hover:bg-muted/40">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9">
                          <AvatarFallback className="bg-primary/10 text-primary font-medium">
                            {customer.name
                              .split(" ")
                              .map((part) => part[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium leading-tight">{customer.name}</span>
                          <span className="text-muted-foreground text-xs">{customer.phone}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="align-middle text-sm">{customer.company}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(customer.lastOrder).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="hidden text-sm md:table-cell">
                      <Badge className={statusStyles[customer.status] ?? ""} variant="outline">
                        {customer.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(customer.spend)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
