import { desc, eq } from "drizzle-orm"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { db } from "@/db"
import { customers, tickets, waMessages } from "@/db/schema"
import { listTickets } from "@/lib/tickets"

import { TicketActions } from "../tickets/_components/ticket-actions"

type WaMessageRecord = typeof waMessages.$inferSelect

interface Thread {
  key: string
  ticketId: string | null
  ticketNumber?: string | null
  customerName: string
  customerPhone?: string | null
  lastMessage: WaMessageRecord
  stage?: string | null
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

export default async function WhatsappPage() {
  const [ticketsList, messageRows] = await Promise.all([
    listTickets(50),
    db
      .select({
        message: waMessages,
        customer: customers,
        ticket: tickets,
      })
      .from(waMessages)
      .leftJoin(customers, eq(waMessages.customerId, customers.id))
      .leftJoin(tickets, eq(waMessages.ticketId, tickets.id))
      .orderBy(desc(waMessages.sentAt))
      .limit(50),
  ])

  const ticketsById = new Map(ticketsList.map((ticket) => [ticket.id, ticket]))

  const inboundCount = messageRows.filter((row) => row.message.direction === "inbound").length
  const outboundCount = messageRows.filter((row) => row.message.direction === "outbound").length
  const failedCount = messageRows.filter((row) => row.message.status === "failed").length

  const threadMap = new Map<string, Thread>()
  for (const row of messageRows) {
    const stage = typeof row.message.metadata === "object" && row.message.metadata
      ? ((row.message.metadata as Record<string, unknown>).stage as string | undefined)
      : undefined
    const key = row.message.ticketId ?? row.customer?.id ?? row.message.sessionId
    if (!threadMap.has(key)) {
      threadMap.set(key, {
        key,
        ticketId: row.message.ticketId,
        ticketNumber: row.ticket?.ticketNumber ?? undefined,
        customerName: row.customer?.name ?? "Tidak dikenali",
        customerPhone: row.customer?.phone ?? null,
        lastMessage: row.message,
        stage: stage ?? (typeof row.message.metadata === "object"
          ? ((row.message.metadata as Record<string, unknown>).intent as string | undefined)
          : undefined),
      })
    }
  }

  const threads = Array.from(threadMap.values()).slice(0, 12)

  return (
    <div className="flex flex-1 flex-col gap-6 py-6">
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">WhatsApp Automation Hub</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Lihat perbualan terbaru, pantau status penghantaran dan gunakan tindakan pantas untuk menyelaraskan SOP pembaikan.
          </p>
        </div>
      </div>

      <div className="grid gap-4 px-4 lg:grid-cols-3 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Mesej keluar</CardTitle>
            <CardDescription>Jumlah mesej automasi dihantar 24 jam lepas</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-primary">{outboundCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Mesej masuk</CardTitle>
            <CardDescription>Untuk perhatian manual atau auto-reply</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-emerald-500">{inboundCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Gagal dihantar</CardTitle>
            <CardDescription>Perlu tindakan semula atau semakan gateway</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-rose-500">{failedCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 px-4 lg:px-6">
        {threads.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Belum ada mesej</CardTitle>
              <CardDescription>Kemaskini akan muncul di sini selepas automasi menghantar mesej keluar pertama.</CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {threads.map((thread) => {
          const ticket = thread.ticketId ? ticketsById.get(thread.ticketId) : null
          const statusLabel = ticket ? ticket.status.replaceAll("_", " ") : "Tanpa tiket"
          const stageLabel = thread.stage ? thread.stage.replaceAll("_", " ") : null

          return (
            <Card key={thread.key} className="shadow-sm">
              <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl font-semibold">
                    {thread.ticketNumber ? `Tiket #${thread.ticketNumber}` : thread.customerName}
                  </CardTitle>
                  <CardDescription>
                    {thread.customerName}
                    {thread.customerPhone ? ` · ${thread.customerPhone}` : ""}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {ticket ? <Badge variant="outline">Status tiket: {statusLabel}</Badge> : null}
                  {stageLabel ? <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200">SOP: {stageLabel}</Badge> : null}
                  <Badge variant="outline">{thread.lastMessage.direction === "outbound" ? "Keluar" : "Masuk"}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-muted-foreground">Mesej terakhir</p>
                  <p>{thread.lastMessage.body}</p>
                  <p className="text-xs text-muted-foreground">Dihantar pada {formatDate(thread.lastMessage.sentAt)}</p>
                </div>

                {ticket ? (
                  <>
                    <Separator />
                    <TicketActions
                      ticketId={ticket.id}
                      ticketNumber={ticket.ticketNumber}
                      customerName={ticket.customer.name}
                      problemDescription={ticket.problemDescription}
                      currentStatus={ticket.status}
                      estimatedCost={ticket.estimatedCost as string | null}
                      latestDiagnostic={ticket.latestDiagnostic}
                    />
                  </>
                ) : null}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
