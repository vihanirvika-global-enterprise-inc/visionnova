import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { LensBuilder } from './LensBuilder'
import { formatPrice } from '@/lib/formatters'

describe('LensBuilder', () => {
  it('starts at the base price with Single Vision and No Coating selected', () => {
    render(<LensBuilder basePrice={2000} />)

    expect(screen.getByText(formatPrice(2000))).toBeInTheDocument()
    expect(screen.getByLabelText(/lens type/i)).toHaveValue('single-vision')
    expect(screen.getByLabelText(/coating/i)).toHaveValue('none')
  })

  it('recalculates the price when a lens type with a modifier is selected', async () => {
    render(<LensBuilder basePrice={2000} />)

    await userEvent.selectOptions(screen.getByLabelText(/lens type/i), 'progressive')

    expect(screen.getByText(formatPrice(3500))).toBeInTheDocument() // 2000 + 1500
  })

  it('recalculates the price when a coating with a modifier is selected', async () => {
    render(<LensBuilder basePrice={2000} />)

    await userEvent.selectOptions(screen.getByLabelText(/coating/i), 'anti-glare')

    expect(screen.getByText(formatPrice(2300))).toBeInTheDocument() // 2000 + 300
  })

  it('combines lens type and coating modifiers together', async () => {
    render(<LensBuilder basePrice={2000} />)

    await userEvent.selectOptions(screen.getByLabelText(/lens type/i), 'bifocal')
    await userEvent.selectOptions(screen.getByLabelText(/coating/i), 'blue-light')

    expect(screen.getByText(formatPrice(3200))).toBeInTheDocument() // 2000 + 800 + 400
  })

  it('calls onPriceChange with the recalculated total whenever a selection changes', async () => {
    let latestTotal = -1
    render(<LensBuilder basePrice={2000} onPriceChange={(total) => { latestTotal = total }} />)

    await userEvent.selectOptions(screen.getByLabelText(/lens type/i), 'progressive')

    expect(latestTotal).toBe(3500)
  })
})
