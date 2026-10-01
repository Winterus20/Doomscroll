import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { vTip } from './core/tooltip'
import { vHold } from './core/hold'
import './style.css'

const app = createApp(App)
app.use(createPinia())
app.directive('tip', vTip)
app.directive('hold', vHold)
app.mount('#app')
