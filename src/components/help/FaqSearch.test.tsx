import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { FaqSearch } from './FaqSearch'
import type { FaqSection } from '@/lib/faq'

const SECTIONS: FaqSection[] = [
  {
    title: 'Ordering',
    items: [{ question: 'Do I need a prescription?', answer: 'Yes, for most frames.' }],
  },
  {
    title: 'Payments',
    items: [{ question: 'What payment methods?', answer: 'We use Razorpay for India.' }],
  },
]

describe('FaqSearch', () => {
  it('renders every section and item when no search is active', () => {
    render(<FaqSearch sections={SECTIONS} />)

    expect(screen.getByText('Ordering')).toBeInTheDocument()
    expect(screen.getByText('Payments')).toBeInTheDocument()
    expect(screen.getByText('Do I need a prescription?')).toBeInTheDocument()
    expect(screen.getByText('What payment methods?')).toBeInTheDocument()
  })

  it('filters to only matching sections and items as the customer types', async () => {
    render(<FaqSearch sections={SECTIONS} />)

    await userEvent.type(screen.getByRole('searchbox', { name: /search/i }), 'razorpay')

    expect(screen.getByText('What payment methods?')).toBeInTheDocument()
    expect(screen.queryByText('Do I need a prescription?')).not.toBeInTheDocument()
    expect(screen.queryByText('Ordering')).not.toBeInTheDocument()
  })

  it('shows a no-results message when nothing matches', async () => {
    render(<FaqSearch sections={SECTIONS} />)

    await userEvent.type(screen.getByRole('searchbox', { name: /search/i }), 'xyzzy')

    expect(screen.getByText(/no results/i)).toBeInTheDocument()
  })

  it('clears the filter when the search is cleared', async () => {
    render(<FaqSearch sections={SECTIONS} />)
    const input = screen.getByRole('searchbox', { name: /search/i })

    await userEvent.type(input, 'razorpay')
    await userEvent.clear(input)

    expect(screen.getByText('Do I need a prescription?')).toBeInTheDocument()
    expect(screen.getByText('What payment methods?')).toBeInTheDocument()
  })
})
