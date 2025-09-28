'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/navigation'
import { Button } from '@/components/ui/button'

export function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const switchToLanguage = (newLocale: 'ja' | 'en') => {
    router.replace(pathname, { locale: newLocale })
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={locale === 'ja' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => switchToLanguage('ja')}
        className="text-xs"
      >
        日本語
      </Button>
      <Button
        variant={locale === 'en' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => switchToLanguage('en')}
        className="text-xs"
      >
        English
      </Button>
    </div>
  )
}