'use client'

// Client Component — only clientEnv is safe here.
// Importing serverEnv here would throw at runtime because NEXT_PUBLIC_
// vars are the only ones baked into the client bundle.
import { clientEnv } from '@/env/client'

export default function ClientInfo() {
  return (
    <section style={{ marginTop: '2rem' }}>
      <h2>Client-side config</h2>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <tbody>
          <Row label="APP_URL" value={clientEnv.APP_URL} />
          <Row label="ENABLE_ANALYTICS" value={clientEnv.ENABLE_ANALYTICS ? 'enabled' : 'disabled'} />
        </tbody>
      </table>
      <p style={{ fontSize: '0.8rem', color: '#888' }}>
        Rendered on the client. These values come from NEXT_PUBLIC_* variables.
      </p>
    </section>
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
