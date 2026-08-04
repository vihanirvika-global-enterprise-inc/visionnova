import { Html, Body, Container, Heading, Text, Hr } from '@react-email/components'

interface ClinicalValues {
  rightSphere: number | null
  rightCylinder: number | null
  rightAxis: number | null
  rightAdd: number | null
  leftSphere: number | null
  leftCylinder: number | null
  leftAxis: number | null
  leftAdd: number | null
  pupillaryDistance: number | null
}

interface Props {
  firstName: string
  status: 'approved' | 'rejected'
  // Whether an uploaded scan exists for this prescription — only meaningful
  // when status is 'approved'.
  hasFile?: boolean
  // Present only for a digitally-authored prescription (ST-023's Rx Writing
  // Tool): there is no separate file, so these values ARE the prescription.
  clinicalValues?: ClinicalValues
}

function formatValue(value: number | null): string {
  return value === null ? '—' : value.toFixed(2)
}

// FTC Eyeglass Rule (16 CFR 456.2): the seller must give the patient a copy
// of their prescription automatically once it's complete — "you can now
// complete your order" was not that on its own. EP-010 BUG-004.
function EyeRow({ label, sphere, cylinder, axis, add }: {
  label: string
  sphere: number | null
  cylinder: number | null
  axis: number | null
  add: number | null
}) {
  return (
    <Text style={{ fontSize: '14px', margin: '4px 0' }}>
      <strong>{label}</strong> — SPH {formatValue(sphere)} · CYL {formatValue(cylinder)} ·
      AXIS {axis ?? '—'} · ADD {formatValue(add)}
    </Text>
  )
}

export function PrescriptionStatusEmail({ firstName, status, hasFile, clinicalValues }: Props) {
  const approved = status === 'approved'
  // Only a digitally-authored Rx (no uploaded file) needs the values inlined
  // — when a file exists, that scan is the prescription of record and the
  // account page is the audited, authenticated way to reach it.
  const showClinicalValues = approved && !hasFile && Boolean(clinicalValues)

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

          {approved && hasFile && (
            <Text>
              Log in to your VisionNova account to view or download your prescription file.
            </Text>
          )}

          {showClinicalValues && clinicalValues && (
            <>
              <Hr />
              <Text style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
                Your prescription
              </Text>
              <EyeRow
                label="OD (right eye)"
                sphere={clinicalValues.rightSphere}
                cylinder={clinicalValues.rightCylinder}
                axis={clinicalValues.rightAxis}
                add={clinicalValues.rightAdd}
              />
              <EyeRow
                label="OS (left eye)"
                sphere={clinicalValues.leftSphere}
                cylinder={clinicalValues.leftCylinder}
                axis={clinicalValues.leftAxis}
                add={clinicalValues.leftAdd}
              />
              <Text
                data-testid="rx-email-pd"
                style={{ fontSize: '14px', margin: '4px 0' }}
              >
                <strong>PD</strong> {formatValue(clinicalValues.pupillaryDistance)}
              </Text>
            </>
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
