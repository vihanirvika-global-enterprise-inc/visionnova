import { Html, Body, Container, Heading, Text, Hr } from '@react-email/components'

interface Props {
  firstName: string
  code: string
}

export function LoginOtpEmail({ firstName, code }: Props) {
  return (
    <Html>
      <Body style={{ fontFamily: 'sans-serif', color: '#111' }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '32px 0' }}>
          <Heading style={{ fontSize: '24px', marginBottom: '8px' }}>
            Your VisionNova verification code
          </Heading>
          <Text>Hi {firstName},</Text>
          <Text>Enter this code to finish signing in. It expires in 5 minutes.</Text>
          <Text style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '8px', margin: '24px 0' }}>
            {code}
          </Text>
          <Text>If you didn&apos;t try to sign in, you can safely ignore this email.</Text>
          <Hr />
          <Text style={{ color: '#666', fontSize: '13px' }}>
            Questions? Reply to this email or visit your VisionNova account.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
