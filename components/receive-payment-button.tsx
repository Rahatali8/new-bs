"use client"

import { PartyPaymentDialog } from "@/components/party-payment-dialog"

interface ReceivePaymentButtonProps {
  partyId: string
  partyName: string
  outstandingBalance: number
}

export function ReceivePaymentButton({ partyId, partyName, outstandingBalance }: ReceivePaymentButtonProps) {
  if (outstandingBalance <= 0) return null

  return (
    <PartyPaymentDialog
      partyId={partyId}
      partyName={partyName}
      outstandingBalance={outstandingBalance}
    />
  )
}
