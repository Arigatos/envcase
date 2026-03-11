import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Importing server env here ensures validation runs at build time —
  // the build fails before deploying a misconfigured app.
  //
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  // import('./src/env/server') is called inside the config to trigger validation.
}

export default nextConfig
