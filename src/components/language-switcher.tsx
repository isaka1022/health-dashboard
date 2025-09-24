'use client'

import { useLocale } from 'next-intl'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const switchToLanguage = (newLocale: string) => {
    // Remove current locale from pathname if it exists
    const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}/, '') || '/'
    
    // Add new locale to path if it's not the default
    const newPath = newLocale === 'ja' ? pathWithoutLocale : `/${newLocale}${pathWithoutLocale}`
    
    router.push(newPath)
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