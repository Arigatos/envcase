<script setup lang="ts">
import { env } from './env'

function pingApi() {
  fetch(env.API_URL + '/health')
    .then((r) => r.json())
    .then(console.log)
}
</script>

<template>
  <main>
    <h1>{{ env.APP_TITLE }}</h1>

    <section>
      <h2>Environment config</h2>
      <table>
        <tbody>
          <tr>
            <td class="label">API URL</td>
            <td class="value">{{ env.API_URL }}</td>
          </tr>
          <tr>
            <td class="label">Analytics</td>
            <td class="value">{{ env.ENABLE_ANALYTICS ? 'enabled' : 'disabled' }}</td>
          </tr>
          <tr>
            <td class="label">Dark mode</td>
            <td class="value">{{ env.ENABLE_DARK_MODE ? 'enabled' : 'disabled' }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section>
      <h2>Try it</h2>
      <button @click="pingApi">Ping {{ env.API_URL }}/health</button>
      <p class="hint">Check the browser console for the response.</p>
    </section>
  </main>
</template>

<style scoped>
main {
  font-family: system-ui, sans-serif;
  max-width: 600px;
  margin: 2rem auto;
  padding: 0 1rem;
}

table {
  border-collapse: collapse;
  width: 100%;
}

tr {
  border-bottom: 1px solid #eee;
}

.label {
  padding: 0.5rem;
  font-weight: bold;
  width: 40%;
}

.value {
  padding: 0.5rem;
  font-family: monospace;
}

button {
  padding: 0.5rem 1rem;
  cursor: pointer;
}

.hint {
  font-size: 0.875rem;
  color: #666;
}

section {
  margin-top: 2rem;
}
</style>
