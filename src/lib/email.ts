import { Resend } from 'resend'
import { createElement, type ReactElement } from 'react'
import { OrderConfirmationEmail } from '../emails/OrderConfirmationEmail'
import { PrescriptionStatusEmail } from '../emails/PrescriptionStatusEmail'
import { OrderShippedEmail } from '../emails/OrderShippedEmail'

export interface SendEmailOptions {
  to: string
  subject: string
  react: ReactElement
}

export async function sendEmail(options: SendEmailOptions) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  return resend.emails.send({
    from: 'VisionNova <noreply@visionnova.com>',
    to: options.to,
    subject: options.subject,
    react: options.react,
  })
}

export interface OrderShippedEmailOptions {
  to: string
  firstName: string
  orderId: string
}

export async function sendOrderShippedEmail(options: OrderShippedEmailOptions) {
  return sendEmail({
    to: options.to,
    subject: `Your order ${options.orderId} is on its way`,
    react: createElement(OrderShippedEmail, {
      firstName: options.firstName,
      orderId: options.orderId,
    }),
  })
}

export interface PrescriptionStatusEmailOptions {
  to: string
  firstName: string
  status: 'approved' | 'rejected'
}

export async function sendPrescriptionStatusEmail(options: PrescriptionStatusEmailOptions) {
  return sendEmail({
    to: options.to,
    subject: options.status === 'approved'
      ? 'Your prescription has been approved'
      : 'Your prescription has been rejected',
    react: createElement(PrescriptionStatusEmail, {
      firstName: options.firstName,
      status: options.status,
    }),
  })
}

export interface OrderConfirmationEmailOptions {
  to: string
  orderId: string
  firstName: string
  totalAmount: number
}

export async function sendOrderConfirmationEmail(options: OrderConfirmationEmailOptions) {
  return sendEmail({
    to: options.to,
    subject: `Order confirmed: ${options.orderId}`,
    react: createElement(OrderConfirmationEmail, {
      firstName: options.firstName,
      orderId: options.orderId,
      totalAmount: options.totalAmount,
    }),
  })
}
