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

export async function printA4Invoice(data: InvoiceForPrint) {
  const invoiceNumber = data.invoiceNumber || data.id.substring(0, 8).toUpperCase()
  const storeName    = data.store?.name    || "Your Company"
  const storeAddress = data.store?.address || ""
  const storePhone   = data.store?.phone   || ""
  const storeEmail   = data.store?.email   || ""
  const dateStr      = data.date ? fmtDate(data.date) : ""

  const discount   = Number(data.discount || 0)
  const tax        = Number(data.tax || 0)
  const subtotal   = Number(data.subtotal || 0)
  const total      = Number(data.total || 0)
  const totalPaid  = data.payments ? data.payments.reduce((s, p) => s + Number(p.amount || 0), 0) : 0
  const remaining  = Math.max(0, total - totalPaid)

  let itemRows = ""
  data.items.forEach((item) => {
    itemRows += `
      <tr class="item-row">
        <td class="item-name">${esc(item.name)}</td>
        <td class="tc">${item.quantity}</td>
        <td class="tr">PKR ${fmtMoney(item.unitPrice)}</td>
        <td class="tr">PKR ${fmtMoney(item.lineTotal)}</td>
      </tr>
      <tr class="item-sep"><td colspan="4"><hr class="item-hr"></td></tr>`
  })

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${esc(invoiceNumber)}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm 18mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      color: #222;
      background: #fff;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }

    /* ── Top header ── */
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; }
    .invoice-title { font-size: 42px; font-weight: 900; color: #1a3472; line-height: 1; margin-bottom: 14px; }
    .company-label { font-size: 11px; font-weight: 700; color: #333; margin-bottom: 4px; text-transform: uppercase; }
    .company-detail { font-size: 10px; color: #555; line-height: 1.6; }

    .billed-section { text-align: left; min-width: 200px; }
    .billed-label { font-size: 11px; font-weight: 700; color: #333; margin-bottom: 4px; text-transform: uppercase; }
    .billed-detail { font-size: 10px; color: #555; line-height: 1.6; }

    /* ── Invoice meta (right side) ── */
    .meta-table { border-collapse: collapse; margin-left: auto; margin-bottom: 24px; min-width: 260px; }
    .meta-table td { font-size: 11px; padding: 3px 6px; }
    .meta-table .meta-key { font-weight: 700; color: #222; padding-right: 12px; }
    .meta-table .meta-colon { color: #222; }
    .meta-table .meta-val { color: #555; }

    /* ── Items table ── */
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 0; }
    .items-table thead tr {
      background-color: #1a3472;
    }
    .items-table thead th {
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      padding: 9px 10px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      border: 1px solid #1a3472;
    }
    .items-table th:first-child { text-align: left; }
    .item-row td { padding: 10px 10px 4px; vertical-align: top; border-left: 1px solid #d0d0d0; border-right: 1px solid #d0d0d0; }
    .item-row td:first-child { border-left: 1px solid #d0d0d0; }
    .item-sep td { padding: 0 10px; border-left: 1px solid #d0d0d0; border-right: 1px solid #d0d0d0; }
    .item-hr { border: none; border-top: 1px solid #ccc; margin: 0; }
    .item-name { font-size: 11px; font-weight: 600; }
    .item-desc { font-size: 10px; color: #777; margin-top: 2px; }
    .tc { text-align: center; }
    .tr { text-align: right; }

    /* Bottom border row after all items */
    .items-end-row td { border-left: 1px solid #d0d0d0; border-right: 1px solid #d0d0d0; border-bottom: 3px solid #1a3472; height: 4px; padding: 0; }

    /* ── Bottom section ── */
    .bottom-section { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 20px; }
    .thank-you { color: #1a3472; font-size: 13px; font-weight: 700; margin-bottom: 6px; }
    .terms-label { font-size: 11px; font-weight: 700; color: #333; margin-bottom: 3px; }
    .terms-text { font-size: 10px; color: #555; line-height: 1.6; max-width: 320px; }

    /* ── Totals box ── */
    .totals { min-width: 240px; }
    .totals-row { display: flex; justify-content: space-between; font-size: 11px; padding: 4px 0; }
    .totals-row .t-label { color: #555; }
    .totals-row .t-val { font-weight: 600; }
    .totals-total {
      background-color: #1a3472;
      color: #fff;
      display: flex;
      justify-content: space-between;
      padding: 7px 10px;
      font-size: 12px;
      font-weight: 700;
      margin-top: 4px;
    }
    .totals-deposit {
      background-color: #8fa8d8;
      color: #fff;
      display: flex;
      justify-content: space-between;
      padding: 7px 10px;
      font-size: 12px;
      font-weight: 700;
      margin-top: 2px;
    }
    .totals-remaining {
      background-color: #e8edf7;
      color: #1a3472;
      display: flex;
      justify-content: space-between;
      padding: 7px 10px;
      font-size: 11px;
      font-weight: 700;
      margin-top: 2px;
    }
  </style>
</head>
<body>

  <!-- HEADER: Left = Invoice title + company | Right = Billed To -->
  <div class="header">
    <div>
      <div class="invoice-title">INVOICE</div>
      <div class="company-label">${esc(storeName)}</div>
      <div class="company-detail">
        ${storeAddress ? esc(storeAddress) + "<br>" : ""}
        ${storePhone   ? "Tel: " + esc(storePhone) + "<br>" : ""}
        ${storeEmail   ? esc(storeEmail) : ""}
      </div>
    </div>
    <div class="billed-section">
      <div class="billed-label">Billed To</div>
      <div class="billed-detail">
        ${data.party?.name    ? "<strong>" + esc(data.party.name)    + "</strong><br>" : "Walk-in Customer<br>"}
        ${data.party?.address ? esc(data.party.address) + "<br>"  : ""}
        ${data.party?.phone   ? "Tel: " + esc(data.party.phone) : ""}
      </div>
    </div>
  </div>

  <!-- INVOICE META: right-aligned -->
  <table class="meta-table" cellpadding="0" cellspacing="0">
    <tr>
      <td class="meta-key">Invoice No</td>
      <td class="meta-colon">:</td>
      <td class="meta-val"><strong>${esc(invoiceNumber)}</strong></td>
    </tr>
    <tr>
      <td class="meta-key">Issue Date</td>
      <td class="meta-colon">:</td>
      <td class="meta-val">${esc(dateStr)}</td>
    </tr>
    <tr>
      <td class="meta-key">Status</td>
      <td class="meta-colon">:</td>
      <td class="meta-val">${esc(data.status)}</td>
    </tr>
    ${data.cashier ? `<tr>
      <td class="meta-key">Cashier</td>
      <td class="meta-colon">:</td>
      <td class="meta-val">${esc(data.cashier)}</td>
    </tr>` : ""}
    ${data.booker?.name ? `<tr>
      <td class="meta-key">Booker</td>
      <td class="meta-colon">:</td>
      <td class="meta-val">${esc(data.booker.name)}</td>
    </tr>` : ""}
  </table>

  <!-- ITEMS TABLE -->
  <table class="items-table" cellpadding="0" cellspacing="0">
    <thead>
      <tr>
        <th style="text-align:left; width:50%;">Items Description</th>
        <th style="text-align:center; width:12%;">Qty</th>
        <th style="text-align:right; width:19%;">Unit Price</th>
        <th style="text-align:right; width:19%;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      <tr class="items-end-row"><td colspan="4"></td></tr>
    </tbody>
  </table>

  <!-- BOTTOM: Thank you + terms | Totals -->
  <div class="bottom-section">
    <div>
      <div class="thank-you">THANK YOU FOR YOUR BUSINESS</div>
      <div class="terms-label">Invoice Terms:</div>
      <div class="terms-text">
        1. Only products can be exchanged within 7 days of sales.<br>
        2. Check your product before leaving counter.<br>
        3. Damaged products — no exchange or return.<br>
        <em>*No exchange or return without sale receipt.</em>
      </div>
    </div>
    <div class="totals">
      <div class="totals-row">
        <span class="t-label">Sub Total</span>
        <span class="t-val">PKR ${fmtMoney(subtotal)}</span>
      </div>
      ${tax > 0 ? `<div class="totals-row">
        <span class="t-label">Tax / VAT</span>
        <span class="t-val">PKR ${fmtMoney(tax)}</span>
      </div>` : ""}
      <div class="totals-row">
        <span class="t-label">Discount</span>
        <span class="t-val">PKR ${fmtMoney(discount)}</span>
      </div>
      <div class="totals-total">
        <span>TOTAL</span>
        <span>PKR ${fmtMoney(total)}</span>
      </div>
      <div class="totals-deposit">
        <span>DEPOSIT</span>
        <span>PKR ${fmtMoney(totalPaid)}</span>
      </div>
      ${remaining > 0 ? `<div class="totals-remaining">
        <span>REMAINING</span>
        <span>PKR ${fmtMoney(remaining)}</span>
      </div>` : ""}
    </div>
  </div>

</body>
</html>`

  const win = window.open("", "_blank")
  if (!win) {
    console.error("Popup blocked — allow popups to print")
    return
  }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => {
    win.print()
    win.close()
  }, 300)
}
