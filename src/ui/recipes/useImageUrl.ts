import { useEffect, useState } from 'react'

/** Macht aus gespeicherten Bilddaten eine anzeigbare Adresse und gibt sie wieder frei. */
export function useImageUrl(image: { data: ArrayBuffer; mime: string } | undefined | null): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!image) {
      setUrl(null)
      return
    }
    const u = URL.createObjectURL(new Blob([image.data], { type: image.mime }))
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [image])
  return url
}
