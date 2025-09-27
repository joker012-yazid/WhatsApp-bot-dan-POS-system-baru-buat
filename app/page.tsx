"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  Bot,
  Database,
  LayoutDashboard,
  MessageCircle,
  ShieldCheck,
  ShoppingCart,
  Users,
  Workflow,
} from "lucide-react";
import { AuthButtons, HeroAuthButtons } from "@/components/auth-buttons";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardDescription,
  CardContent,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const featureSections = [
  {
    title: "WhatsApp Bot Integration",
    description:
      "Automate conversations with AI-driven flows that understand customer intent, share live updates, and deliver transactional messages directly in WhatsApp.",
    icon: MessageCircle,
    accent: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20",
    items: [
      "AI auto-reply with multilingual intent recognition",
      "Status tracking, appointment booking, and follow-up reminders",
      "Automatic quotation and invoice delivery with payment links",
      "Seamless hand-off to human agents when needed",
    ],
  },
  {
    title: "Customer Relationship Management",
    description:
      "A centralized CRM that keeps every conversation, ticket, and transaction in sync so teams can deliver personalised service.",
    icon: Users,
    accent: "from-sky-500/10 to-sky-500/5 border-sky-500/20",
    items: [
      "Complete customer profiles with WhatsApp history",
      "Internal notes and sentiment tracking for every interaction",
      "Customer segmentation and lifecycle analytics dashboards",
      "Feedback collection workflows connected to AI insights",
    ],
  },
  {
    title: "POS & Revenue Operations",
    description:
      "Manage quotations, invoices, and payments with a unified POS experience that links field service and retail operations.",
    icon: ShoppingCart,
    accent: "from-amber-500/10 to-amber-500/5 border-amber-500/20",
    items: [
      "Quotation builder with digital approvals",
      "Smart invoice generation with SST tax automation",
      "Multi-method payment capture and reconciliation",
      "Inventory tracking with stock alerts and cost controls",
    ],
  },
  {
    title: "AI Productivity",
    description:
      "Transform operational data into proactive insights that drive upsells, retention, and team efficiency.",
    icon: Bot,
    accent: "from-purple-500/10 to-purple-500/5 border-purple-500/20",
    items: [
      "Personalised responses and recommendation engine",
      "Predictive inventory demand and customer churn scores",
      "Sentiment analysis across WhatsApp conversations",
      "Actionable business insights with confidence scoring",
    ],
  },
  {
    title: "Ticket Lifecycle Management",
    description:
      "A technician-first workspace to manage repairs from intake to completion with rich media updates.",
    icon: Workflow,
    accent: "from-indigo-500/10 to-indigo-500/5 border-indigo-500/20",
    items: [
      "Automatic ticket creation from WhatsApp conversations",
      "Technician assignment, SLA priorities, and progress notes",
      "Photo uploads, diagnostics, and cost estimation workflows",
      "Lifecycle analytics for workload and turnaround performance",
    ],
  },
  {
    title: "Security & Compliance",
    description:
      "Enterprise-grade governance with role-based access, audit logging, and encryption everywhere.",
    icon: ShieldCheck,
    accent: "from-rose-500/10 to-rose-500/5 border-rose-500/20",
    items: [
      "Role-based access control with row-level security",
      "End-to-end encryption of sensitive customer data",
      "Comprehensive audit trail for GDPR compliance",
      "Automated backups with disaster recovery runbooks",
    ],
  },
] as const;

const journeyMaps = [
  {
    title: "Customer Journey",
    icon: Users,
    color: "text-emerald-500",
    steps: [
      "WhatsApp bot greets the customer, captures device details, and generates a QR-powered check-in form.",
      "Ticket is created instantly and routed to the right technician for diagnostics.",
      "Quotation is shared through WhatsApp for approval with transparent pricing.",
      "Real-time updates, media evidence, and final invoice sent for payment and pickup feedback.",
    ],
  },
  {
    title: "Staff Operations",
    icon: LayoutDashboard,
    color: "text-sky-500",
    steps: [
      "Team members log into the web workspace to review live KPIs and escalations.",
      "Customer and ticket records include notes, files, and WhatsApp history.",
      "POS module handles quotation-to-invoice conversion and reconciles payments.",
      "Dashboards surface AI insights, financial reports, and inventory forecasts.",
    ],
  },
  {
    title: "Administrator Control",
    icon: ShieldCheck,
    color: "text-rose-500",
    steps: [
      "Admins configure channels, AI policies, and backup strategies from a single console.",
      "User provisioning with granular roles, permissions, and password resets.",
      "System health, audit trails, and security alerts monitored in real time.",
      "Integrations managed with API keys, webhook monitoring, and update automation.",
    ],
  },
] as const;

