import type { Employee } from '@/types'

export function StaffAvatar({ member, size = 'md', className = '' }: { member: Employee; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const sizes = { sm: 'size-10', md: 'size-14', lg: 'size-20', xl: 'size-28' }
  const classes = `${sizes[size]} shrink-0 rounded-full border-2 border-card bg-secondary object-cover ${className}`
  if (!member.avatar) return <span className={`${classes} grid place-items-center font-extrabold text-primary`} aria-label={`Сотрудник ${member.name}`}>{member.name.slice(0, 1)}</span>
  return <img src={member.avatar} alt={`Фото: ${member.name}, ${member.position ?? 'официант'}`} className={classes} loading="lazy" />
}
