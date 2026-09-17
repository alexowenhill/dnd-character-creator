import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // A trailing slash is meaningful to the upstream API — the documented create
  // route is `POST /api/characters/` — so don't let Next 308 it away before the
  // proxy in app/api/dnd/[...path] can forward it.
  skipTrailingSlashRedirect: true,
  // The PDF export reads assets/character-sheet-template.pdf at request time.
  // Next's serverless bundler only traces files it can see via require/import,
  // not arbitrary fs.readFile calls, so the template has to be listed
  // explicitly or it silently goes missing from the deployed function.
  outputFileTracingIncludes: {
    '/api/characters/[id]/pdf': ['./assets/character-sheet-template.pdf'],
  },
}

export default nextConfig
