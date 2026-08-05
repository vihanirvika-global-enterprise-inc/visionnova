'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'

interface TryOnPreviewProps {
  frameImageUrl: string | null
  productName: string
}

// ST-006 (A6. Static-Photo Try-On). Deliberately client-side only — the
// uploaded photo is read via URL.createObjectURL and never sent to the
// server or persisted anywhere. Two reasons: (1) it avoids creating a new
// biometric/face-photo data-protection surface (DPDP compliance is a stated
// project rule; prescriptions already carry that burden for a real medical
// need, a try-on preview doesn't need to). (2) it's a static overlay, not
// face-aligned AR — there is no face-detection/tracking in this stack, so
// the frame image is simply centered over the photo, not fitted to it.
//
// Reviewed for EP-010 BUG-002 (Risk R-02 — face-geometry capture/storage):
// confirmed no fetch/server action/API route anywhere in this file or its
// callers ever receives the selected File; handleFileChange only ever calls
// URL.createObjectURL (browser-local, never leaves the tab), and handleRemove
// + the unmount cleanup both revoke it. No persistence exists to disable.
export function TryOnPreview({ frameImageUrl, productName }: TryOnPreviewProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl)
    }
  }, [photoUrl])

  if (!frameImageUrl) return null

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoUrl(URL.createObjectURL(file))
  }

  function handleRemove() {
    if (photoUrl) URL.revokeObjectURL(photoUrl)
    setPhotoUrl(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="rounded-xl bg-surface p-4">
      <p className="mb-3 text-sm font-semibold text-dark">Try It On</p>

      {photoUrl ? (
        <div className="flex flex-col gap-3">
          <div className="relative overflow-hidden rounded-xl bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element -- a
                client-generated blob: URL can't go through next/image */}
            <img src={photoUrl} alt="Your photo" className="w-full" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={frameImageUrl}
              alt={`${productName} overlay`}
              className="pointer-events-none absolute left-1/2 top-1/3 w-2/3 -translate-x-1/2 -translate-y-1/2 opacity-90"
            />
          </div>
          <button type="button" onClick={handleRemove} className="btn-secondary self-start text-sm">
            Remove Photo
          </button>
        </div>
      ) : (
        <>
          <label htmlFor="try-on-photo" className="sr-only">
            Upload a photo
          </label>
          <input
            ref={inputRef}
            id="try-on-photo"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="text-sm"
          />
          <p className="mt-2 text-xs text-muted">
            Processed in your browser only — never uploaded or stored.
          </p>
        </>
      )}
    </div>
  )
}
