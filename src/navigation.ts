import { createNavigation } from 'next-intl/navigation'

export const locales = ['ja'] as const
export const defaultLocale = 'ja'

export const { Link, redirect, usePathname, useRouter } =
  createNavigation({ locales, localePrefix: 'always' })