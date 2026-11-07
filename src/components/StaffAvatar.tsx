import type { StaffMember } from '@/types'

export function StaffAvatar({ member, size = 'md', className = '' }: { member: StaffMember; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const sizes = { sm: 'size-10', md: 'size-14', lg: 'size-20', xl: 'size-28' }
  return (
    <img
      src={member.avatar}
      alt={`Фото: ${member.name}, ${member.position}`}
      className={`${sizes[size]} shrink-0 rounded-full border-2 border-card bg-secondary object-cover ${className}`}
      loading="lazy"
    />
  )
}
