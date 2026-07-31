'use client'

import { useState, useTransition, useRef } from 'react'
import Link from 'next/link'
import { uploadPrescriptionAction } from './actions'
import { trackEvent } from '@/lib/analytics'

export default function PrescriptionUploadPage() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSelectedFile(e.target.files?.[0] ?? null)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(true)
  }

  function handleDragLeave() {
    setIsDragOver(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && fileInputRef.current) {
      const dt = new DataTransfer()
      dt.items.add(file)
      fileInputRef.current.files = dt.files
      setSelectedFile(file)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const result = await uploadPrescriptionAction(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        trackEvent({ event: 'prescription_uploaded', method: 'file' })
      }
    })
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-dark">Upload Your Prescription</h1>
      <p className="mb-8 mt-2 text-muted">
        Upload a photo, scan, or PDF of your prescription. Our licensed optometrists
        will verify it within 12 hours.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {/* Hidden file input — sr-only label keeps getByLabelText(/prescription/i) working */}
        <label htmlFor="prescription" className="sr-only">Upload Prescription</label>
        <input
          ref={fileInputRef}
          id="prescription"
          type="file"
          name="prescription"
          accept=".pdf,.jpg,.jpeg,.png"
          className="sr-only"
          onChange={handleFileChange}
        />

        {/* ── Section 1: file upload zone ───────────────────── */}
        <div className="card p-8">
          <p className="mb-4 font-semibold text-dark">Upload Prescription File</p>

          {selectedFile ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-green-300 bg-green-50 p-8 text-center">
              <svg aria-hidden="true"
                className="h-10 w-10 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium text-dark">{selectedFile.name}</p>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                className="text-sm text-red-500 transition-colors hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ) : (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
                isDragOver
                  ? 'border-primary bg-slate-50'
                  : 'border-slate-300 hover:border-primary hover:bg-slate-50'
              }`}
            >
              <svg aria-hidden="true"
                className="mx-auto mb-3 h-12 w-12 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <p className="font-medium text-dark">Drag and drop your file here</p>
              <p className="my-2 text-sm text-muted">or</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary text-sm"
              >
                Browse Files
              </button>
              <p className="mt-3 text-xs text-muted">Accepted: JPG, PNG, PDF — max 10MB</p>
            </div>
          )}
        </div>

        {/* ── Section 2: manual entry (collapsible) ─────────── */}
        <div className="card p-6">
          <button
            type="button"
            onClick={() => setManualOpen((o) => !o)}
            className="flex w-full items-center justify-between text-sm text-primary transition-colors hover:text-cyan-800"
          >
            <span>Enter prescription manually instead</span>
            <svg aria-hidden="true"
              className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 ${manualOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {manualOpen && (
            <div className="mt-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="rightSph" className="mb-1 block text-sm font-medium text-dark">
                    Right Eye SPH
                  </label>
                  <input id="rightSph" type="text" name="rightSph" placeholder="e.g. −1.50" className="input-field" />
                </div>
                <div>
                  <label htmlFor="rightCyl" className="mb-1 block text-sm font-medium text-dark">
                    Right Eye CYL
                  </label>
                  <input id="rightCyl" type="text" name="rightCyl" placeholder="e.g. −0.75" className="input-field" />
                </div>
                <div>
                  <label htmlFor="leftSph" className="mb-1 block text-sm font-medium text-dark">
                    Left Eye SPH
                  </label>
                  <input id="leftSph" type="text" name="leftSph" placeholder="e.g. −1.25" className="input-field" />
                </div>
                <div>
                  <label htmlFor="leftCyl" className="mb-1 block text-sm font-medium text-dark">
                    Left Eye CYL
                  </label>
                  <input id="leftCyl" type="text" name="leftCyl" placeholder="e.g. −0.50" className="input-field" />
                </div>
              </div>

              <div className="mt-4">
                <label htmlFor="pd" className="mb-1 block text-sm font-medium text-dark">
                  Pupillary Distance (PD)
                </label>
                <input id="pd" type="text" name="pd" placeholder="e.g. 63" className="input-field" />
              </div>

              <Link href="/help" className="mt-2 inline-block text-xs text-primary hover:text-cyan-800">
                What do these mean?
              </Link>
            </div>
          )}
        </div>

        {/* ── Submit + trust note ───────────────────────────── */}
        <div>
          <button
            type="submit"
            disabled={isPending}
            className="btn-primary w-full py-3 text-lg"
          >
            Upload Prescription
          </button>
          <div className="mt-3 flex items-center justify-center gap-2">
            <svg aria-hidden="true"
              className="h-4 w-4 flex-shrink-0 text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <p className="text-xs text-muted">
              Your prescription is stored securely and never shared.
            </p>
          </div>
        </div>

      </form>
    </main>
  )
}
