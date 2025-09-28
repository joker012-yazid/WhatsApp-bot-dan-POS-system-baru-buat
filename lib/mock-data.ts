import dashboardSections from "@/lib/data/dashboard.json"

type Delay = number | undefined

async function wait(ms: Delay = 40) {
  if (!ms) return
  await new Promise((resolve) => setTimeout(resolve, ms))
}

export type DashboardSection = (typeof dashboardSections)[number]

const customerData = [
  {
    id: "CUS-1001",
    name: "Aisyah Rahman",
    company: "Rahman Retail Group",
    phone: "+62 812-1111-2222",
    status: "Active",
    lastOrder: "2024-07-12",
    spend: 125000000,
  },
  {
    id: "CUS-1002",
    name: "Daniel Lim",
    company: "Lim Logistics",
    phone: "+62 811-5555-8888",
    status: "At Risk",
    lastOrder: "2024-06-28",
    spend: 78000000,
  },
  {
    id: "CUS-1003",
    name: "Siti Nurhaliza",
    company: "Kopi Nusantara",
    phone: "+62 813-7777-3333",
    status: "Prospect",
    lastOrder: "2024-05-21",
    spend: 23000000,
  },
  {
    id: "CUS-1004",
    name: "Budi Santoso",
    company: "Santoso Mart",
    phone: "+62 812-9999-1111",
    status: "Active",
    lastOrder: "2024-07-08",
    spend: 99000000,
  },
  {
    id: "CUS-1005",
    name: "Putri Ayu",
    company: "Ayu Fashion",
    phone: "+62 812-1234-5678",
    status: "Inactive",
    lastOrder: "2024-04-12",
    spend: 15500000,
  },
] as const

const productData = [
  {
    id: "PRD-01",
    name: "Premium WhatsApp Blast",
    category: "Messaging",
    price: 299000,
    stock: 120,
    status: "In Stock",
  },
  {
    id: "PRD-02",
    name: "POS Terminal Pro",
    category: "Hardware",
    price: 2499000,
    stock: 34,
    status: "Low Stock",
  },
  {
    id: "PRD-03",
    name: "AI Response Assistant",
    category: "AI Add-on",
    price: 499000,
    stock: 210,
    status: "In Stock",
  },
  {
    id: "PRD-04",
    name: "Inventory Sync Module",
    category: "Integration",
    price: 799000,
    stock: 58,
    status: "Backorder",
  },
  {
    id: "PRD-05",
    name: "Customer Loyalty Engine",
    category: "CRM",
    price: 599000,
    stock: 145,
    status: "In Stock",
  },
] as const

const invoiceData = [
  {
    id: "INV-2024-091",
    customer: "Rahman Retail Group",
    amount: 18500000,
    dueDate: "2024-07-20",
    status: "Due Soon",
    channel: "WhatsApp",
  },
  {
    id: "INV-2024-092",
    customer: "Lim Logistics",
    amount: 7200000,
    dueDate: "2024-07-05",
    status: "Overdue",
    channel: "Email",
  },
  {
    id: "INV-2024-093",
    customer: "Kopi Nusantara",
    amount: 3450000,
    dueDate: "2024-07-18",
    status: "Paid",
    channel: "WhatsApp",
  },
  {
    id: "INV-2024-094",
    customer: "Santoso Mart",
    amount: 9100000,
    dueDate: "2024-07-30",
    status: "Draft",
    channel: "Dashboard",
  },
  {
    id: "INV-2024-095",
    customer: "Ayu Fashion",
    amount: 2200000,
    dueDate: "2024-06-29",
    status: "Paid",
    channel: "Email",
  },
] as const

const whatsappInbox = [
  {
    id: "WHT-101",
    name: "Rahman Retail Group",
    preview: "Apakah bisa dijadwalkan blast untuk promo minggu depan?",
    timestamp: "2024-07-12T09:45:00+07:00",
    unread: 2,
    channel: "Campaign",
  },
  {
    id: "WHT-102",
    name: "Lim Logistics",
    preview: "Invoice terakhir sudah kami transfer ya.",
    timestamp: "2024-07-11T16:20:00+07:00",
    unread: 0,
    channel: "Finance",
  },
  {
    id: "WHT-103",
    name: "Kopi Nusantara",
    preview: "Butuh update stok gula cair untuk outlet Bandung.",
    timestamp: "2024-07-10T14:05:00+07:00",
    unread: 5,
    channel: "Support",
  },
  {
    id: "WHT-104",
    name: "Santoso Mart",
    preview: "Tolong aktifkan ulang lisensi AI assistant.",
    timestamp: "2024-07-09T18:32:00+07:00",
    unread: 0,
    channel: "Success",
  },
  {
    id: "WHT-105",
    name: "Ayu Fashion",
    preview: "Ada diskon untuk paket WhatsApp blast tambahan?",
    timestamp: "2024-07-08T11:15:00+07:00",
    unread: 1,
    channel: "Sales",
  },
] as const

export async function getDashboardSections() {
  await wait()
  return dashboardSections
}

export async function getCustomers() {
  await wait()
  return customerData
}

export async function getProducts() {
  await wait()
  return productData
}

export async function getInvoices() {
  await wait()
  return invoiceData
}

export async function getWhatsappInbox() {
  await wait()
  return whatsappInbox
}
