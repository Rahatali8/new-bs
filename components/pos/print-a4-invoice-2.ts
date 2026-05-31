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
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"]
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

export async function printA4Invoice2(data: InvoiceForPrint) {
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
  const payMethod = data.payments && data.payments.length > 0
    ? [...new Set(data.payments.map((p) => p.method))].join(" / ")
    : "Cash"

  let itemRows = ""
  data.items.forEach((item) => {
    itemRows += `
      <tr>
        <td class="tl item-name">${esc(item.name)}</td>
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
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #222; background: #fff; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }

    .page { padding: 0 0 20mm; }

    /* ── Blue wave header ── */
    .header-wrap {
      background: #0d2260;
      padding: 18px 28px 36px;
      position: relative;
      overflow: hidden;
      margin-bottom: 0;
    }
    .header-wave {
      position: absolute;
      bottom: -1px; left: 0; right: 0;
      height: 28px;
      background: #fff;
      border-radius: 60% 60% 0 0 / 100% 100% 0 0;
    }
    .header-inner { display: flex; justify-content: space-between; align-items: center; }
    .header-title { color: #fff; font-size: 36px; font-weight: 900; letter-spacing: 2px; }
    .header-invno { color: #fff; font-size: 13px; font-weight: 700; }

    /* ── Body padding ── */
    .body { padding: 10px 28px 0; }

    /* ── Bill To / From ── */
    .parties { display: flex; justify-content: space-between; margin-bottom: 16px; margin-top: 4px; }
    .party-block { min-width: 200px; }
    .party-label { font-size: 13px; font-weight: 700; color: #0d2260; margin-bottom: 4px; }
    .party-detail { font-size: 10.5px; color: #444; line-height: 1.7; }

    .date-line { font-size: 11px; margin-bottom: 16px; color: #333; }
    .date-line strong { font-weight: 700; }

    /* ── Items table ── */
    .items { width: 100%; border-collapse: collapse; }
    .items thead tr { background: #0d2260; }
    .items thead th { color: #fff; font-size: 11px; font-weight: 700; padding: 8px 10px; text-align: center; }
    .items thead th:first-child { text-align: left; }
    .items tbody tr { border-bottom: 1px solid #e0e0e0; }
    .items tbody td { padding: 8px 10px; font-size: 11px; }
    .items tfoot tr { background: #0d2260; }
    .items tfoot td { color: #fff; font-size: 12px; font-weight: 700; padding: 8px 10px; text-align: right; }
    .tl { text-align: left; }
    .tc { text-align: center; }
    .tr { text-align: right; }
    .item-name { font-weight: 600; }

    /* ── Bottom ── */
    .bottom { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 20px; padding: 0 28px; }
    .note-section { max-width: 300px; }
    .note-label { font-size: 11px; font-weight: 700; margin-bottom: 6px; }
    .note-line { border-bottom: 1px solid #bbb; margin-bottom: 8px; height: 20px; width: 200px; }
    .pay-info { margin-top: 14px; }
    .pay-label { font-size: 11px; font-weight: 700; margin-bottom: 4px; }
    .pay-row { font-size: 10.5px; color: #444; line-height: 1.8; }
    .pay-row strong { font-weight: 700; color: #222; }

    .thankyou { font-size: 28px; font-weight: 900; color: #0d2260; font-style: italic; }
  </style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header-wrap">
    <div class="header-inner">
      <div class="header-title">INVOICE</div>
      <div class="header-invno">NO: ${esc(invoiceNumber)}</div>
    </div>
    <div class="header-wave"></div>
  </div>

  <div class="body">

    <!-- PARTIES -->
    <div class="parties">
      <div class="party-block">
        <div class="party-label">Bill To:</div>
        <div class="party-detail">
          <strong>${data.party?.name ? esc(data.party.name) : "Walk-in Customer"}</strong><br>
          ${data.party?.phone   ? esc(data.party.phone) + "<br>" : ""}
          ${data.party?.address ? esc(data.party.address) : ""}
        </div>
      </div>
      <div class="party-block" style="text-align:right;">
        <div class="party-label">From:</div>
        <div class="party-detail">
          <strong>${esc(storeName)}</strong><br>
          ${storePhone   ? esc(storePhone) + "<br>" : ""}
          ${storeAddress ? esc(storeAddress) + "<br>" : ""}
          ${storeEmail   ? esc(storeEmail) : ""}
        </div>
      </div>
    </div>

    <!-- DATE -->
    <div class="date-line"><strong>Date:</strong> ${esc(dateStr)}</div>

    <!-- ITEMS TABLE -->
    <table class="items" cellpadding="0" cellspacing="0">
      <thead>
        <tr>
          <th style="text-align:left; width:50%;">Description</th>
          <th style="width:12%;">Qty</th>
          <th style="width:19%;">Price</th>
          <th style="width:19%;">Total</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="text-align:right; font-size:12px; font-weight:700;">Sub Total</td>
          <td style="text-align:right;">PKR ${fmtMoney(total)}</td>
        </tr>
      </tfoot>
    </table>

  </div><!-- /body -->

  <!-- BOTTOM: Note + Pay info (left) | Thank You (right) -->
  <div class="bottom">
    <div class="note-section">
      <div class="note-label">Note:</div>
      <div class="note-line"></div>
      <div class="note-line"></div>
      <div class="pay-info">
        <div class="pay-label">Payment Information:</div>
        <div class="pay-row"><strong>Method:</strong> ${esc(payMethod)}</div>
        ${storePhone ? `<div class="pay-row"><strong>Phone:</strong> ${esc(storePhone)}</div>` : ""}
        ${storeEmail ? `<div class="pay-row"><strong>Email:</strong> ${esc(storeEmail)}</div>` : ""}
      </div>
    </div>
    <div class="thankyou">Thank You!</div>
  </div>

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
