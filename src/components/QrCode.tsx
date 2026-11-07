import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export function QrCode({ value, label }: { value: string; label: string }) {
  const [src, setSrc] = useState('')
  const [error, setError] = useState(false)
  useEffect(() => {
    let active = true
    QRCode.toDataURL(value, { width: 260, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#173d30', light: '#fbfdf9' } })
      .then((url) => { if (active) setSrc(url) })
      .catch(() => { if (active) setError(true) })
    return () => { active = false }
  }, [value])
  if (error) return <p role="alert" className="p-6 text-sm text-destructive">Не удалось создать QR. Скопируйте ссылку вручную.</p>
  return src
    ? <img data-testid="qr-code" src={src} alt={`QR-код: ${label}`} className="mx-auto aspect-square w-full max-w-64 rounded-xl" data-qr-value={value} />
    : <div className="mx-auto aspect-square w-full max-w-64 animate-pulse rounded-xl bg-muted" aria-label="Создаём QR-код" />
}
