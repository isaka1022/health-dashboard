import createMiddleware from 'next-intl/middleware'

export default createMiddleware({
  // A list of all locales that are supported
  locales: ['en', 'ja'],
  
  // Used when no locale matches
  defaultLocale: 'ja',
  
  // Never prefix the default locale
  localePrefix: 'as-needed'
})

export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/(ja|en)/:path*', '/((?!_next|_vercel|.*\\..*).*)']
}