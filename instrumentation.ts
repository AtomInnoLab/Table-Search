export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { fetchNacosConfig } = await import('@/lib/server/nacos')
    await fetchNacosConfig()
  }
}
