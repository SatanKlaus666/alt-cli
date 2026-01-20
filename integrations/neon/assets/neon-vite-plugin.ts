import neonPlugin from '@neondatabase/vite-plugin-postgres'

export default function () {
  return neonPlugin({
    seedFile: 'db/init.sql',
    referrer: 'create-tanstack',
    envKey: 'VITE_DATABASE_URL',
  })
}
