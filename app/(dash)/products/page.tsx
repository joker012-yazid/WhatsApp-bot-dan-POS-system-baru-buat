import { IconBarcode, IconBoxSeam, IconPackageExport, IconSearch } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { getProducts } from "@/lib/mock-data"

const statusVariants: Record<string, string> = {
  "In Stock": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "Low Stock": "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  Backorder: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value)
}

export default async function ProductsPage() {
  const products = await getProducts()
  const lowStock = products.filter((product) => product.status === "Low Stock").length
  const backorder = products.filter((product) => product.status === "Backorder").length

  return (
    <div className="flex flex-1 flex-col gap-6 py-4 md:py-6">
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Products</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Monitor POS inventory, omnichannel availability, and syncable catalog items.
          </p>
        </div>
      </div>

      <div className="grid gap-4 px-4 lg:grid-cols-3 lg:px-6">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Active SKUs</CardTitle>
              <CardDescription>WhatsApp sellable items</CardDescription>
            </div>
            <IconBarcode className="text-muted-foreground size-7" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{products.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Low stock alerts</CardTitle>
            <CardDescription>Below configured threshold</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-amber-500">{lowStock}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Backorder queue</CardTitle>
            <CardDescription>Awaiting supplier confirmation</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-blue-500">{backorder}</p>
          </CardContent>
        </Card>
      </div>

      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader className="gap-4 pb-2">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-1">
                <CardTitle>Catalog overview</CardTitle>
                <CardDescription>Channel-ready product information and stock status.</CardDescription>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative">
                  <IconSearch className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                  <Input placeholder="Search products" className="pl-9" />
                </div>
                <Button variant="outline" className="gap-2">
                  <IconPackageExport className="size-4" />
                  Export
                </Button>
                <Button className="gap-2">
                  <IconBoxSeam className="size-4" />
                  New product
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="border-border bg-card hover:border-primary/40 flex flex-col gap-3 rounded-xl border p-4 shadow-xs transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">{product.id}</span>
                      <h3 className="text-base font-semibold leading-tight">{product.name}</h3>
                      <span className="text-sm text-muted-foreground">{product.category}</span>
                    </div>
                    <Badge className={statusVariants[product.status] ?? ""} variant="outline">
                      {product.status}
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground">Unit price</span>
                      <span className="font-medium">{formatPrice(product.price)}</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-muted-foreground">Stock on hand</span>
                      <span className="font-medium">{product.stock} pcs</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
