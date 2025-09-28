import { notFound } from 'next/navigation'
import { getRequestConfig } from 'next-intl/server'

export const locales = ['ja']

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming locale parameter is valid
  locale = 'ja'

  return {
    locale: locale as string,
    messages: (await import(`../../messages/${locale}.json`)).default
  }
})