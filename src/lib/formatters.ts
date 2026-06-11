export function formatAmountForStripe(amountInRupees: number): number {
  return Math.round(amountInRupees * 100)
}

export function formatPrice(amountInRupees: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amountInRupees)
}
