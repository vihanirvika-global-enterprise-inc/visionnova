import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Help & FAQ',
  description: 'Answers to common questions about ordering, prescriptions, shipping, returns, and your VisionNova account.',
}

export default function HelpPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-dark">Help &amp; FAQ</h1>
      <p className="text-muted mt-2 mb-10">
        Everything you need to know about ordering prescription eyewear from VisionNova.
      </p>

      {/* Contact banner */}
      <div className="card p-6 bg-surface mb-10 flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="font-semibold text-dark">Still have questions?</p>
          <p className="text-muted text-sm">Email us at support@visionnova.com</p>
        </div>
        <a href="mailto:support@visionnova.com" className="btn-primary">
          Email Support
        </a>
      </div>

      {/* FAQ sections */}
      <div className="space-y-8">

        {/* Section 1 */}
        <section>
          <h2 className="text-base font-semibold text-dark mb-2">
            Ordering &amp; Prescriptions
          </h2>
          <div className="divide-y divide-slate-100 border-t border-slate-100">

            <details className="border-b border-slate-100 py-4">
              <summary className="font-medium text-dark cursor-pointer list-none flex justify-between items-center">
                Do I need a prescription to order?
                <span className="text-primary text-xl">+</span>
              </summary>
              <p className="text-muted text-sm mt-3 leading-relaxed">
                Most of our frames require a valid prescription from a licensed eye care professional.
                Upload it from your account dashboard and wait for one of our optometrists to verify
                it — verification has to be complete before you place an order containing
                prescription eyewear.
              </p>
            </details>

            <details className="border-b border-slate-100 py-4">
              <summary className="font-medium text-dark cursor-pointer list-none flex justify-between items-center">
                How do I upload my prescription?
                <span className="text-primary text-xl">+</span>
              </summary>
              <p className="text-muted text-sm mt-3 leading-relaxed">
                Go to My Account → My Prescriptions and upload a clear photo or PDF. We accept JPG,
                PNG, and PDF files. Do this before you order prescription eyewear, since checkout
                requires a verified prescription already on file.
              </p>
            </details>

            <details className="border-b border-slate-100 py-4">
              <summary className="font-medium text-dark cursor-pointer list-none flex justify-between items-center">
                How long does prescription verification take?
                <span className="text-primary text-xl">+</span>
              </summary>
              <p className="text-muted text-sm mt-3 leading-relaxed">
                Our licensed optometrists review every prescription within 12 hours. You&apos;ll receive
                an email as soon as your prescription is verified.
              </p>
            </details>

            <details className="border-b border-slate-100 py-4">
              <summary className="font-medium text-dark cursor-pointer list-none flex justify-between items-center">
                My prescription was rejected — what do I do?
                <span className="text-primary text-xl">+</span>
              </summary>
              <p className="text-muted text-sm mt-3 leading-relaxed">
                We&apos;ll email you to let you know. The most common causes are an illegible photo or
                an expired prescription — re-upload a clearer copy from your account dashboard, or
                email support@visionnova.com if you&apos;d like to know exactly why it was rejected.
              </p>
            </details>

          </div>
        </section>

        {/* Section 2 */}
        <section>
          <h2 className="text-base font-semibold text-dark mb-2">
            Shipping &amp; Delivery
          </h2>
          <div className="divide-y divide-slate-100 border-t border-slate-100">

            <details className="border-b border-slate-100 py-4">
              <summary className="font-medium text-dark cursor-pointer list-none flex justify-between items-center">
                How long does delivery take?
                <span className="text-primary text-xl">+</span>
              </summary>
              <p className="text-muted text-sm mt-3 leading-relaxed">
                Standard delivery within India takes 5–7 business days after your prescription is
                verified.
              </p>
            </details>

            <details className="border-b border-slate-100 py-4">
              <summary className="font-medium text-dark cursor-pointer list-none flex justify-between items-center">
                Can I track my order?
                <span className="text-primary text-xl">+</span>
              </summary>
              <p className="text-muted text-sm mt-3 leading-relaxed">
                Yes. We email you when your order ships, and you can follow its progress any time
                under My Account → Orders, which shows the carrier and tracking number once your
                order is dispatched.
              </p>
            </details>

          </div>
        </section>

        {/* Section 3 */}
        <section>
          <h2 className="text-base font-semibold text-dark mb-2">
            Returns &amp; Refunds
          </h2>
          <div className="divide-y divide-slate-100 border-t border-slate-100">

            <details className="border-b border-slate-100 py-4">
              <summary className="font-medium text-dark cursor-pointer list-none flex justify-between items-center">
                What is your return policy?
                <span className="text-primary text-xl">+</span>
              </summary>
              <p className="text-muted text-sm mt-3 leading-relaxed">
                30-day returns on non-prescription frames, 14-day returns on prescription glasses.
                Items must be in original condition with original packaging.
              </p>
            </details>

            <details className="border-b border-slate-100 py-4">
              <summary className="font-medium text-dark cursor-pointer list-none flex justify-between items-center">
                How do I start a return?
                <span className="text-primary text-xl">+</span>
              </summary>
              <p className="text-muted text-sm mt-3 leading-relaxed">
                Email us at support@visionnova.com with your order number, within 30 days for
                non-prescription frames or 14 days for prescription glasses. Our team will confirm
                your return and arrange collection with you directly.
              </p>
            </details>

            <details className="border-b border-slate-100 py-4">
              <summary className="font-medium text-dark cursor-pointer list-none flex justify-between items-center">
                When will I receive my refund?
                <span className="text-primary text-xl">+</span>
              </summary>
              <p className="text-muted text-sm mt-3 leading-relaxed">
                Refunds are processed within 5–7 business days of receiving your returned item.
              </p>
            </details>

          </div>
        </section>

        {/* Section 4 */}
        <section>
          <h2 className="text-base font-semibold text-dark mb-2">
            Payments
          </h2>
          <div className="divide-y divide-slate-100 border-t border-slate-100">

            <details className="border-b border-slate-100 py-4">
              <summary className="font-medium text-dark cursor-pointer list-none flex justify-between items-center">
                What payment methods can I use?
                <span className="text-primary text-xl">+</span>
              </summary>
              <p className="text-muted text-sm mt-3 leading-relaxed">
                Orders within India are handled by Razorpay, and prices are charged in rupees. The
                payment options available to you appear in the Razorpay window when you check out.
              </p>
            </details>

            <details className="border-b border-slate-100 py-4">
              <summary className="font-medium text-dark cursor-pointer list-none flex justify-between items-center">
                Is my payment information secure?
                <span className="text-primary text-xl">+</span>
              </summary>
              <p className="text-muted text-sm mt-3 leading-relaxed">
                Card and bank details are entered with our payment provider and never reach
                VisionNova&apos;s servers, so we never store them. We also verify every payment
                directly with the provider using a signed message before marking an order paid —
                an order is never treated as paid on the word of your browser alone.
              </p>
            </details>

            <details className="border-b border-slate-100 py-4">
              <summary className="font-medium text-dark cursor-pointer list-none flex justify-between items-center">
                When am I charged?
                <span className="text-primary text-xl">+</span>
              </summary>
              <p className="text-muted text-sm mt-3 leading-relaxed">
                When you complete payment at checkout. If a payment fails, your order is kept
                unpaid and nothing is taken. Refunds on returned items are processed within
                5–7 business days.
              </p>
            </details>

          </div>
        </section>

        {/* Section 5 */}
        <section>
          <h2 className="text-base font-semibold text-dark mb-2">
            Privacy &amp; Account
          </h2>
          <div className="divide-y divide-slate-100 border-t border-slate-100">

            <details className="border-b border-slate-100 py-4">
              <summary className="font-medium text-dark cursor-pointer list-none flex justify-between items-center">
                Is my prescription data secure?
                <span className="text-primary text-xl">+</span>
              </summary>
              <p className="text-muted text-sm mt-3 leading-relaxed">
                Yes. Your prescription is only accessible to you and our licensed optometrists, and
                every access is logged. We never share your medical information with third parties.
              </p>
            </details>

          </div>
        </section>

      </div>
    </main>
  )
}
