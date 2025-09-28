"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const optionalString = z
  .string()
  .optional()
  .transform((value) => {
    if (typeof value !== "string") {
      return undefined
    }
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  })

const intakeFormSchema = z.object({
  customerName: z.string().min(2, "Nama pelanggan diperlukan"),
  customerPhone: z.string().min(6, "Nombor telefon diperlukan"),
  customerEmail: z.string().email("Email tidak sah").optional().or(z.literal("").transform(() => undefined)),
  customerCompany: z.string().optional(),
  deviceBrand: z.string().min(2, "Jenama peranti diperlukan"),
  deviceModel: z.string().min(2, "Model peranti diperlukan"),
  deviceType: optionalString,
  serialNumber: optionalString,
  deviceColor: optionalString,
  securityCode: optionalString,
  accessories: optionalString,
  problemDescription: z.string().min(10, "Sila terangkan masalah peranti"),
  termsAccepted: z.boolean().refine((value) => value, "Anda perlu bersetuju dengan terma servis"),
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
      deviceBrand: "",
      deviceModel: "",
      deviceType: "",
      serialNumber: "",
      deviceColor: "",
      securityCode: "",
      accessories: "",
      problemDescription: "",
      termsAccepted: false,
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
            brand: values.deviceBrand.trim(),
            model: values.deviceModel.trim(),
            type: values.deviceType?.trim() || undefined,
            serialNumber: values.serialNumber?.trim() || undefined,
            color: values.deviceColor?.trim() || undefined,
            securityCode: values.securityCode?.trim() || undefined,
            accessories: values.accessories?.trim() || undefined,
          },
          problemDescription: values.problemDescription.trim(),
          termsAccepted: values.termsAccepted,
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
      router.push(
        `/intake/success?ticketNumber=${encodeURIComponent(payload.ticket.ticketNumber)}&name=${encodeURIComponent(
          payload.ticket.customer.name,
        )}`,
      )
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
                  name="deviceBrand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jenama peranti</FormLabel>
                      <FormControl>
                        <Input placeholder="Contoh: Apple, Samsung" {...field} disabled={isSubmitting} />
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
                  name="deviceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jenis peranti (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Contoh: Telefon, Laptop" {...field} disabled={isSubmitting} />
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
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="deviceColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Warna peranti (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Contoh: Hitam" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="securityCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kata laluan / PIN (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Contoh: 1234" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accessories"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Aksesori disertakan (optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Contoh: Pengecas, kabel USB" rows={3} {...field} disabled={isSubmitting} />
                      </FormControl>
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

              <FormField
                control={form.control}
                name="termsAccepted"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-base">Saya bersetuju dengan terma servis</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Dengan menghantar borang ini, saya mengesahkan maklumat adalah tepat dan bersetuju dengan terma SOP
                        pembaikan.
                      </p>
                    </div>
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
