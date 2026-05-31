import type { InvoiceForPrint } from "@/lib/types/pos"

function esc(s: string): string {
  const div = typeof document !== "undefined" ? document.createElement("div") : null
  if (!div) return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  div.textContent = s
  return div.innerHTML
}

function fmtMoney(n: number): string {
  return n.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr)
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

export async function printA4Invoice3(data: InvoiceForPrint) {
  const invoiceNumber = data.invoiceNumber || data.id.substring(0, 8).toUpperCase()
  const storeName    = data.store?.name    || "Your Company"
  const storeAddress = data.store?.address || ""
  const storePhone   = data.store?.phone   || ""
  const storeEmail   = data.store?.email   || ""
  const dateStr      = data.date ? fmtDate(data.date) : ""

  const discount  = Number(data.discount || 0)
  const tax       = Number(data.tax || 0)
  const subtotal  = Number(data.subtotal || 0)
  const total     = Number(data.total || 0)
  const totalPaid = data.payments ? data.payments.reduce((s, p) => s + Number(p.amount || 0), 0) : 0
  const remaining = Math.max(0, total - totalPaid)

  let itemRows = ""
  data.items.forEach((item) => {
    itemRows += `
      <tr>
        <td class="tl">${esc(item.name)}</td>
        <td class="tc">${item.quantity}</td>
        <td class="tr">PKR ${fmtMoney(item.unitPrice)}</td>
        <td class="tr">PKR ${fmtMoney(item.lineTotal)}</td>
      </tr>`
  })

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${esc(invoiceNumber)}</title>
  <style>
    @page { size: A4 portrait; margin: 18mm 20mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #222; background: #fff; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }

    /* ── Top header ── */
    .top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; }
    .company-info { font-size: 10.5px; color: #333; line-height: 1.7; }
    .invoice-title { font-size: 26px; font-weight: 900; color: #111; text-align: right; }

    hr.divider { border: none; border-top: 2px solid #111; margin: 10px 0 14px; }
    hr.divider-thin { border: none; border-top: 1px solid #aaa; margin: 10px 0; }

    /* ── Bill To + Invoice meta ── */
    .meta-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
    .bill-to-label { font-size: 11px; font-weight: 700; margin-bottom: 2px; }
    .bill-to-name { font-size: 11px; font-weight: 700; }
    .bill-to-detail { font-size: 10.5px; color: #444; line-height: 1.6; }

    .inv-meta { text-align: right; }
    .inv-meta table { border-collapse: collapse; margin-left: auto; }
    .inv-meta td { font-size: 11px; padding: 1.5px 0; }
    .inv-meta .key { font-weight: 600; padding-right: 16px; }
    .inv-meta .val { font-weight: 400; color: #444; }

    /* ── Items table ── */
    .items { width: 100%; border-collapse: collapse; margin-bottom: 0; }
    .items thead th {
      background: #fff;
      font-size: 11px;
      font-weight: 700;
      padding: 7px 8px;
      border: 1px solid #555;
      text-align: left;
    }
    .items thead th.tc { text-align: center; }
    .items thead th.tr { text-align: right; }
    .items tbody td {
      padding: 7px 8px;
      font-size: 11px;
      border: 1px solid #aaa;
    }
    .items tfoot td {
      padding: 7px 8px;
      font-size: 11px;
      font-weight: 700;
      border: 1px solid #555;
    }
    .tl { text-align: left; }
    .tc { text-align: center; }
    .tr { text-align: right; }

    /* ── Totals box ── */
    .totals { margin-top: 0; border-collapse: collapse; margin-left: auto; }
    .totals td { padding: 5px 8px; font-size: 11px; border: 1px solid #aaa; }
    .totals .t-label { font-weight: 600; }
    .totals .t-val { text-align: right; min-width: 100px; }
    .totals .grand { font-weight: 700; font-size: 12px; background: #f0f0f0; }
  </style>
</head>
<body>

  <!-- TOP: Company (left) | Invoice title (right) -->
  <div class="top">
    <div class="company-info">
      <strong>${esc(storeName)}</strong><br>
      ${storeAddress ? esc(storeAddress) + "<br>" : ""}
      ${storePhone   ? esc(storePhone) + "<br>" : ""}
      ${storeEmail   ? esc(storeEmail) : ""}
    </div>
    <div class="invoice-title">Sales Invoice</div>
  </div>

  <hr class="divider">

  <!-- BILL TO + INVOICE META -->
  <div class="meta-row">
    <div>
      <div class="bill-to-label">Bill To</div>
      <div class="bill-to-name">${data.party?.name ? esc(data.party.name) : "Walk-in Customer"}</div>
      <div class="bill-to-detail">
        ${data.party?.address ? esc(data.party.address) + "<br>" : ""}
        ${data.party?.phone   ? esc(data.party.phone) : ""}
      </div>
    </div>
    <div class="inv-meta">
      <table>
        <tr><td class="key">Invoice no.</td><td class="val">${esc(invoiceNumber)}</td></tr>
        <tr><td class="key">Date</td><td class="val">${esc(dateStr)}</td></tr>
        <tr><td class="key">Status</td><td class="val">${esc(data.status)}</td></tr>
        ${data.cashier ? `<tr><td class="key">Cashier</td><td class="val">${esc(data.cashier)}</td></tr>` : ""}
      </table>
    </div>
  </div>

  <!-- ITEMS TABLE -->
  <table class="items" cellpadding="0" cellspacing="0">
    <thead>
      <tr>
        <th style="width:50%;">Description</th>
        <th class="tc" style="width:13%;">Quantity</th>
        <th class="tr" style="width:18%;">Unit Price</th>
        <th class="tr" style="width:19%;">Amount</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
    <tfoot>
      <tr>
        <td colspan="3" class="tr">Total</td>
        <td class="tr grand">PKR ${fmtMoney(total)}</td>
      </tr>
    </tfoot>
  </table>

  <!-- TOTALS (right-aligned) -->
  <table class="totals" cellpadding="0" cellspacing="0" style="margin-top:0;">
    ${subtotal !== total || tax > 0 || discount > 0 ? `
    <tr><td class="t-label">Subtotal</td><td class="t-val">PKR ${fmtMoney(subtotal)}</td></tr>
    ${tax > 0 ? `<tr><td class="t-label">Tax</td><td class="t-val">PKR ${fmtMoney(tax)}</td></tr>` : ""}
    ${discount > 0 ? `<tr><td class="t-label">Discount</td><td class="t-val">PKR ${fmtMoney(discount)}</td></tr>` : ""}
    ` : ""}
    <tr><td class="t-label grand">Total</td><td class="t-val grand">PKR ${fmtMoney(total)}</td></tr>
    ${totalPaid > 0 ? `<tr><td class="t-label">Paid</td><td class="t-val">PKR ${fmtMoney(totalPaid)}</td></tr>` : ""}
    ${remaining > 0 ? `<tr><td class="t-label">Remaining</td><td class="t-val">PKR ${fmtMoney(remaining)}</td></tr>` : ""}
  </table>

  <hr class="divider-thin" style="margin-top:20px;">

</body>
</html>`

  const win = window.open("", "_blank")
  if (!win) { console.error("Popup blocked"); return }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print(); win.close() }, 300)
}
