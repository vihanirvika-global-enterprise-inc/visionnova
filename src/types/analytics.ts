export type AnalyticsEvent =
  | { event: 'add_to_cart'; productId: number; price: number }
  | { event: 'checkout_started'; total: number; itemCount: number }
  | { event: 'order_completed'; orderId: string; total: number }
  | { event: 'prescription_uploaded'; method: 'file' | 'manual' }
  | { event: 'prescription_approved'; prescriptionId: string }
  | { event: 'prescription_rejected'; reason: string }
