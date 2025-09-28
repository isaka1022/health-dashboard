'use client'

import { Link } from '@/navigation'
import { usePathname } from '@/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

export function Navigation() {
  const pathname = usePathname()
  const t = useTranslations('navigation')
  
  const navigation = [
    { name: t('dashboard'), href: '/dashboard' },
    { name: t('dataSources'), href: '/sources' },
  ]

  return (
    <nav className="flex space-x-8">
      {navigation.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'text-sm font-medium transition-colors hover:text-primary',
            pathname === item.href
              ? 'text-foreground'
              : 'text-muted-foreground'
          )}
        >
          {item.name}
        </Link>
      ))}
    </nav>
  )
}