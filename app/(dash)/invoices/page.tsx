import { IconCash, IconDeviceMobileMessage, IconDownload, IconPlus } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getInvoices } from "@/lib/mock-data"

const statusColors: Record<string, string> = {
  Paid: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  Overdue: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  "Due Soon": "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  Draft: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount)
}

export default async function InvoicesPage() {
  const invoices = await getInvoices()
  const totalPaid = invoices
    .filter((invoice) => invoice.status === "Paid")
    .reduce((sum, invoice) => sum + invoice.amount, 0)
  const dueSoon = invoices.filter((invoice) => invoice.status === "Due Soon").length
  const overdue = invoices.filter((invoice) => invoice.status === "Overdue").length

  return (
    <div className="flex flex-1 flex-col gap-6 py-4 md:py-6">
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Invoices</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Track WhatsApp invoicing, payment reminders, and settlement performance.
          </p>
        </div>
      </div>

      <div className="grid gap-4 px-4 lg:grid-cols-3 lg:px-6">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Paid in July</CardTitle>
              <CardDescription>Confirmed settlements across channels</CardDescription>
            </div>
            <IconCash className="text-muted-foreground size-7" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Due soon</CardTitle>
            <CardDescription>Auto-reminders scheduled via WhatsApp</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-amber-500">{dueSoon}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Overdue</CardTitle>
            <CardDescription>Escalated to finance follow-up</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-rose-500">{overdue}</p>
          </CardContent>
        </Card>
      </div>

      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader className="gap-4 pb-2 sm:flex sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <CardTitle>Recent invoices</CardTitle>
              <CardDescription>Synced from POS billing and WhatsApp collections.</CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" className="gap-2">
                <IconDownload className="size-4" />
                Download CSV
              </Button>
              <Button className="gap-2">
                <IconPlus className="size-4" />
                New invoice
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-36">Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden sm:table-cell">Channel</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id} className="hover:bg-muted/40">
                    <TableCell className="font-medium">{invoice.id}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium leading-tight">{invoice.customer}</span>
                        <span className="text-muted-foreground text-xs">{invoice.channel}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-sm sm:table-cell">
                      <Badge variant="outline" className="bg-primary/5 text-primary inline-flex items-center gap-1.5">
                        <IconDeviceMobileMessage className="size-3" />
                        {invoice.channel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(invoice.dueDate).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge className={statusColors[invoice.status] ?? ""} variant="outline">
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(invoice.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Automation timeline</CardTitle>
            <CardDescription>Upcoming WhatsApp reminders and escalation triggers.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {invoices.map((invoice) => (
              <div key={`${invoice.id}-timeline`} className="border-border bg-muted/40 flex items-center justify-between rounded-lg border p-3 text-sm">
                <div className="flex flex-col">
                  <span className="font-medium">
                    {invoice.id} · {invoice.customer}
                  </span>
                  <span className="text-muted-foreground">
                    Reminder scheduled for {new Date(invoice.dueDate).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <Badge variant="outline" className={statusColors[invoice.status] ?? ""}>
                  {invoice.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
