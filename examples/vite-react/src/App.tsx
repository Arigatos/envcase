import { env } from './env.js'

export default function App() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 600, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>{env.APP_TITLE}</h1>

      <section>
        <h2>Environment config</h2>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <tbody>
            <Row label="API URL" value={env.API_URL} />
            <Row label="Analytics" value={env.ENABLE_ANALYTICS ? 'enabled' : 'disabled'} />
            <Row label="Dark mode" value={env.ENABLE_DARK_MODE ? 'enabled' : 'disabled'} />
          </tbody>
        </table>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>Try it</h2>
        <button
          onClick={() => fetch(env.API_URL + '/health').then(r => r.json()).then(console.log)}
          style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}
        >
          Ping {env.API_URL}/health
        </button>
        <p style={{ fontSize: '0.875rem', color: '#666' }}>
          Check the browser console for the response.
        </p>
      </section>
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
