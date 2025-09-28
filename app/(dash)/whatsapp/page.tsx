import { IconMessageCircleBolt, IconMessageCirclePlus, IconPhoneCall, IconRocket } from "@tabler/icons-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { getWhatsappInbox } from "@/lib/mock-data"

const channelStyles: Record<string, string> = {
  Campaign: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  Finance: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  Support: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  Success: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  Sales: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
}

export default async function WhatsappPage() {
  const inbox = await getWhatsappInbox()
  const totalUnread = inbox.reduce((sum, conversation) => sum + conversation.unread, 0)
  const activeConversations = inbox.length

  return (
    <div className="flex flex-1 flex-col gap-6 py-4 md:py-6">
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">WhatsApp Control Center</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Automate conversation routing, resolve tickets faster, and sync WhatsApp data back to POS.
          </p>
        </div>
      </div>

      <div className="grid gap-4 px-4 lg:grid-cols-3 lg:px-6">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Active conversations</CardTitle>
              <CardDescription>Live WhatsApp threads across teams</CardDescription>
            </div>
            <IconMessageCircleBolt className="text-muted-foreground size-7" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{activeConversations}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Unread messages</CardTitle>
            <CardDescription>Queue prioritised by SLA policies</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-rose-500">{totalUnread}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Average response</CardTitle>
            <CardDescription>Rolling 7 day performance</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-emerald-500">3m 42s</p>
          </CardContent>
        </Card>
      </div>

      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader className="gap-4 pb-2 sm:flex sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <CardTitle>Inbox</CardTitle>
              <CardDescription>Real-time sync from the WhatsApp Business Platform.</CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" className="gap-2">
                <IconRocket className="size-4" />
                Launch campaign
              </Button>
              <Button className="gap-2">
                <IconMessageCirclePlus className="size-4" />
                New chat
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[420px]">
              <div className="flex flex-col divide-y divide-border">
                {inbox.map((conversation) => (
                  <div key={conversation.id} className="hover:bg-muted/40 flex items-center gap-4 px-4 py-3 transition">
                    <Avatar className="size-11">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {initials(conversation.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium leading-tight">{conversation.name}</span>
                          <Badge className={channelStyles[conversation.channel] ?? ""} variant="outline">
                            {conversation.channel}
                          </Badge>
                        </div>
                        <span className="text-muted-foreground text-xs">
                          {new Date(conversation.timestamp).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-muted-foreground line-clamp-2 text-sm">
                        {conversation.preview}
                      </p>
                    </div>
                    {conversation.unread > 0 ? (
                      <Badge className="bg-rose-500 text-white">{conversation.unread}</Badge>
                    ) : (
                      <IconPhoneCall className="text-muted-foreground size-5" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Escalation matrix</CardTitle>
            <CardDescription>How WhatsApp intents route into the POS + CRM stack.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="border-border bg-muted/40 flex flex-col gap-2 rounded-lg border p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Sales</h3>
                <p className="text-sm text-muted-foreground">
                  Auto-assigned to the sales pod with product catalog shortcuts and deal sync back to POS.
                </p>
              </div>
              <div className="border-border bg-muted/40 flex flex-col gap-2 rounded-lg border p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Support</h3>
                <p className="text-sm text-muted-foreground">
                  Conversational AI triages tickets before escalating to live agents with POS order context.
                </p>
              </div>
              <div className="border-border bg-muted/40 flex flex-col gap-2 rounded-lg border p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Finance</h3>
                <p className="text-sm text-muted-foreground">
                  Payment intents sync to invoicing workflows and trigger reminders automatically.
                </p>
              </div>
            </div>
            <Separator />
            <p className="text-sm text-muted-foreground">
              Need deeper automation? Connect additional flows through the automation builder or bring your own webhook for custom actions.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
