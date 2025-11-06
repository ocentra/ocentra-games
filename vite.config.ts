import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import type { Plugin } from 'vite'
import { WebSocketServer } from 'ws'
import type { WebSocket } from 'ws'

// Logging flag - set to true to enable console logging for MCP Bridge
const LOG_MCP_BRIDGE = false

// WebSocket connections from browser tabs
const browserConnections = new Set<WebSocket>()

/**
 * Send command to browser and await result
 */
async function sendToBrowser(
  msg: { type: string; id?: string; params?: unknown },
  timeout = 10000
): Promise<unknown> {
  if (browserConnections.size === 0) {
    throw new Error('No browser connected. Please open the app in a browser tab.')
  }

  // Use the first (and only leader) connection
  const [client] = Array.from(browserConnections)

  return new Promise((resolve, reject) => {
    const id = msg.id || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    msg.id = id

    const listener = (data: Buffer) => {
      try {
        const res = JSON.parse(data.toString())
        if (res.id === id) {
          client.off('message', listener)
          clearTimeout(timeoutId)
          if (res.error) {
            reject(new Error(res.error))
          } else {
            resolve(res.result)
          }
        }
      } catch {
        // Ignore parse errors for other messages
      }
    }

    const timeoutId = setTimeout(() => {
      client.off('message', listener)
      reject(new Error(`Timeout waiting for browser response after ${timeout}ms`))
    }, timeout)

    client.on('message', listener)
    client.send(JSON.stringify(msg))
  })
}


/**
 * MCP Bridge Plugin - WebSocket server for browser communication
 */
