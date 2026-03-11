import { createApp } from 'vue'
import App from './App.vue'

// env is validated at module load time — if any required variable is
// missing or invalid, this throws before Vue even mounts.
import './env'

createApp(App).mount('#app')
