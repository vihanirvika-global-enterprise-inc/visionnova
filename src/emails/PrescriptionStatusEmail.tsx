import { Html, Body, Container, Heading, Text, Hr } from '@react-email/components'

interface Props {
  firstName: string
  status: 'approved' | 'rejected'
}

export function PrescriptionStatusEmail({ firstName, status }: Props) {
  const approved = status === 'approved'

  return (
    <Html>
      <Body style={{ fontFamily: 'sans-serif', color: '#111' }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '32px 0' }}>
          <Heading style={{ fontSize: '24px', marginBottom: '8px' }}>
            {approved ? 'Prescription Approved' : 'Prescription Update'}
          </Heading>
          <Text>Hi {firstName},</Text>
          {approved ? (
            <Text>
              Your prescription has been reviewed and <strong>approved</strong> by
              our optometrist. You can now complete your order.
            </Text>
          ) : (
            <Text>
              Unfortunately your prescription has been <strong>rejected</strong>.
              Please re-upload a clearer copy or contact our support team for help.
            </Text>
          )}
          <Hr />
          <Text style={{ color: '#666', fontSize: '13px' }}>
            Questions? Reply to this email or visit your VisionNova account.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
