import CheckoutForm from '@/components/checkout/CheckoutForm'
import OrderSummary from '@/components/checkout/OrderSummary'

export default function CheckoutPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-dark mb-8">Checkout</h1>
      <div
        data-testid="checkout-layout"
        className="grid grid-cols-1 md:grid-cols-3 gap-8"
      >
        <div className="md:col-span-2">
          <CheckoutForm />
        </div>
        <div className="md:col-span-1">
          <OrderSummary />
        </div>
      </div>
    </main>
  )
}
