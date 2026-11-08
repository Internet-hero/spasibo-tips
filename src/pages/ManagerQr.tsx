import { DashboardShell } from '@/components/DashboardShell'
import { QrGenerator } from '@/components/QrGenerator'

export default function ManagerQr() {
  return <DashboardShell role="manager" title="QR на чек" subtitle="Генерация подписанной одноразовой платёжной ссылки"><QrGenerator /></DashboardShell>
}
