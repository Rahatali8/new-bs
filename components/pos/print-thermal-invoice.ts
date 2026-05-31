import type { InvoiceForPrint } from "@/lib/types/pos"

function esc(s: string): string {
  const div = typeof document !== "undefined" ? document.createElement("div") : null
  if (!div) return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  div.textContent = s
  return div.innerHTML
}

function fmtNum(n: number): string {
  return n.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr)
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const yyyy = d.getFullYear()
  return `${dd}-${mm}-${yyyy}`
}

export async function printThermalInvoice(data: InvoiceForPrint) {
  const invoiceNumber = data.invoiceNumber || data.id.substring(0, 8).toUpperCase()
  const storeName    = data.store?.name    || ""
  const storeAddress = data.store?.address || ""
  const storePhone   = data.store?.phone   || ""
  const dateStr      = data.date ? fmtDate(data.date) : ""

  const subtotal  = Number(data.subtotal || 0)
  const tax       = Number(data.tax || 0)
  const discount  = Number(data.discount || 0)
  const total     = Number(data.total || 0)
  const totalPaid = data.payments ? data.payments.reduce((s, p) => s + Number(p.amount || 0), 0) : 0
  const remaining = Math.max(0, total - totalPaid)

  let itemRows = ""
  data.items.forEach((item, i) => {
    itemRows += `
      <tr>
        <td class="sn">${i + 1}</td>
        <td class="iname">${esc(item.name)}</td>
        <td class="tc">${item.quantity}</td>
        <td class="tr">${fmtNum(item.unitPrice)}</td>
        <td class="tr fw">${fmtNum(item.lineTotal)}</td>
      </tr>
      <tr class="dash-row"><td colspan="5"><div class="dash"></div></td></tr>`
  })

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt ${esc(invoiceNumber)}</title>
  <style>
    @page { size: 80mm auto; margin: 3mm 2mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Courier New", Courier, monospace;
      font-size: 9.5px;
      color: #000;
      background: #fff;
      width: 76mm;
    }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }

    .center { text-align: center; }
    .bold { font-weight: 700; }
    .store-name { font-size: 14px; font-weight: 700; text-align: center; margin-bottom: 2px; }
    .store-detail { font-size: 9px; text-align: center; line-height: 1.5; color: #333; }

    .dash-line { border: none; border-top: 1px dashed #000; margin: 5px 0; }

    .meta { display: flex; justify-content: space-between; font-size: 9px; margin: 3px 0; }

    /* ── Items table ── */
    .items { width: 100%; border-collapse: collapse; font-size: 9px; }
    .items thead th {
      font-weight: 700;
      padding: 2px 2px;
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
      text-align: left;
    }
    .items thead th.tc { text-align: center; }
    .items thead th.tr { text-align: right; }
    .items td { padding: 3px 2px; vertical-align: top; }
    .sn   { width: 10%; text-align: left; }
    .iname { width: 36%; word-break: break-word; }
    .tc   { text-align: center; width: 10%; }
    .tr   { text-align: right; }
    .fw   { font-weight: 700; }
    .dash-row td { padding: 0 2px; }
    .dash { border-top: 1px dashed #aaa; }

    /* ── Totals ── */
    .totals { width: 100%; font-size: 9.5px; margin-top: 3px; }
    .totals td { padding: 1.5px 2px; }
    .totals .t-label { }
    .totals .t-val { text-align: right; font-weight: 600; }
    .totals .grand td { font-size: 11px; font-weight: 700; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 2px; }

    .thankyou { text-align: center; font-size: 11px; font-weight: 700; margin: 8px 0 4px; }
    .footer-note { text-align: center; font-size: 8.5px; color: #555; line-height: 1.5; }
  </style>
</head>
<body>

  <!-- STORE HEADER -->
  <div class="store-name">${esc(storeName)}</div>
  ${storeAddress ? `<div class="store-detail">${esc(storeAddress)}</div>` : ""}
  ${storePhone   ? `<div class="store-detail">PHONE: ${esc(storePhone)}</div>` : ""}

  <hr class="dash-line">

  <!-- META -->
  <div class="meta">
    <span><strong>Bill No:</strong> ${esc(invoiceNumber)}</span>
    <span><strong>Date:</strong> ${esc(dateStr)}</span>
  </div>
  ${data.party?.name && data.party.name !== "Walk-in Customer"
    ? `<div class="meta"><span><strong>Customer:</strong> ${esc(data.party.name)}</span></div>` : ""}
  ${data.cashier ? `<div class="meta"><span><strong>User:</strong> ${esc(data.cashier)}</span></div>` : ""}

  <hr class="dash-line">

  <!-- ITEMS TABLE -->
  <table class="items" cellpadding="0" cellspacing="0">
    <thead>
      <tr>
        <th class="sn">SN</th>
        <th>Item</th>
        <th class="tc">Qty</th>
        <th class="tr">Price</th>
        <th class="tr">Amt</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <hr class="dash-line">

  <!-- TOTALS -->
  <table class="totals" cellpadding="0" cellspacing="0">
    <tr><td class="t-label">Subtotal (${data.items.length} items)</td><td class="t-val">${fmtNum(subtotal)}</td></tr>
    ${tax > 0      ? `<tr><td class="t-label">Tax</td><td class="t-val">${fmtNum(tax)}</td></tr>` : ""}
    ${discount > 0 ? `<tr><td class="t-label">Discount</td><td class="t-val">-${fmtNum(discount)}</td></tr>` : ""}
    <tr class="grand"><td class="t-label">TOTAL</td><td class="t-val">${fmtNum(total)}</td></tr>
    ${totalPaid > 0 ? `<tr><td class="t-label">Cash Paid</td><td class="t-val">${fmtNum(totalPaid)}</td></tr>` : ""}
    ${remaining > 0 ? `<tr><td class="t-label">Balance Due</td><td class="t-val">${fmtNum(remaining)}</td></tr>` : ""}
  </table>

  <div class="thankyou">Thank You</div>
  <div class="footer-note">
    * Items exchangeable within 7 days with receipt.<br>
    * No return on damaged goods.
  </div>

</body>
</html>`

  const win = window.open("", "_blank")
  if (!win) { console.error("Popup blocked"); return }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print(); win.close() }, 300)
}