const dataHighlights = [
  {
    title: "Customer Dashboard View",
    caption: "Understand loyalty",
    points: [
      "Aggregate ticket, invoice, and feedback history per customer",
      "Lifetime value, average rating, and most recent activity in one query",
    ],
  },
  {
    title: "Ticket Status View",
    caption: "Operational clarity",
    points: [
      "Status descriptions aligned with WhatsApp notifications",
      "Technician ownership, cost tracking, and SLA timestamps",
    ],
  },
  {
    title: "Inventory Status View",
    caption: "Resilient supply chain",
    points: [
      "Stock level health indicators with reorder automation",
      "Cost visibility and movement history for every SKU",
    ],
  },
  {
    title: "Financial Summary View",
    caption: "Finance-ready",
    points: [
      "Monthly revenue, tax, and outstanding balance reporting",
      "Supports overdue alerts and cashflow forecasting",
    ],
  },
  {
    title: "AI Insights View",
    caption: "AI copilots",
    points: [
      "Prioritised insights with confidence scoring and localisation",
      "Surface behavioural, sales, and inventory predictions",
    ],
  },
] as const;

const governancePillars = [
  {
    title: "Role-Based Access",
    detail: "Fine-grained permissions with PostgreSQL row-level security to isolate tenant data.",
  },
  {
    title: "Audit Trail",
    detail: "Immutable activity logs capture user, bot, and integration actions for compliance.",
  },
  {
    title: "Backup & Recovery",
    detail: "Automated snapshots and tested recovery playbooks keep operations online.",
  },
  {
    title: "Encryption Standards",
    detail: "Secrets, credentials, and customer PII encrypted at rest and in transit.",
  },
] as const;

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <main>
        <div className="relative isolate overflow-hidden">
          <div className="absolute inset-x-0 top-0 -z-10 h-[480px] bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.25),_transparent_65%)]" />
          <header className="container mx-auto flex items-center justify-between px-4 py-6">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
                <Bot className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold">WhatsApp POS System</p>
                <p className="text-xs text-slate-400">AI-powered repair & retail automation</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <AuthButtons />
              <ThemeToggle />
            </div>
          </header>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-4">
            <Image
              src="/codeguide-logo.png"
              alt="CodeGuide Logo"
              width={50}
              height={50}
              className="rounded-xl sm:w-[60px] sm:h-[60px]"
            />
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 bg-clip-text text-transparent font-parkinsans">
              Codeguide Starter Fullstack
            </h1>
          </div>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto px-4 mb-8">
            A modern full-stack TypeScript starter with authentication, database, and UI components
          </p>

          <div className="flex justify-center mb-10">
            <Button asChild size="lg" className="px-8 py-3 text-base">
              <Link href="/documentation">Read the Implementation Guide</Link>
            </Button>
          </div>

          <HeroAuthButtons />
        </div>

        <Separator className="my-12 bg-slate-800" />

        <section className="mx-auto max-w-6xl space-y-8">
            <div className="flex flex-col gap-2 text-center">
              <Badge className="mx-auto border border-slate-700 bg-slate-900/60 text-slate-200">
                Capability Pillars
              </Badge>
              <h2 className="text-3xl font-semibold text-slate-50 sm:text-4xl">Everything the modern repair business needs</h2>
              <p className="text-slate-300">
                Deep integration between WhatsApp, CRM, POS, AI, and compliance modules keeps your teams aligned and customers delighted.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {featureSections.map((section) => (
                <Card
                  key={section.title}
                  className={`border ${section.accent} bg-slate-900/70 backdrop-blur`}
                >
                  <CardHeader className="flex flex-col gap-3">
                    <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/80 px-3 py-1 text-sm text-slate-200">
                      <section.icon className="h-4 w-4 text-slate-300" />
                      {section.title}
                    </span>
                    <CardDescription className="text-slate-300">
                      {section.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 pb-6">
                    <ul className="space-y-3 text-sm text-slate-200">
                      {section.items.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="mt-1 inline-flex h-2 w-2 flex-none rounded-full bg-slate-400" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
        </section>

        <Separator className="my-16 bg-slate-800" />

        <section className="mx-auto max-w-6xl space-y-10">
            <div className="flex flex-col gap-2 text-center">
              <Badge className="mx-auto border border-slate-700 bg-slate-900/60 text-slate-200">
                Guided Journeys
              </Badge>
              <h2 className="text-3xl font-semibold text-slate-50 sm:text-4xl">Designed around people, not tickets</h2>
              <p className="text-slate-300">
                Each persona experiences a curated workflow that blends human expertise with intelligent automation.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {journeyMaps.map((journey) => (
                <Card key={journey.title} className="border border-slate-800 bg-slate-900/70">
                  <CardHeader className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800/80 ${journey.color}`}>
                        <journey.icon className="h-5 w-5" />
                      </span>
                      <CardTitle className="text-lg text-slate-100">{journey.title}</CardTitle>
                    </div>
                    <CardDescription className="text-slate-300">
                      A four-step lifecycle optimised for clarity and speed.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pb-6">
                    <ol className="space-y-4 text-sm text-slate-200">
                      {journey.steps.map((step, index) => (
                        <li key={step} className="flex gap-3">
                          <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full border border-slate-700 bg-slate-900/70 text-xs font-semibold text-slate-200">
                            {index + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <Separator className="my-16 bg-slate-800" />

          <section className="mx-auto max-w-6xl space-y-10">
            <div className="flex flex-col gap-2 text-center">
              <Badge className="mx-auto border border-slate-700 bg-slate-900/60 text-slate-200">
                Data Foundation
              </Badge>
              <h2 className="text-3xl font-semibold text-slate-50 sm:text-4xl">PostgreSQL schema engineered for insight</h2>
              <p className="text-slate-300">
                Views and indexes keep analytics real-time, while row-level security protects customer trust.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {dataHighlights.map((highlight) => (
                <Card key={highlight.title} className="border border-slate-800 bg-slate-900/70">
                  <CardHeader>
                    <CardTitle className="text-lg text-slate-100">{highlight.title}</CardTitle>
                    <CardDescription className="text-slate-400">
                      {highlight.caption}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 pb-6 text-sm text-slate-200">
                    {highlight.points.map((point) => (
                      <div key={point} className="flex items-start gap-2">
                        <Database className="mt-1 h-4 w-4 text-slate-400" />
                        <span>{point}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card className="border border-slate-800 bg-slate-900/80">
              <CardHeader className="gap-3">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-emerald-400" />
                  <CardTitle className="text-2xl text-slate-100">
                    Security operations woven into every layer
                  </CardTitle>
                </div>
                <CardDescription className="text-slate-300">
                  Governance controls ensure every automation complies with GDPR and industry best practices.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 sm:grid-cols-2">
                {governancePillars.map((pillar) => (
                  <div key={pillar.title} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                    <div className="flex items-center gap-2 text-slate-200">
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      <span className="font-medium">{pillar.title}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">{pillar.detail}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
        </section>

        <Separator className="my-16 bg-slate-800" />

        <section className="mx-auto max-w-5xl rounded-3xl border border-slate-800 bg-slate-900/70 p-10 text-center">
            <Badge className="border border-slate-700 bg-slate-900/60 text-slate-200">
              Launch Ready
            </Badge>
            <h2 className="mt-4 text-3xl font-semibold text-slate-50 sm:text-4xl">
              Deploy a compliant, AI-assisted service business in days
            </h2>
            <p className="mt-3 text-lg text-slate-300">
              Connect WhatsApp, empower technicians, and give management the real-time visibility they need. Start with a secure foundation that scales.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-emerald-500 text-slate-950 hover:bg-emerald-400">
                <Link href="/sign-up">Create Your Workspace</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-slate-700 bg-transparent text-slate-100 hover:bg-slate-800">
                <Link href="/documentation">View Implementation Guide</Link>
              </Button>
            </div>
        </section>
      </main>
    </div>
  );
}
