export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'payment_failed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

export type ProductCategory = 'frames' | 'lenses' | 'contacts' | 'sunglasses'

export type Region = 'IN' | 'GLOBAL'

export type PrescriptionStatus = 'pending' | 'approved' | 'rejected'

export type ReviewStatus = 'approved' | 'rejected'

export interface ShippingAddress {
  line1: string
  line2?: string
  city: string
  state: string
  postalCode: string
  country: string
}

export type CustomerRole = 'customer' | 'optometrist' | 'ops' | 'admin'

export interface Customer {
  id: string
  email: string
  passwordHash: string
  firstName: string
  lastName: string
  phone: string | null
  role: CustomerRole
  createdAt: Date
  updatedAt: Date
}

export interface Product {
  id: string
  name: string
  description: string | null
  price: number
  category: ProductCategory
  sku: string
  stockQuantity: number
  imageUrl: string | null
  requiresPrescription: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Order {
  id: string
  customerId: string
  status: OrderStatus
  totalAmount: number
  shippingAddress: ShippingAddress
  // Recorded at dispatch. Null until an order actually ships — never inferred
  // from updatedAt, which moves for unrelated reasons.
  carrier: string | null
  trackingNumber: string | null
  shippedAt: Date | null
  deliveredAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface ShipmentDetails {
  carrier?: string
  trackingNumber?: string
}

export interface Prescription {
  id: string
  customerId: string
  fileUrl: string
  status: PrescriptionStatus
  rightSphere: number | null
  rightCylinder: number | null
  rightAxis: number | null
  rightAdd: number | null
  leftSphere: number | null
  leftCylinder: number | null
  leftAxis: number | null
  leftAdd: number | null
  pupillaryDistance: number | null
  expiresAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface OrderItem {
  id: string
  orderId: string
  productId: string
  prescriptionId: string | null
  quantity: number
  unitPrice: number
}

export interface OptometristReview {
  id: string
  prescriptionId: string
  reviewerName: string
  status: ReviewStatus
  notes: string | null
  reviewedAt: Date
  createdAt: Date
}

export type RejectionReason = 'illegible' | 'expired' | 'incomplete' | 'mismatch'

export interface PrescriptionWithCustomer extends Prescription {
  customerName: string
  customerEmail: string
}

export interface PrescriptionReviewLog {
  id: string
  prescriptionId: string
  reviewerId: string
  reviewerName: string
  action: ReviewStatus
  rejectionReason: RejectionReason | null
  note: string | null
  createdAt: Date
}
