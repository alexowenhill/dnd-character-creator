import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // A trailing slash is meaningful to the upstream API — the documented create
  // route is `POST /api/characters/` — so don't let Next 308 it away before the
  // proxy in app/api/dnd/[...path] can forward it.
  skipTrailingSlashRedirect: true,
}

export default nextConfig
