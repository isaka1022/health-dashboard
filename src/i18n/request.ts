import { getRequestConfig } from 'next-intl/server'

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid
  const validLocales = ['en', 'ja']
  const selectedLocale = validLocales.includes(locale) ? locale : 'ja'
  
  return {
    messages: (await import(`../../messages/${selectedLocale}.json`)).default
  }
})