"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const intakeFormSchema = z.object({
  customerName: z.string().min(2, "Nama pelanggan diperlukan"),
  customerPhone: z.string().min(6, "Nombor telefon diperlukan"),
  customerEmail: z.string().email("Email tidak sah").optional().or(z.literal("").transform(() => undefined)),
  customerCompany: z.string().optional(),
  deviceType: z.string().min(2, "Jenis peranti diperlukan"),
  deviceModel: z.string().min(2, "Model peranti diperlukan"),
  serialNumber: z.string().optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  problemDescription: z.string().min(10, "Sila terangkan masalah peranti"),
})

type IntakeFormValues = z.infer<typeof intakeFormSchema>

type ApiResponse = {
  ticket?: {
    id: string
    ticketNumber: string
    customer: {
      name: string
    }
  }
  error?: unknown
}

const priorities = [
  { value: "low", label: "Rendah" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "Tinggi" },
  { value: "urgent", label: "Segera" },
]

export default function IntakePage() {
  const router = useRouter()
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<IntakeFormValues>({
    resolver: zodResolver(intakeFormSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      customerCompany: "",
      deviceType: "",
      deviceModel: "",
      serialNumber: "",
      priority: "normal",
      problemDescription: "",
    },
  })

  const onSubmit = async (values: IntakeFormValues) => {
    setSubmissionError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/tickets/intake", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          customer: {
            name: values.customerName.trim(),
            phone: values.customerPhone.trim(),
            email: values.customerEmail?.trim() || undefined,
            company: values.customerCompany?.trim() || undefined,
          },
          device: {
            type: values.deviceType.trim(),
            model: values.deviceModel.trim(),
            serialNumber: values.serialNumber?.trim() || undefined,
          },
          priority: values.priority,
          problemDescription: values.problemDescription.trim(),
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as ApiResponse

      if (!response.ok || !payload.ticket) {
        const errorMessage =
          typeof payload.error === "string"
            ? payload.error
            : "Kami tidak dapat menghantar borang anda. Cuba lagi."
        setSubmissionError(errorMessage)
        return
      }

      form.reset()
      router.push(`/intake/success?ticketNumber=${encodeURIComponent(payload.ticket.ticketNumber)}&name=${encodeURIComponent(payload.ticket.customer.name)}`)
    } catch (error) {
      console.error(error)
      setSubmissionError("Ralat rangkaian. Sila cuba lagi.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 py-12">
      <Card className="shadow-lg">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-bold">Borang Pendaftaran Servis</CardTitle>
          <CardDescription>
            Berikan maklumat pelanggan dan peranti supaya kami boleh memulakan proses diagnosis dengan segera.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submissionError ? (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{submissionError}</AlertDescription>
            </Alert>
          ) : null}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama pelanggan</FormLabel>
                      <FormControl>
                        <Input placeholder="Contoh: Ahmad Ali" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombor WhatsApp</FormLabel>
                      <FormControl>
                        <Input placeholder="Contoh: +60123456789" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (optional)</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="nama@contoh.com" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerCompany"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Syarikat (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Nama syarikat" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="deviceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jenis peranti</FormLabel>
                      <FormControl>
                        <Input placeholder="Contoh: Telefon, Laptop" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="deviceModel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model peranti</FormLabel>
                      <FormControl>
                        <Input placeholder="Contoh: iPhone 13 Pro" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="serialNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombor siri (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Masukkan nombor siri" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Keutamaan</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih keutamaan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {priorities.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="problemDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Penerangan masalah</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Beritahu kami simptom, bila bermula, dan jika peranti pernah dibaiki sebelum ini."
                        rows={5}
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => form.reset()}>
                  Reset
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Menghantar..." : "Hantar tiket"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
