import { Html, Body, Container, Heading, Text, Hr } from '@react-email/components'

interface Props {
  firstName: string
  orderId: string
}

export function OrderShippedEmail({ firstName, orderId }: Props) {
  return (
    <Html>
      <Body style={{ fontFamily: 'sans-serif', color: '#111' }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '32px 0' }}>
          <Heading style={{ fontSize: '24px', marginBottom: '8px' }}>
            Your order is on its way!
          </Heading>
          <Text>Hi {firstName},</Text>
          <Text>
            Great news — order <strong>{orderId}</strong> has been shipped and is
            heading your way.
          </Text>
          <Hr />
          <Text style={{ color: '#666', fontSize: '13px' }}>
            You can track your delivery from your VisionNova account. We&apos;ll
            notify you once it arrives.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
