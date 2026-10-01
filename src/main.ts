import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { vTip } from './core/tooltip'
import './style.css'

const app = createApp(App)
app.use(createPinia())
app.directive('tip', vTip)
app.mount('#app')
