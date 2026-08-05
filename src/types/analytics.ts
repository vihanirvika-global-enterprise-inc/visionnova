// Commerce events only. Prescription events were removed rather than
// consent-gated: they are health data, and the DPDP Act requires strict
// necessity for a stated purpose before sensitive personal data is processed
// — product analytics is not such a purpose, and neither PostHog nor GA4 is
// contracted for health-data processing. Upload, approval and rejection
// counts are all derivable from the prescriptions table, which this
// application owns, so nothing is lost but the third-party transfer.
export type AnalyticsEvent =
  | { event: 'add_to_cart'; productId: number; price: number }
  | { event: 'checkout_started'; total: number; itemCount: number }
  | { event: 'order_completed'; orderId: string; total: number }
