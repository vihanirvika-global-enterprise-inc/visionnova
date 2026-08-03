'use client'

import { useState, useTransition } from 'react'
import { sendContactEmail } from './actions'

export default function ContactForm() {
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const result = await sendContactEmail(formData)
      if ('success' in result) {
        setSuccess(true)
      } else {
        setError(result.error)
      }
    })
  }

  if (success) {
    return (
      <div className="card p-4 bg-green-50 text-green-700 text-sm font-medium">
        ✓ Message sent! We&apos;ll get back to you within 24 hours.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Honeypot: real visitors never see, tab to, or hear this field — a
          bot filling every input indiscriminately populates it, and
          sendContactEmail drops the submission silently when it does. Not
          visually hidden via CSS alone (some scrapers skip display:none),
          but also aria-hidden and unreachable by keyboard, so it's invisible
          to assistive tech too, not just sighted users. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute h-px w-px overflow-hidden opacity-0"
        style={{ left: '-9999px' }}
      />

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <div>
        <label htmlFor="contact-name" className="mb-1 block text-sm font-medium text-dark">
          Name
        </label>
        <input
          id="contact-name"
          name="name"
          type="text"
          required
          className="input-field"
        />
      </div>

      <div>
        <label htmlFor="contact-email" className="mb-1 block text-sm font-medium text-dark">
          Email
        </label>
        <input
          id="contact-email"
          name="email"
          type="email"
          required
          className="input-field"
        />
      </div>

      <div>
        <label htmlFor="contact-subject" className="mb-1 block text-sm font-medium text-dark">
          Subject
        </label>
        <select id="contact-subject" name="subject" className="input-field">
          <option>Order enquiry</option>
          <option>Prescription question</option>
          <option>Returns &amp; refunds</option>
          <option>Technical issue</option>
          <option>Other</option>
        </select>
      </div>

      <div>
        <label htmlFor="contact-message" className="mb-1 block text-sm font-medium text-dark">
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={5}
          required
          className="input-field"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="btn-primary w-full"
      >
        {isPending ? 'Sending…' : 'Send Message'}
      </button>
    </form>
  )
}
