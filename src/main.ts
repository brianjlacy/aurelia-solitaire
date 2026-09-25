import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { installErrorHandling } from './utils/errorReporter'
import './assets/styles/main.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
installErrorHandling(app)

// Test hooks are compiled only into E2E builds (`vite build --mode e2e`).
if (import.meta.env.VITE_E2E === 'true') {
  void import('./testing/e2eHooks').then(({ installE2EHooks }) => installE2EHooks(pinia))
}

app.mount('#app')
