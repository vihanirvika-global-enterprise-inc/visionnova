// Run with: npm run db:seed
const postgres = require('postgres')

const products = [
  {
    name: 'Classic Tortoise Frame',
    description: 'Timeless acetate frame with a warm tortoise pattern. Lightweight and durable.',
    price: 89.99,
    category: 'frames',
    sku: 'FR-001',
    stock_quantity: 25,
    image_url: null,
    requires_prescription: false,
  },
  {
    name: 'Slim Metal Frame',
    description: 'Ultra-thin stainless steel frame. Minimalist design for everyday wear.',
    price: 119.99,
    category: 'frames',
    sku: 'FR-002',
    stock_quantity: 18,
    image_url: null,
    requires_prescription: false,
  },
  {
    name: 'Single Vision Lenses',
    description: 'Standard single vision prescription lenses with anti-reflective coating.',
    price: 49.99,
    category: 'lenses',
    sku: 'LN-001',
    stock_quantity: 100,
    image_url: null,
    requires_prescription: true,
  },
  {
    name: 'Progressive Lenses',
    description: 'No-line multifocal lenses with premium anti-glare and scratch-resistant coating.',
    price: 149.99,
    category: 'lenses',
    sku: 'LN-002',
    stock_quantity: 60,
    image_url: null,
    requires_prescription: true,
  },
  {
    name: 'Daily Contact Lenses (30-pack)',
    description: 'Breathable daily disposable contact lenses. Suitable for sensitive eyes.',
    price: 34.99,
    category: 'contacts',
    sku: 'CT-001',
    stock_quantity: 200,
    image_url: null,
    requires_prescription: true,
  },
  {
    name: 'Monthly Contact Lenses (6-pack)',
    description: 'Extended-wear monthly contacts with UV protection.',
    price: 59.99,
    category: 'contacts',
    sku: 'CT-002',
    stock_quantity: 150,
    image_url: null,
    requires_prescription: true,
  },
  {
    name: 'Polarised Aviator Sunglasses',
    description: 'Classic aviator shape with polarised UV400 lenses. Ideal for driving.',
    price: 79.99,
    category: 'sunglasses',
    sku: 'SG-001',
    stock_quantity: 40,
    image_url: null,
    requires_prescription: false,
  },
  {
    name: 'Oversized Square Sunglasses',
    description: 'Bold square frame with gradient tint lenses. 100% UVA/UVB protection.',
    price: 69.99,
    category: 'sunglasses',
    sku: 'SG-002',
    stock_quantity: 35,
    image_url: null,
    requires_prescription: false,
  },
]

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('Error: DATABASE_URL is not set. Copy .env.example to .env.local and fill in the values.')
    process.exit(1)
  }

  const sql = postgres(url)

  console.log(`Seeding ${products.length} products...`)
  let inserted = 0
  let skipped = 0

  for (const p of products) {
    const result = await sql`
      INSERT INTO products (name, description, price, category, sku, stock_quantity, image_url, requires_prescription)
      VALUES (${p.name}, ${p.description}, ${p.price}, ${p.category}, ${p.sku}, ${p.stock_quantity}, ${p.image_url}, ${p.requires_prescription})
      ON CONFLICT (sku) DO NOTHING
      RETURNING id
    `
    if (result.length > 0) {
      console.log(`  + ${p.sku}  ${p.name}`)
      inserted++
    } else {
      console.log(`  ~ ${p.sku}  ${p.name} (already exists, skipped)`)
      skipped++
    }
  }

  console.log(`\nDone. ${inserted} inserted, ${skipped} skipped.`)
  await sql.end()
}

main().catch((err) => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
