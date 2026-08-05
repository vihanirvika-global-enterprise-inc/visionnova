import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import WriteRxPage from './page'

vi.mock('./actions', () => ({ writePrescriptionAction: vi.fn() }))

import { writePrescriptionAction } from './actions'

beforeEach(() => vi.clearAllMocks())

describe('WriteRxPage', () => {
  it('renders sphere/cylinder/axis/add fields for both eyes plus pupillary distance', () => {
    render(<WriteRxPage params={{ id: 'appt-1' }} />)

    expect(screen.getByText('Right Eye (OD)')).toBeInTheDocument()
    expect(screen.getByText('Left Eye (OS)')).toBeInTheDocument()
    expect(screen.getAllByLabelText(/sphere/i)).toHaveLength(2)
    expect(screen.getAllByLabelText(/cylinder/i)).toHaveLength(2)
    expect(screen.getAllByLabelText(/axis/i)).toHaveLength(2)
    expect(screen.getAllByLabelText(/add/i)).toHaveLength(2)
    expect(screen.getByLabelText(/pupillary distance/i)).toBeInTheDocument()
  })

  it('submits the appointment id from the route params along with entered values', async () => {
    vi.mocked(writePrescriptionAction).mockResolvedValue({})

    render(<WriteRxPage params={{ id: 'appt-42' }} />)
    await userEvent.type(screen.getAllByLabelText(/sphere/i)[0], '-1.50')
    await userEvent.click(screen.getByRole('button', { name: /save prescription/i }))

    await waitFor(() => expect(writePrescriptionAction).toHaveBeenCalled())
    const formData = vi.mocked(writePrescriptionAction).mock.calls[0][0]
    expect(formData.get('appointmentId')).toBe('appt-42')
  })

  it('displays an error returned by the action', async () => {
    vi.mocked(writePrescriptionAction).mockResolvedValue({
      formError: 'Right sphere must be between -20 and 20',
    })

    render(<WriteRxPage params={{ id: 'appt-1' }} />)
    await userEvent.click(screen.getByRole('button', { name: /save prescription/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Right sphere must be between -20 and 20')
    })
  })
})
