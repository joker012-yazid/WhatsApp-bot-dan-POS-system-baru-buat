import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { listTickets } from "@/lib/tickets"

import { TicketActions } from "./_components/ticket-actions"

const statusLabels: Record<string, { label: string; className: string }> = {
  intake: { label: "Intake", className: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200" },
  diagnosed: { label: "Diagnosa", className: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200" },
  awaiting_approval: {
    label: "Menunggu kelulusan",
    className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200",
  },
  approved: { label: "Diluluskan", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200" },
  rejected: { label: "Ditolak", className: "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200" },
  repairing: { label: "Dalam pembaikan", className: "bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-200" },
  done: { label: "Selesai", className: "bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-200" },
  picked_up: { label: "Diambil", className: "bg-lime-100 text-lime-700 dark:bg-lime-500/10 dark:text-lime-200" },
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "-"
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("ms-MY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "-"
  const numeric = typeof value === "number" ? value : Number(value)
  if (Number.isNaN(numeric)) return "-"
  return new Intl.NumberFormat("ms-MY", { style: "currency", currency: "MYR" }).format(numeric)
}

export default async function TicketsPage() {
  const tickets = await listTickets(40)

  return (
    <div className="flex flex-1 flex-col gap-6 py-6">
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Pengurusan Tiket Servis</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Pantau status pembaikan, rekod diagnosis dan automasikan mesej WhatsApp untuk setiap peringkat SOP.
          </p>
        </div>
      </div>

      <div className="space-y-4 px-4 lg:px-6">
        {tickets.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Tiada tiket</CardTitle>
              <CardDescription>Belum ada tiket servis yang direkodkan. Mulakan dengan borang intake pelanggan.</CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {tickets.map((ticket) => {
          const statusConfig = statusLabels[ticket.status] ?? statusLabels.intake
          const latestUpdate = ticket.latestUpdate
          const latestDiagnostic = ticket.latestDiagnostic
          const deviceLabel = [ticket.deviceBrand, ticket.deviceModel].filter(Boolean).join(" ")
          const deviceMeta = [ticket.deviceType, ticket.deviceColor].filter(Boolean).join(" · ")

          return (
            <Card key={ticket.id} className="shadow-sm">
              <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl font-semibold">Tiket #{ticket.ticketNumber}</CardTitle>
                  <CardDescription>
                    {ticket.customer.name}
                    {deviceLabel ? ` · ${deviceLabel}` : ""}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
                  {!ticket.termsAccepted ? (
                    <Badge variant="destructive">Terma belum disahkan</Badge>
                  ) : null}
                  {ticket.estimatedCost ? (
                    <Badge variant="outline">Anggaran: {formatCurrency(ticket.estimatedCost)}</Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Maklumat pelanggan</p>
                    <p className="text-sm">{ticket.customer.name}</p>
                    <p className="text-sm text-muted-foreground">{ticket.customer.phone}</p>
                    {ticket.customer.email ? (
                      <p className="text-sm text-muted-foreground">{ticket.customer.email}</p>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Peranti</p>
                    <p className="text-sm">{deviceLabel || "Tidak ditetapkan"}</p>
                    {deviceMeta ? <p className="text-sm text-muted-foreground">{deviceMeta}</p> : null}
                    {ticket.serialNumber ? (
                      <p className="text-sm text-muted-foreground">SN: {ticket.serialNumber}</p>
                    ) : null}
                    {ticket.securityCode ? (
                      <p className="text-sm text-muted-foreground">Kata laluan: {ticket.securityCode}</p>
                    ) : null}
                    {ticket.accessories ? (
                      <p className="text-sm text-muted-foreground">Aksesori: {ticket.accessories}</p>
                    ) : null}
                    <p className="text-sm text-muted-foreground">Dicipta: {formatDate(ticket.createdAt)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Kemas kini terkini</p>
                    {latestUpdate ? (
                      <div className="space-y-1 text-sm">
                        <p>{latestUpdate.description}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(latestUpdate.createdAt)}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Tiada kemas kini lagi</p>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Ringkasan diagnosis</p>
                    {latestDiagnostic ? (
                      <div className="space-y-2 text-sm">
                        <p>{latestDiagnostic.summary}</p>
                        {latestDiagnostic.recommendedActions ? (
                          <p className="text-muted-foreground">Cadangan: {latestDiagnostic.recommendedActions}</p>
                        ) : null}
                        {latestDiagnostic.estimatedCost ? (
                          <p className="text-muted-foreground">Anggaran: {formatCurrency(latestDiagnostic.estimatedCost)}</p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Belum ada diagnosis direkodkan. Gunakan butang tindakan pantas untuk menghantar ringkasan kepada pelanggan.
                      </p>
                    )}
                  </div>
                  <TicketActions
                    ticketId={ticket.id}
                    ticketNumber={ticket.ticketNumber}
                    customerName={ticket.customer.name}
                    problemDescription={ticket.problemDescription}
                    currentStatus={ticket.status}
                    estimatedCost={ticket.estimatedCost as string | null}
                    latestDiagnostic={latestDiagnostic}
                  />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
