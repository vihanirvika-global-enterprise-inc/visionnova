export interface LensOption {
  id: string
  label: string
  priceModifier: number
}

// ST-005 (A5. PDP): fixed catalog, not DB-backed — no lens-option admin
// screen exists yet, so these are the same kind of static config as
// SORT_OPTIONS in CatalogControls.
export const LENS_TYPES: LensOption[] = [
  { id: 'single-vision', label: 'Single Vision', priceModifier: 0 },
  { id: 'bifocal', label: 'Bifocal', priceModifier: 800 },
  { id: 'progressive', label: 'Progressive', priceModifier: 1500 },
]

export const LENS_COATINGS: LensOption[] = [
  { id: 'none', label: 'No Coating', priceModifier: 0 },
  { id: 'anti-glare', label: 'Anti-Glare', priceModifier: 300 },
  { id: 'blue-light', label: 'Blue Light Filter', priceModifier: 400 },
]
