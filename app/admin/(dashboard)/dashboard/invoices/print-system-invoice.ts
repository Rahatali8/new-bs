interface SystemInvoiceData {
  invoiceNo: string
  clientName: string
  clientEmail: string
  plan: string
  period: string
  amount: number
  notes?: string
  date: string
}

export function printSystemInvoice(data: SystemInvoiceData) {
  const fmtMoney = (n: number) =>
    n.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${data.invoiceNo}</title>
  <style>
    @page { size: A4 portrait; margin: 18mm 20mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #222; background: #fff; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }

    .header { background: #1a3472; padding: 24px 28px; display: flex; justify-content: space-between; align-items: center; }
    .header-title { color: #fff; font-size: 32px; font-weight: 900; letter-spacing: 2px; }
    .header-inv { color: #a8bcec; font-size: 12px; }
    .header-inv strong { color: #fff; font-size: 14px; display: block; }

    .body { padding: 24px 0 0; }

    .parties { display: flex; justify-content: space-between; margin-bottom: 28px; }
    .party h4 { font-size: 10px; font-weight: 700; color: #1a3472; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
    .party p { font-size: 11px; color: #444; line-height: 1.7; }
    .party p strong { color: #111; font-weight: 700; }

    .divider { border: none; border-top: 2px solid #1a3472; margin: 0 0 20px; }

    table.items { width: 100%; border-collapse: collapse; }
    table.items thead tr { background: #1a3472; }
    table.items thead th { color: #fff; padding: 9px 12px; font-size: 11px; font-weight: 700; text-align: left; }
    table.items thead th.tr { text-align: right; }
    table.items tbody td { padding: 12px 12px; font-size: 11px; border-bottom: 1px solid #e0e0e0; }
    table.items tbody td.tr { text-align: right; font-weight: 600; }

    .totals { margin-top: 0; margin-left: auto; width: 260px; }
    .total-row { display: flex; justify-content: space-between; padding: 5px 12px; font-size: 11px; }
    .total-row.grand { background: #1a3472; color: #fff; font-size: 14px; font-weight: 700; padding: 10px 12px; margin-top: 4px; }

    .notes { margin-top: 24px; padding: 12px; background: #f5f7fb; border-left: 3px solid #1a3472; border-radius: 2px; }
    .notes h5 { font-size: 10px; font-weight: 700; color: #1a3472; text-transform: uppercase; margin-bottom: 4px; }
    .notes p { font-size: 10.5px; color: #555; line-height: 1.6; }

    .footer { margin-top: 32px; text-align: center; font-size: 10px; color: #888; border-top: 1px solid #ddd; padding-top: 12px; }
    .footer strong { color: #1a3472; }
  </style>
</head>
<body>

  <div class="header">
    <div class="header-title">INVOICE</div>
    <div class="header-inv">
      <span>Invoice No</span>
      <strong>${data.invoiceNo}</strong>
    </div>
  </div>

  <div class="body">
    <div class="parties">
      <div class="party">
        <h4>From</h4>
        <p><strong>InvoSync</strong><br>POS &amp; Billing System<br>Invoice &amp; Billing SaaS</p>
      </div>
      <div class="party" style="text-align:right;">
        <h4>Billed To</h4>
        <p>
          <strong>${data.clientName}</strong><br>
          ${data.clientEmail}<br>
          Date: ${data.date}
        </p>
      </div>
    </div>

    <hr class="divider">

    <table class="items" cellpadding="0" cellspacing="0">
      <thead>
        <tr>
          <th style="width:50%;">Description</th>
          <th style="width:25%;">Period</th>
          <th class="tr" style="width:25%;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>${data.plan}</strong><br><span style="color:#777;font-size:10px;">Monthly Subscription – InvoSync POS System</span></td>
          <td>${data.period}</td>
          <td class="tr">PKR ${fmtMoney(data.amount)}</td>
        </tr>
      </tbody>
    </table>

    <div class="totals">
      <div class="total-row">
        <span>Subtotal</span>
        <span>PKR ${fmtMoney(data.amount)}</span>
      </div>
      <div class="total-row">
        <span>Tax</span>
        <span>PKR 0.00</span>
      </div>
      <div class="total-row grand">
        <span>TOTAL</span>
        <span>PKR ${fmtMoney(data.amount)}</span>
      </div>
    </div>

    ${data.notes ? `
    <div class="notes">
      <h5>Notes</h5>
      <p>${data.notes.replace(/\n/g, "<br>")}</p>
    </div>` : ""}

    <div class="footer">
      Thank you for using <strong>InvoSync</strong> — POS &amp; Billing System
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
