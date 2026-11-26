import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

// Dev only: the bake export (?export) posts the static scene here, into bake/in/.
function bakeSave() {
  return {
    name: 'bake-save',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__bake/save', (req, res) => {
        const name = new URL(req.url, 'http://x').searchParams.get('name') || ''
        if (req.method !== 'POST' || !/^[a-z0-9._-]{1,60}$/.test(name)) {
          res.statusCode = 400
          return res.end('bad request')
        }
        const dir = path.resolve('bake/in')
        fs.mkdirSync(dir, { recursive: true })
        const chunks = []
        req.on('data', (c) => chunks.push(c))
        req.on('end', () => {
          fs.writeFileSync(path.join(dir, name), Buffer.concat(chunks))
          res.end('ok')
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), bakeSave()],
  base: './', // served from kishu.studio/Khushi.office/
  build: { chunkSizeWarningLimit: 1500 },
})
