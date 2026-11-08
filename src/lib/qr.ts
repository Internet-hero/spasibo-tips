import { hmac } from '@noble/hashes/hmac.js'
import { md5 } from '@noble/hashes/legacy.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js'
import type { PaymentStatus, QrLink } from '@/types'

const DEMO_SECRET = 'demo-secret-k3'

export type QrPayload = Pick<QrLink, 'merchant_id' | 'employee_id' | 'receipt_id' | 'nonce' | 'exp'>

export function qrPayload(qr: QrPayload) {
  return `${qr.merchant_id}|${qr.employee_id}|${qr.receipt_id}|${qr.nonce}|${qr.exp}`
}

export function signQrPayload(qr: QrPayload) {
  return bytesToHex(hmac(sha256, utf8ToBytes(DEMO_SECRET), utf8ToBytes(qrPayload(qr)))).slice(0, 16)
}

export function verifyQrSignature(qr: QrPayload & { signature: string }) {
  const expected = signQrPayload(qr)
  if (expected.length !== qr.signature.length) return false
  let difference = 0
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ qr.signature.charCodeAt(index)
  }
  return difference === 0
}

export function calcAmounts(baseAmount: number, tipPct: number) {
  const tip = Math.round(baseAmount * tipPct) / 100
  return { tip, total: Math.round((baseAmount + tip) * 100) / 100 }
}

export function gatewayHash(qrId: string, nonce: string) {
  const digest = bytesToHex(md5(utf8ToBytes(`${qrId}${nonce}`)))
  return Number(BigInt(`0x${digest}`) % 10n)
}

export function emulateGateway(qr: QrLink): { status: PaymentStatus; errorCode?: string } {
  if (qr.qr_id === 'qr_001') return { status: 'SUCCESS' }
  if (qr.qr_id === 'qr_003') return { status: 'DECLINED', errorCode: 'CARD_DECLINED' }
  const hash = gatewayHash(qr.qr_id, qr.nonce)
  if (hash <= 7) return { status: 'SUCCESS' }
  if (hash === 8) return { status: 'DECLINED', errorCode: 'CARD_DECLINED' }
  return { status: 'PENDING', errorCode: 'GATEWAY_TIMEOUT' }
}
