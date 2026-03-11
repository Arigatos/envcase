// Server Component — can safely import serverEnv
import { serverEnv } from '@/env/server'
import { clientEnv } from '@/env/client'
import ClientInfo from '@/components/ClientInfo'

export default function HomePage() {
  // serverEnv is only accessible here on the server — never sent to the browser
  const dbHost = new URL(serverEnv.DATABASE_URL).hostname

  return (
    <main>
      <h1>{clientEnv.APP_TITLE}</h1>

      <section>
        <h2>Server-side config</h2>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <tbody>
            <Row label="NODE_ENV" value={serverEnv.NODE_ENV} />
            {/* Only expose the hostname, never the full DATABASE_URL */}
            <Row label="DB host" value={dbHost} />
          </tbody>
        </table>
        <p style={{ fontSize: '0.8rem', color: '#888' }}>
          Rendered on the server. DATABASE_URL and API_SECRET are never sent to the browser.
        </p>
      </section>

      {/* Client Component handles client-side env */}
      <ClientInfo />
    </main>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr style={{ borderBottom: '1px solid #eee' }}>
      <td style={{ padding: '0.5rem', fontWeight: 'bold', width: '40%' }}>{label}</td>
      <td style={{ padding: '0.5rem', fontFamily: 'monospace' }}>{value}</td>
    </tr>
  )
}
