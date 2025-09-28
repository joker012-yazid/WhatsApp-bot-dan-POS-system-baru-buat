"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface TicketActionsProps {
  ticketId: string
  ticketNumber: string
  customerName: string
  problemDescription: string
  currentStatus: string
  estimatedCost?: string | null
  latestDiagnostic?: {
    summary: string | null
    recommendedActions: string | null
    estimatedCost: string | null
  } | null
}

type ActionKey =
  | "begin-diagnosis"
  | "send-diagnosis"
  | "approve-repair"
  | "start-repair"
  | "send-update"
  | "ready-pickup"
  | "picked-up"

function parseCost(value?: string | null): number | undefined {
  if (!value) return undefined
  const parsed = Number(value)
  if (Number.isNaN(parsed)) {
    return undefined
  }
  return parsed
}

export function TicketActions(props: TicketActionsProps) {
  const router = useRouter()
  const [pendingAction, setPendingAction] = useState<ActionKey | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  async function runAction(action: ActionKey, request: RequestInit & { endpoint: string }) {
    setPendingAction(action)
    setActionError(null)

    try {
      const response = await fetch(request.endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: request.body,
        cache: "no-store",
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: unknown }
        const message =
          typeof payload.error === "string"
            ? payload.error
            : "Aksi gagal dijalankan. Sila cuba lagi."
        setActionError(message)
        return
      }

      router.refresh()
    } catch (error) {
      console.error(error)
      setActionError("Ralat rangkaian semasa menjalankan tindakan.")
    } finally {
      setPendingAction(null)
    }
  }

  const derivedSummary =
    props.latestDiagnostic?.summary ||
    `Isu yang dilaporkan: ${props.problemDescription.slice(0, 160)}`
  const derivedActions =
    props.latestDiagnostic?.recommendedActions ||
    "Kami akan berkongsi cadangan pembaikan lengkap selepas ujian tambahan."
  const derivedEstimate =
    parseCost(props.latestDiagnostic?.estimatedCost) ?? parseCost(props.estimatedCost)

  return (
    <div className="space-y-3">
      {actionError ? (
        <Alert variant="destructive">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={pendingAction !== null}
          onClick={() =>
            runAction("begin-diagnosis", {
              endpoint: `/api/tickets/${props.ticketId}/updates`,
              body: JSON.stringify({
                updateType: "status_change",
                description: `Teknisi sedang memulakan diagnosis untuk tiket #${props.ticketNumber}.`,
                status: "diagnosed",
              }),
            })
          }
        >
          {pendingAction === "begin-diagnosis" ? "Mengemas kini..." : "Mulakan diagnosis"}
        </Button>
        <Button
          variant="outline"
          disabled={pendingAction !== null}
          onClick={() =>
            runAction("send-diagnosis", {
              endpoint: `/api/tickets/${props.ticketId}/diagnose`,
              body: JSON.stringify({
                summary: derivedSummary,
                recommendedActions: derivedActions,
                estimatedCost: derivedEstimate,
              }),
            })
          }
        >
          {pendingAction === "send-diagnosis" ? "Menghantar..." : "Hantar ringkasan diagnosis"}
        </Button>
        <Button
          variant="outline"
          disabled={pendingAction !== null}
          onClick={() =>
            runAction("approve-repair", {
              endpoint: `/api/tickets/${props.ticketId}/diagnose`,
              body: JSON.stringify({
                summary: `Pelanggan meluluskan pembaikan untuk tiket #${props.ticketNumber}.`,
                recommendedActions: derivedActions,
                estimatedCost: derivedEstimate,
                approved: true,
                approvalNotes: "Kami akan mula membaiki sebaik sahaja alat ganti disediakan.",
              }),
            })
          }
        >
          {pendingAction === "approve-repair" ? "Menghantar..." : "Tanda pelanggan lulus"}
        </Button>
        <Button
          variant="outline"
          disabled={pendingAction !== null}
          onClick={() =>
            runAction("start-repair", {
              endpoint: `/api/tickets/${props.ticketId}/updates`,
              body: JSON.stringify({
                updateType: "progress",
                description: `Tiket #${props.ticketNumber} kini dalam proses pembaikan aktif.`,
                status: "repairing",
                notify: true,
              }),
            })
          }
        >
          {pendingAction === "start-repair" ? "Menghantar..." : "Mulakan pembaikan"}
        </Button>
        <Button
          variant="outline"
          disabled={pendingAction !== null}
          onClick={() =>
            runAction("send-update", {
              endpoint: `/api/tickets/${props.ticketId}/updates`,
              body: JSON.stringify({
                updateType: "progress",
                description: `Kemajuan tiket #${props.ticketNumber}: ${props.currentStatus.replaceAll("_", " ")}.`,
                notify: true,
              }),
            })
          }
        >
          {pendingAction === "send-update" ? "Menghantar..." : "Hantar kemas kini"}
        </Button>
        <Button
          variant="outline"
          disabled={pendingAction !== null}
          onClick={() =>
            runAction("ready-pickup", {
              endpoint: `/api/tickets/${props.ticketId}/pickup`,
              body: JSON.stringify({
                status: "done",
              }),
            })
          }
        >
          {pendingAction === "ready-pickup" ? "Menghantar..." : "Tandakan siap"}
        </Button>
        <Button
          variant="default"
          disabled={pendingAction !== null}
          onClick={() =>
            runAction("picked-up", {
              endpoint: `/api/tickets/${props.ticketId}/pickup`,
              body: JSON.stringify({
                status: "picked_up",
              }),
            })
          }
        >
          {pendingAction === "picked-up" ? "Menghantar..." : "Tandakan sudah diambil"}
        </Button>
      </div>
    </div>
  )
}
