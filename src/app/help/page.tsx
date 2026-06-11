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
                You can upload your prescription during checkout or from your account dashboard.
                Our optometrists verify every prescription before your glasses are made.
              </p>
            </details>

            <details className="border-b border-slate-100 py-4">
              <summary className="font-medium text-dark cursor-pointer list-none flex justify-between items-center">
                How do I upload my prescription?
                <span className="text-primary text-xl">+</span>
              </summary>
              <p className="text-muted text-sm mt-3 leading-relaxed">
                After placing your order, visit My Account → Prescriptions and upload a clear photo
                or PDF. We accept JPG, PNG, and PDF files up to 10MB.
              </p>
            </details>

            <details className="border-b border-slate-100 py-4">
              <summary className="font-medium text-dark cursor-pointer list-none flex justify-between items-center">
                How long does prescription verification take?
                <span className="text-primary text-xl">+</span>
              </summary>
              <p className="text-muted text-sm mt-3 leading-relaxed">
                Our licensed optometrists review every prescription within 12 hours. You'll receive
                an email as soon as your prescription is verified.
              </p>
            </details>

            <details className="border-b border-slate-100 py-4">
              <summary className="font-medium text-dark cursor-pointer list-none flex justify-between items-center">
                My prescription was rejected — what do I do?
                <span className="text-primary text-xl">+</span>
              </summary>
              <p className="text-muted text-sm mt-3 leading-relaxed">
                We'll email you the exact reason. Common issues are illegible photos or expired
                prescriptions. Simply re-upload a clearer image from your account dashboard.
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
                verified. Express delivery (2–3 days) is available at checkout.
              </p>
            </details>

            <details className="border-b border-slate-100 py-4">
              <summary className="font-medium text-dark cursor-pointer list-none flex justify-between items-center">
                Can I track my order?
                <span className="text-primary text-xl">+</span>
              </summary>
              <p className="text-muted text-sm mt-3 leading-relaxed">
                Yes. Once your order ships, you'll receive a tracking link by email. You can also
                track under My Account → Orders.
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
                Go to My Account → Orders, find your order, and click 'Request Return'. We'll email
                you a prepaid return label within 24 hours.
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
            Privacy &amp; Account
          </h2>
          <div className="divide-y divide-slate-100 border-t border-slate-100">

            <details className="border-b border-slate-100 py-4">
              <summary className="font-medium text-dark cursor-pointer list-none flex justify-between items-center">
                Is my prescription data secure?
                <span className="text-primary text-xl">+</span>
              </summary>
              <p className="text-muted text-sm mt-3 leading-relaxed">
                Yes. Your prescription is stored encrypted and is only accessible to you and our
                licensed optometrists. We never share your medical information with third parties.
              </p>
            </details>

          </div>
        </section>

      </div>
    </main>
  )
}
