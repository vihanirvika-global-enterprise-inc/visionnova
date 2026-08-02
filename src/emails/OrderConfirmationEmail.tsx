import { Html, Body, Container, Heading, Text, Hr } from '@react-email/components'
import { formatPrice } from '@/lib/formatters'

interface Props {
  firstName: string
  orderId: string
  totalAmount: number
}

export function OrderConfirmationEmail({ firstName, orderId, totalAmount }: Props) {
  return (
    <Html>
      <Body style={{ fontFamily: 'sans-serif', color: '#111' }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '32px 0' }}>
          <Heading style={{ fontSize: '24px', marginBottom: '8px' }}>
            Order Confirmed
          </Heading>
          <Text>Hi {firstName},</Text>
          <Text>
            Your order <strong>{orderId}</strong> has been confirmed and is being
            prepared.
          </Text>
          <Hr />
          <Text style={{ fontSize: '18px' }}>
            Total: <strong>{formatPrice(totalAmount)}</strong>
          </Text>
          <Hr />
          <Text style={{ color: '#666', fontSize: '13px' }}>
            Thank you for choosing VisionNova. We&apos;ll send you another email
            once your order ships.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
