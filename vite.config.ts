import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

function adminApiPlugin(): Plugin {
  return {
    name: 'admin-api-plugin',
    configureServer(server) {
      server.middlewares.use('/api/admin/delete-user', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Method Not Allowed' }))
          return
        }

        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', async () => {
          try {
            const { uid } = JSON.parse(body || '{}')
            if (!uid) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, error: 'Missing uid' }))
              return
            }

            const configPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json')
            let token = ''
            if (fs.existsSync(configPath)) {
              try {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
                const authModule = require('C:/Users/hp/AppData/Roaming/npm/node_modules/firebase-tools/lib/auth.js')
                const t = await authModule.getAccessToken(config.tokens?.refresh_token, config.tokens?.scopes || [])
                token = t.access_token
              } catch (e) {
                console.warn('[Admin API] Could not retrieve firebase-tools token:', e)
              }
            }

            const projectId = 'campusquestar-app'
            if (token) {
              const deleteRes = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:batchDelete`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  localIds: [uid],
                  force: true,
                }),
              })
              const deleteData = await deleteRes.json()
              console.log(`[Admin API] Deleted user ${uid} from Firebase Auth:`, deleteData)
            } else {
              console.log(`[Admin API] No CLI token available to delete auth user ${uid}`)
            }

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true, uid }))
          } catch (err: any) {
            console.error('[Admin API] Error handling delete-user:', err)
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true, warning: err.message }))
          }
        })
      })
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    adminApiPlugin(),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})

