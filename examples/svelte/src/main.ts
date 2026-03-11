import App from './App.svelte'

// env is validated at module load time — if any required variable is
// missing or invalid, this throws before Svelte even mounts.
import './env'

const app = new App({ target: document.getElementById('app')! })

export default app
