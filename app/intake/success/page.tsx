import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

interface SuccessPageProps {
  searchParams?: Record<string, string | string[] | undefined>
}

function getParamValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0]
  }
  return value
}

export default function IntakeSuccessPage({ searchParams }: SuccessPageProps) {
  const ticketNumber = getParamValue(searchParams?.ticketNumber)
  const customerName = getParamValue(searchParams?.name)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-16">
      <Card className="shadow-lg">
        <CardHeader className="space-y-3 text-center">
          <CardTitle className="text-3xl font-semibold">Terima kasih!</CardTitle>
          <CardDescription className="text-base">
            {customerName ? `Hai ${customerName}, ` : ""}
            permintaan servis anda telah diterima. Kami akan menghantar kemas kini melalui WhatsApp sebaik sahaja diagnosis siap.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {ticketNumber ? (
            <div className="mx-auto max-w-md rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-6">
              <p className="text-sm text-muted-foreground">Nombor tiket anda</p>
              <p className="text-2xl font-bold tracking-wide text-primary">#{ticketNumber}</p>
            </div>
          ) : null}
          <p className="text-muted-foreground">
            Sila simpan nombor tiket ini untuk rujukan. Pasukan teknikal kami akan menghubungi anda dalam masa terdekat bagi
            berkongsi hasil diagnosis, anggaran kos pembaikan dan langkah seterusnya.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col items-center gap-3">
          <Button asChild size="lg">
            <Link href="/">Kembali ke laman utama</Link>
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Ada soalan segera? Hubungi kami melalui WhatsApp dan sebutkan nombor tiket anda supaya kami dapat membantu dengan
            pantas.
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