function mcpBridgePlugin(): Plugin {
  return {
    name: 'mcp-bridge',
    configureServer(server) {
      // Create WebSocket server
      const wss = new WebSocketServer({ noServer: true })

      // Handle WebSocket upgrade
      server.httpServer?.on('upgrade', (req, socket, head) => {
        if (req.url === '/ws') {
          wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit('connection', ws, req)
          })
        }
      })

      // Handle WebSocket connections
      wss.on('connection', (ws: WebSocket) => {
        if (LOG_MCP_BRIDGE) console.log('[MCP Bridge] Browser connected')
        browserConnections.add(ws)

        // Handle pings (heartbeat)
        ws.on('message', (data: Buffer) => {
          try {
            const msg = JSON.parse(data.toString())
            if (msg.type === 'ping') {
              ws.send(JSON.stringify({ type: 'pong' }))
            }
          } catch {
            // Ignore parse errors
          }
        })

        ws.on('close', () => {
          if (LOG_MCP_BRIDGE) console.log('[MCP Bridge] Browser disconnected')
          browserConnections.delete(ws)
        })

        ws.on('error', () => {
          if (LOG_MCP_BRIDGE) console.error('[MCP Bridge] WebSocket error')
          browserConnections.delete(ws)
        })
      })

      // MCP HTTP endpoint: POST /mcp
      server.middlewares.use('/mcp', async (req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

        if (req.method === 'OPTIONS') {
          res.writeHead(200)
          res.end()
          return
        }

        if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk: Buffer) => {
            body += chunk.toString()
          })

          req.on('end', async () => {
            try {
              const request = JSON.parse(body)

              // MCP JSON-RPC 2.0 format: { jsonrpc: "2.0", id, method, params }
              const { jsonrpc, id, method } = request

              if (jsonrpc !== '2.0') {
                res.writeHead(400, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({
                  jsonrpc: '2.0',
                  id: id || null,
                  error: {
                    code: -32600,
                    message: 'Invalid Request: jsonrpc must be "2.0"',
                  },
                }))
                return
              }

              // Handle MCP methods
              if (method === 'initialize') {
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({
                  jsonrpc: '2.0',
                  id,
                  result: {
                    protocolVersion: '2024-11-05',
                    capabilities: {
                      tools: {},
                    },
                    serverInfo: {
                      name: 'claim-logs',
                      version: '1.0.0',
                    },
                  },
                }))
                return
              }

              if (method === 'notifications/initialized') {
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({
                  jsonrpc: '2.0',
                  id: id || null,
                  result: null,
                }))
                return
              }

              if (method === 'tools/list') {
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({
                  jsonrpc: '2.0',
                  id,
                  result: {
                    tools: [
                      {
                        name: 'hello',
                        description: 'Say hello',
                        inputSchema: { type: 'object', properties: {} },
                      },
                      {
                        name: 'get_errors',
                        description: 'Get error logs (default: last 24h, limit 50). Smart defaults to prevent context spam.',
                        inputSchema: {
                          type: 'object',
                          properties: {
                            since: { type: 'string', description: 'Filter logs since this time (ISO string or relative like "1h", "24h", "7d"). Default: "24h"' },
                            source: { type: 'string', description: 'Filter by source (e.g., Auth, GameEngine)' },
                            context: { type: 'string', description: 'Filter by context/module name (partial match)' },
                            tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags (e.g., ["auth", "critical"])' },
                            limit: { type: 'number', description: 'Maximum number of logs to return. Default: 50' },
                          },
                        },
                      },
                      {
                        name: 'get_recent_logs',
                        description: 'Get recent logs (default: last 1h, limit 50). Smart defaults to prevent context spam.',
                        inputSchema: {
                          type: 'object',
                          properties: {
                            since: { type: 'string', description: 'Filter logs since this time (ISO string or relative like "30m", "1h", "2h"). Default: "1h"' },
                            level: { type: 'string', description: 'Filter by log level (log, error, warn, info, debug)' },
                            source: { type: 'string', description: 'Filter by source (e.g., Auth, GameEngine)' },
                            context: { type: 'string', description: 'Filter by context/module name (partial match)' },
                            tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags (e.g., ["auth", "critical"])' },
                            limit: { type: 'number', description: 'Maximum number of logs to return. Default: 50' },
                          },
                        },
                      },
                      {
                        name: 'get_logs_by_source',
                        description: 'Get logs filtered by source (default: limit 50)',
                        inputSchema: {
                          type: 'object',
                          properties: {
                            source: { type: 'string', description: 'Source to filter by (e.g., Auth, GameEngine, Network). Required.' },
                            level: { type: 'string', description: 'Filter by log level (log, error, warn, info, debug)' },
                            since: { type: 'string', description: 'Filter logs since this time (ISO string or relative like "1h", "24h")' },
                            context: { type: 'string', description: 'Filter by context/module name (partial match)' },
                            tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags (e.g., ["auth", "critical"])' },
                            limit: { type: 'number', description: 'Maximum number of logs to return. Default: 50' },
                          },
                          required: ['source'],
                        },
                      },
                      {
                        name: 'get_logs_by_time_range',
                        description: 'Get logs within a time range (default: limit 50)',
                        inputSchema: {
                          type: 'object',
                          properties: {
                            from: { type: 'string', description: 'Start time (ISO string or relative like "1h", "24h"). Required.' },
                            to: { type: 'string', description: 'End time (ISO string or relative like "30m", "1h"). Default: now' },
                            level: { type: 'string', description: 'Filter by log level (log, error, warn, info, debug)' },
                            source: { type: 'string', description: 'Filter by source (e.g., Auth, GameEngine)' },
                            context: { type: 'string', description: 'Filter by context/module name (partial match)' },
                            tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags (e.g., ["auth", "critical"])' },
                            limit: { type: 'number', description: 'Maximum number of logs to return. Default: 50' },
                          },
                          required: ['from'],
                        },
                      },
                      {
                        name: 'get_logs_by_context',
                        description: 'Get logs filtered by context/module name (default: limit 50)',
                        inputSchema: {
                          type: 'object',
                          properties: {
                            context: { type: 'string', description: 'Context/module name to filter by (partial match). Required.' },
                            level: { type: 'string', description: 'Filter by log level (log, error, warn, info, debug)' },
                            source: { type: 'string', description: 'Filter by source (e.g., Auth, GameEngine)' },
                            since: { type: 'string', description: 'Filter logs since this time (ISO string or relative like "1h", "24h")' },
                            tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags (e.g., ["auth", "critical"])' },
                            limit: { type: 'number', description: 'Maximum number of logs to return. Default: 50' },
                          },
                          required: ['context'],
                        },
                      },
                      {
                        name: 'get_logs_by_tags',
                        description: 'Get logs filtered by tags (default: limit 50)',
                        inputSchema: {
                          type: 'object',
                          properties: {
                            tags: { type: 'array', items: { type: 'string' }, description: 'Tags to filter by (e.g., ["auth", "critical"]). Required.' },
                            level: { type: 'string', description: 'Filter by log level (log, error, warn, info, debug)' },
                            source: { type: 'string', description: 'Filter by source (e.g., Auth, GameEngine)' },
                            context: { type: 'string', description: 'Filter by context/module name (partial match)' },
                            since: { type: 'string', description: 'Filter logs since this time (ISO string or relative like "1h", "24h")' },
                            limit: { type: 'number', description: 'Maximum number of logs to return. Default: 50' },
                          },
                          required: ['tags'],
                        },
                      },
                      {
                        name: 'get_log_stats',
                        description: 'Get statistics about stored logs (counts by level, source, context, etc.)',
                        inputSchema: {
                          type: 'object',
                          properties: {
                            since: { type: 'string', description: 'Filter stats since this time (ISO string or relative like "1h", "24h")' },
                          },
                        },
                      },
                      {
                        name: 'clear_logs',
                        description: 'Clear all logs from IndexedDB',
                        inputSchema: {
                          type: 'object',
                          properties: {},
                        },
                      },
                      {
                        name: 'query_logs',
                        description: 'Query logs with flexible filters (backward compatible, default limit 50)',
                        inputSchema: {
                          type: 'object',
                          properties: {
                            level: { type: 'string', description: 'Filter by log level (log, error, warn, info, debug)' },
                            source: { type: 'string', description: 'Filter by source (e.g., Auth, GameEngine)' },
                            context: { type: 'string', description: 'Filter by context/module name (partial match)' },
                            tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags (e.g., ["auth", "critical"])' },
                            since: { type: 'string', description: 'Filter logs since this time (ISO string or relative like "1h", "30m")' },
                            until: { type: 'string', description: 'Filter logs until this time (ISO string or relative like "1h", "30m")' },
                            limit: { type: 'number', description: 'Maximum number of logs to return. Default: 50' },
                          },
                        },
                      },
                    ],
                  },
                }))
                return
              }

              if (method === 'tools/call') {
                const { name, arguments: args } = request.params || {}

                // Helper function to return log results
                const returnLogResults = (logs: unknown[]) => {
                  res.writeHead(200, { 'Content-Type': 'application/json' })
                  res.end(JSON.stringify({
                    jsonrpc: '2.0',
                    id,
                    result: {
                      content: [
                        {
                          type: 'text',
                          text: JSON.stringify({
                            success: true,
                            count: logs.length,
                            logs,
                          }, null, 2),
                        },
                      ],
                    },
                  }))
                }

                // Helper function to handle errors
                const returnError = (error: unknown) => {
                  res.writeHead(200, { 'Content-Type': 'application/json' })
                  res.end(JSON.stringify({
                    jsonrpc: '2.0',
                    id,
                    result: {
                      content: [
                        {
                          type: 'text',
                          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
                        },
                      ],
                    },
                  }))
                }

                // Handle tool calls
                try {
                  if (name === 'hello') {
                    res.writeHead(200, { 'Content-Type': 'application/json' })
                    res.end(JSON.stringify({
                      jsonrpc: '2.0',
                      id,
                      result: { content: [{ type: 'text', text: 'Hello from MCP!' }] },
                    }))
                    return
                  }

                  // All log queries go through WebSocket to browser
                  let queryParams: {
                    level?: string
                    source?: string
                    context?: string
                    tags?: string[]
                    since?: string
                    until?: string
                    limit?: number
                  } = {}

                  if (name === 'get_errors') {
                    queryParams = {
                      level: 'error',
                      since: args?.since || '24h',
                      source: args?.source,
                      context: args?.context,
                      tags: args?.tags,
                      limit: args?.limit || 50,
                    }
                  } else if (name === 'get_recent_logs') {
                    queryParams = {
                      since: args?.since || '1h',
                      level: args?.level,
                      source: args?.source,
                      context: args?.context,
                      tags: args?.tags,
                      limit: args?.limit || 50,
                    }
                  } else if (name === 'get_logs_by_source') {
                    if (!args?.source) {
                      returnError(new Error('source parameter is required'))
                      return
                    }
                    queryParams = {
                      source: args.source,
                      level: args?.level,
                      since: args?.since,
                      context: args?.context,
                      tags: args?.tags,
                      limit: args?.limit || 50,
                    }
                  } else if (name === 'get_logs_by_time_range') {
                    if (!args?.from) {
                      returnError(new Error('from parameter is required'))
                      return
                    }
                    queryParams = {
                      since: args.from,
                      until: args?.to,
                      level: args?.level,
                      source: args?.source,
                      context: args?.context,
                      tags: args?.tags,
                      limit: args?.limit || 50,
                    }
                  } else if (name === 'get_logs_by_context') {
                    if (!args?.context) {
                      returnError(new Error('context parameter is required'))
                      return
                    }
                    queryParams = {
                      context: args.context,
                      level: args?.level,
                      source: args?.source,
                      since: args?.since,
                      tags: args?.tags,
                      limit: args?.limit || 50,
                    }
                  } else if (name === 'get_logs_by_tags') {
                    if (!args?.tags || !Array.isArray(args.tags) || args.tags.length === 0) {
                      returnError(new Error('tags parameter is required and must be a non-empty array'))
                      return
                    }
                    queryParams = {
                      tags: args.tags,
                      level: args?.level,
                      source: args?.source,
                      context: args?.context,
                      since: args?.since,
                      limit: args?.limit || 50,
                    }
                  } else if (name === 'query_logs') {
                    queryParams = {
                      level: args?.level,
                      source: args?.source,
                      context: args?.context,
                      tags: args?.tags,
                      since: args?.since,
                      until: args?.until,
                      limit: args?.limit || 50,
                    }
                  } else if (name === 'get_log_stats') {
                    // Get stats from browser
                    const stats = await sendToBrowser({
                      type: 'get_log_stats',
                      params: args?.since ? { since: args.since } : {},
                    })
                    res.writeHead(200, { 'Content-Type': 'application/json' })
                    res.end(JSON.stringify({
                      jsonrpc: '2.0',
                      id,
                      result: {
                        content: [
                          {
                            type: 'text',
                            text: JSON.stringify(stats, null, 2),
                          },
                        ],
                      },
                    }))
                    return
                  } else if (name === 'clear_logs') {
                    // Clear logs in browser
                    const result = await sendToBrowser({
                      type: 'clear_logs',
                      params: {},
                    })
                    res.writeHead(200, { 'Content-Type': 'application/json' })
                    res.end(JSON.stringify({
                      jsonrpc: '2.0',
                      id,
                      result: {
                        content: [
                          {
                            type: 'text',
                            text: JSON.stringify({
                              success: true,
                              message: `Cleared logs`,
                              result,
                            }, null, 2),
                          },
                        ],
                      },
                    }))
                    return
                  } else {
                    res.writeHead(400, { 'Content-Type': 'application/json' })
                    res.end(JSON.stringify({
                      jsonrpc: '2.0',
                      id,
                      error: {
                        code: -32602,
                        message: `Unknown tool: ${name}`,
                      },
                    }))
                    return
                  }

                  // Query logs via WebSocket
                  if (Object.keys(queryParams).length > 0) {
                    const logs = await sendToBrowser({
                      type: 'query_logs',
                      params: queryParams,
                    })
                    returnLogResults(logs as unknown[])
                  }
                } catch (error) {
                  returnError(error)
                }
                return
              }

              // Unknown method
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({
                jsonrpc: '2.0',
                id,
                error: {
                  code: -32601,
                  message: `Method not found: ${method}`,
                },
              }))
            } catch (error) {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({
                jsonrpc: '2.0',
                id: null,
                error: {
                  code: -32700,
                  message: error instanceof Error ? error.message : 'Parse error',
                },
              }))
            }
          })
        } else if (req.method === 'GET') {
          // Return MCP manifest/info
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({
            name: 'claim-logs',
            version: '1.0.0',
            description: 'MCP server for Claim app logs (IndexedDB via WebSocket)',
            interfaces: {
              mcp: {
                transport: 'http',
                url: 'http://localhost:3000/mcp',
              },
            },
            tools: [{ name: 'hello', description: 'Say hello' }],
          }))
        } else {
          next()
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    mcpBridgePlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@assets': path.resolve(__dirname, './Assets'),
    },
  },
  optimizeDeps: {
    include: [
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      'zustand',
      'three-stdlib',
      '@huggingface/transformers',
      '@tanstack/react-query',
      // Firebase v12+ uses ESM exports, don't include root package
      // Instead, include specific subpaths if needed
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
    ],
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (id.includes('three')) return 'three'
          if (id.includes('@react-three')) return 'react-three'
          if (id.includes('react') || id.includes('react-dom')) return 'vendor'
          return undefined
        },
      },
    },
  },
  server: {
    host: 'localhost',
    port: parseInt(process.env.PORT || process.env.VITE_PORT || '3000'),
    strictPort: true,
  },
})
