import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import type { Plugin } from 'vite'
import Database from 'better-sqlite3'

// SQLite database for logs (Node.js can access it)
let logDb: Database.Database | null = null

function initLogDatabase(): Database.Database {
  if (logDb) return logDb
  
  const dbPath = path.join(process.cwd(), 'logs.db')
  logDb = new Database(dbPath)
  
  // Create logs table if it doesn't exist
  logDb.exec(`
    CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY,
      level TEXT NOT NULL,
      context TEXT NOT NULL,
      message TEXT NOT NULL,
      source TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      args TEXT,
      stack TEXT,
      tags TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_timestamp ON logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_level ON logs(level);
    CREATE INDEX IF NOT EXISTS idx_source ON logs(source);
    CREATE INDEX IF NOT EXISTS idx_context ON logs(context);
  `)
  
  // Add tags column if it doesn't exist (for existing databases)
  try {
    logDb.exec(`ALTER TABLE logs ADD COLUMN tags TEXT`)
  } catch {
    // Column already exists, ignore
  }
  
  return logDb
}

// Helper function to build SQL query with filters
function buildLogQuery(filters: {
  level?: string | string[]
  source?: string | string[]
  context?: string
  tags?: string | string[]
  since?: string | number
  until?: string | number
  limit?: number
}): { query: string; params: unknown[] } {
  let query = 'SELECT * FROM logs WHERE 1=1'
  const params: unknown[] = []
  
  // Level filter (supports single or array)
  if (filters.level) {
    if (Array.isArray(filters.level)) {
      query += ` AND level IN (${filters.level.map(() => '?').join(', ')})`
      params.push(...filters.level)
    } else {
      query += ' AND level = ?'
      params.push(filters.level)
    }
  }
  
  // Source filter (supports single or array)
  if (filters.source) {
    if (Array.isArray(filters.source)) {
      query += ` AND source IN (${filters.source.map(() => '?').join(', ')})`
      params.push(...filters.source)
    } else {
      query += ' AND source = ?'
      params.push(filters.source)
    }
  }
  
  // Context filter (partial match)
  if (filters.context) {
    query += ' AND context LIKE ?'
    params.push(`%${filters.context}%`)
  }
  
  // Tags filter (supports single or array, checks if tag exists in JSON array)
  if (filters.tags) {
    if (Array.isArray(filters.tags)) {
      // Check if any of the tags exist in the tags JSON array
      const tagConditions = filters.tags.map(() => {
        return `json_extract(tags, '$') IS NOT NULL AND json_array_length(json_extract(tags, '$')) > 0 AND EXISTS (SELECT 1 FROM json_each(json_extract(tags, '$')) WHERE value = ?)`
      })
      query += ` AND (${tagConditions.join(' OR ')})`
      params.push(...filters.tags)
    } else {
      query += ` AND json_extract(tags, '$') IS NOT NULL AND json_array_length(json_extract(tags, '$')) > 0 AND EXISTS (SELECT 1 FROM json_each(json_extract(tags, '$')) WHERE value = ?)`
      params.push(filters.tags)
    }
  }
  
  // Time range filters
  if (filters.since) {
    let sinceTimestamp: number
    if (typeof filters.since === 'number') {
      sinceTimestamp = filters.since
    } else if (filters.since.match(/^\d+[hdms]$/)) {
      const match = filters.since.match(/^(\d+)([hdms])$/)
      if (match) {
        const value = parseInt(match[1], 10)
        const unit = match[2]
        let ms = 0
        switch (unit) {
          case 's': ms = value * 1000; break
          case 'm': ms = value * 60 * 1000; break
          case 'h': ms = value * 60 * 60 * 1000; break
          case 'd': ms = value * 24 * 60 * 60 * 1000; break
        }
        sinceTimestamp = Date.now() - ms
      } else {
        sinceTimestamp = new Date(filters.since).getTime()
      }
    } else {
      sinceTimestamp = new Date(filters.since).getTime()
    }
    query += ' AND timestamp >= ?'
    params.push(sinceTimestamp)
  }
  
  if (filters.until) {
    let untilTimestamp: number
    if (typeof filters.until === 'number') {
      untilTimestamp = filters.until
    } else {
      untilTimestamp = new Date(filters.until).getTime()
    }
    query += ' AND timestamp <= ?'
    params.push(untilTimestamp)
  }
  
  query += ' ORDER BY timestamp DESC LIMIT ?'
  params.push(filters.limit || 50) // Default limit 50 to prevent spam
  
  return { query, params }
}

// Helper function to execute query and parse results
function executeLogQuery(filters: {
  level?: string | string[]
  source?: string | string[]
  context?: string
  tags?: string | string[]
  since?: string | number
  until?: string | number
  limit?: number
}): Array<{
  id: string
  level: string
  context: string
  message: string
  source: string
  timestamp: number
  args: string | null
  stack: string | null
  tags: string | null
}> {
  const db = initLogDatabase()
  const { query, params } = buildLogQuery(filters)
  const stmt = db.prepare(query)
  return stmt.all(...params) as Array<{
    id: string
    level: string
    context: string
    message: string
    source: string
    timestamp: number
    args: string | null
    stack: string | null
    tags: string | null
  }>
}

// Helper function to format log results
function formatLogResults(rows: Array<{
  id: string
  level: string
  context: string
  message: string
  source: string
  timestamp: number
  args: string | null
  stack: string | null
  tags: string | null
}>): Array<{
  id: string
  level: string
  context: string
  message: string
  source: string
  timestamp: number
  args?: unknown
  stack?: string
  tags?: string[]
}> {
  return rows.map(row => ({
    id: row.id,
    level: row.level,
    context: row.context,
    message: row.message,
    source: row.source,
    timestamp: row.timestamp,
    args: row.args ? JSON.parse(row.args) : undefined,
    stack: row.stack || undefined,
    tags: row.tags ? JSON.parse(row.tags) : undefined,
  }))
}

// Simple API routes for querying logs from SQLite
// App writes logs to SQLite via HTTP POST, routes query SQLite
function logApiPlugin(): Plugin {
  return {
    name: 'log-api',
    configureServer(server) {
      // Initialize SQLite database
      initLogDatabase()
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
                // MCP initialization - required first call
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
                // This is a notification (no response needed), but we should acknowledge it
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
                        description: 'Clear all logs from the database',
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
                
                if (name === 'hello') {
                  res.writeHead(200, { 'Content-Type': 'application/json' })
                  res.end(JSON.stringify({
                    jsonrpc: '2.0',
                    id,
                    result: { content: [{ type: 'text', text: 'Hello from MCP!' }] },
                  }))
                  return
                }
                
                // Helper function to return log results
                const returnLogResults = (logs: Array<{
                  id: string
                  level: string
                  context: string
                  message: string
                  source: string
                  timestamp: number
                  args?: unknown
                  stack?: string
                  tags?: string[]
                }>) => {
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
                
                // get_errors - Get error logs (default: last 24h, limit 50)
                if (name === 'get_errors') {
                  try {
                    const rows = executeLogQuery({
                      level: 'error',
                      since: args?.since || '24h',
                      source: args?.source,
                      context: args?.context,
                      tags: args?.tags,
                      limit: args?.limit || 50,
                    })
                    returnLogResults(formatLogResults(rows))
                  } catch (error) {
                    returnError(error)
                  }
                  return
                }
                
                // get_recent_logs - Get recent logs (default: last 1h, limit 50)
                if (name === 'get_recent_logs') {
                  try {
                    const rows = executeLogQuery({
                      since: args?.since || '1h',
                      level: args?.level,
                      source: args?.source,
                      context: args?.context,
                      tags: args?.tags,
                      limit: args?.limit || 50,
                    })
                    returnLogResults(formatLogResults(rows))
                  } catch (error) {
                    returnError(error)
                  }
                  return
                }
                
                // get_logs_by_source - Get logs filtered by source
                if (name === 'get_logs_by_source') {
                  try {
                    if (!args?.source) {
                      returnError(new Error('source parameter is required'))
                      return
                    }
                    const rows = executeLogQuery({
                      source: args.source,
                      level: args?.level,
                      since: args?.since,
                      context: args?.context,
                      tags: args?.tags,
                      limit: args?.limit || 50,
                    })
                    returnLogResults(formatLogResults(rows))
                  } catch (error) {
                    returnError(error)
                  }
                  return
                }
                
                // get_logs_by_time_range - Get logs within a time range
                if (name === 'get_logs_by_time_range') {
                  try {
                    if (!args?.from) {
                      returnError(new Error('from parameter is required'))
                      return
                    }
                    const rows = executeLogQuery({
                      since: args.from,
                      until: args?.to,
                      level: args?.level,
                      source: args?.source,
                      context: args?.context,
                      tags: args?.tags,
                      limit: args?.limit || 50,
                    })
                    returnLogResults(formatLogResults(rows))
                  } catch (error) {
                    returnError(error)
                  }
                  return
                }
                
                // get_logs_by_context - Get logs filtered by context
                if (name === 'get_logs_by_context') {
                  try {
                    if (!args?.context) {
                      returnError(new Error('context parameter is required'))
                      return
                    }
                    const rows = executeLogQuery({
                      context: args.context,
                      level: args?.level,
                      source: args?.source,
                      since: args?.since,
                      tags: args?.tags,
                      limit: args?.limit || 50,
                    })
                    returnLogResults(formatLogResults(rows))
                  } catch (error) {
                    returnError(error)
                  }
                  return
                }
                
                // get_logs_by_tags - Get logs filtered by tags
                if (name === 'get_logs_by_tags') {
                  try {
                    if (!args?.tags || !Array.isArray(args.tags) || args.tags.length === 0) {
                      returnError(new Error('tags parameter is required and must be a non-empty array'))
                      return
                    }
                    const rows = executeLogQuery({
                      tags: args.tags,
                      level: args?.level,
                      source: args?.source,
                      context: args?.context,
                      since: args?.since,
                      limit: args?.limit || 50,
                    })
                    returnLogResults(formatLogResults(rows))
                  } catch (error) {
                    returnError(error)
                  }
                  return
                }
                
                // get_log_stats - Get statistics about stored logs
                if (name === 'get_log_stats') {
                  try {
                    const db = initLogDatabase()
                    
                    // Build base query
                    let whereClause = 'WHERE 1=1'
                    const params: unknown[] = []
                    
                    if (args?.since) {
                      let sinceTimestamp: number
                      if (typeof args.since === 'string' && args.since.match(/^\d+[hdms]$/)) {
                        const match = args.since.match(/^(\d+)([hdms])$/)
                        if (match) {
                          const value = parseInt(match[1], 10)
                          const unit = match[2]
                          let ms = 0
                          switch (unit) {
                            case 's': ms = value * 1000; break
                            case 'm': ms = value * 60 * 1000; break
                            case 'h': ms = value * 60 * 60 * 1000; break
                            case 'd': ms = value * 24 * 60 * 60 * 1000; break
                          }
                          sinceTimestamp = Date.now() - ms
                        } else {
                          sinceTimestamp = new Date(args.since).getTime()
                        }
                      } else {
                        sinceTimestamp = new Date(args.since as string).getTime()
                      }
                      whereClause += ' AND timestamp >= ?'
                      params.push(sinceTimestamp)
                    }
                    
                    // Get total count
                    const totalCount = db.prepare(`SELECT COUNT(*) as count FROM logs ${whereClause}`).get(...params) as { count: number }
                    
                    // Get counts by level
                    const levelCounts = db.prepare(`
                      SELECT level, COUNT(*) as count 
                      FROM logs ${whereClause}
                      GROUP BY level
                    `).all(...params) as Array<{ level: string; count: number }>
                    
                    // Get counts by source
                    const sourceCounts = db.prepare(`
                      SELECT source, COUNT(*) as count 
                      FROM logs ${whereClause}
                      GROUP BY source
                    `).all(...params) as Array<{ source: string; count: number }>
                    
                    // Get oldest and newest timestamps
                    const timeRange = db.prepare(`
                      SELECT MIN(timestamp) as oldest, MAX(timestamp) as newest 
                      FROM logs ${whereClause}
                    `).get(...params) as { oldest: number | null; newest: number | null }
                    
                    const stats = {
                      total_logs: totalCount.count,
                      by_level: levelCounts.reduce((acc, row) => {
                        acc[row.level] = row.count
                        return acc
                      }, {} as Record<string, number>),
                      by_source: sourceCounts.reduce((acc, row) => {
                        acc[row.source] = row.count
                        return acc
                      }, {} as Record<string, number>),
                      oldest_timestamp: timeRange.oldest,
                      newest_timestamp: timeRange.newest,
                    }
                    
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
                  } catch (error) {
                    returnError(error)
                  }
                  return
                }
                
                // query_logs - Backward compatible flexible query (default limit 50)
                if (name === 'query_logs') {
                  try {
                    const rows = executeLogQuery({
                      level: args?.level,
                      source: args?.source,
                      context: args?.context,
                      tags: args?.tags,
                      since: args?.since,
                      until: args?.until,
                      limit: args?.limit || 50, // Default limit 50 to prevent spam
                    })
                    returnLogResults(formatLogResults(rows))
                  } catch (error) {
                    returnError(error)
                  }
                  return
                }
                
                // clear_logs - Clear all logs from database
                if (name === 'clear_logs') {
                  try {
                    const db = initLogDatabase()
                    const result = db.prepare('DELETE FROM logs').run()
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
                              deleted: result.changes || 0,
                              message: `Cleared ${result.changes || 0} logs`,
                            }, null, 2),
                          },
                        ],
                      },
                    }))
                  } catch (error) {
                    returnError(error)
                  }
                  return
                }
                
                // Unknown tool
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
            description: 'MCP server for Claim app logs',
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
      
      // API route: POST /api/logs/store - Receive logs from browser
      server.middlewares.use('/api/logs/store', async (req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
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
              const logEntry = JSON.parse(body)
              const db = initLogDatabase()
              
              // Generate ID if not provided
              const id = logEntry.id || `${logEntry.timestamp}-${Math.random().toString(36).substr(2, 9)}`
              
              // Insert log into SQLite
              db.prepare(`
                INSERT OR REPLACE INTO logs (id, level, context, message, source, timestamp, args, stack, tags)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).run(
                id,
                logEntry.level,
                logEntry.context,
                logEntry.message,
                logEntry.source,
                logEntry.timestamp,
                logEntry.args ? JSON.stringify(logEntry.args) : null,
                logEntry.stack || null,
                logEntry.tags ? JSON.stringify(logEntry.tags) : null
              )
              
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ success: true }))
            } catch (error) {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to store log',
              }))
            }
          })
          return
        }
        
        next()
      })
      
      // API route: DELETE /api/logs/clear - Clear all logs
      server.middlewares.use('/api/logs/clear', async (req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
        
        if (req.method === 'OPTIONS') {
          res.writeHead(200)
          res.end()
          return
        }
        
        if (req.method === 'DELETE') {
          try {
            const db = initLogDatabase()
            const result = db.prepare('DELETE FROM logs').run()
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true, deleted: result.changes || 0 }))
          } catch (error) {
            console.error('[Log DB] Error clearing logs:', error)
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: false, error: String(error) }))
          }
          return
        }
        next()
      })
      
      // API route: GET /api/logs/query?level=error&source=Auth&limit=100
      server.middlewares.use('/api/logs/query', async (req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
        
        if (req.method === 'OPTIONS') {
          res.writeHead(200)
          res.end()
          return
        }
        
        if (req.method === 'GET') {
          try {
            const db = initLogDatabase()
            const urlObj = new URL(req.url || '', `http://localhost:${process.env.PORT || 3000}`)
            
            // Parse query parameters
            const level = urlObj.searchParams.get('level')
            const source = urlObj.searchParams.get('source')
            const context = urlObj.searchParams.get('context')
            const since = urlObj.searchParams.get('since')
            const limit = parseInt(urlObj.searchParams.get('limit') || '1000', 10)
            
            // Build SQL query
            let query = 'SELECT * FROM logs WHERE 1=1'
            const params: unknown[] = []
            
            if (level) {
              query += ' AND level = ?'
              params.push(level)
            }
            
            if (source) {
              query += ' AND source = ?'
              params.push(source)
            }
            
            if (context) {
              query += ' AND context LIKE ?'
              params.push(`%${context}%`)
            }
            
            if (since) {
              // Parse since (RFC3339 or relative like "1h")
              let sinceTimestamp: number
              if (since.match(/^\d+[hdms]$/)) {
                const match = since.match(/^(\d+)([hdms])$/)
                if (match) {
                  const value = parseInt(match[1], 10)
                  const unit = match[2]
                  let ms = 0
                  switch (unit) {
                    case 's': ms = value * 1000; break
                    case 'm': ms = value * 60 * 1000; break
                    case 'h': ms = value * 60 * 60 * 1000; break
                    case 'd': ms = value * 24 * 60 * 60 * 1000; break
                  }
                  sinceTimestamp = Date.now() - ms
                } else {
                  sinceTimestamp = new Date(since).getTime()
                }
              } else {
                sinceTimestamp = new Date(since).getTime()
              }
              query += ' AND timestamp >= ?'
              params.push(sinceTimestamp)
            }
            
            query += ' ORDER BY timestamp DESC LIMIT ?'
            params.push(limit)
            
            // Execute query
            const stmt = db.prepare(query)
            const rows = stmt.all(...params) as Array<{
              id: string
              level: string
              context: string
              message: string
              source: string
              timestamp: number
              args: string | null
              stack: string | null
            }>
            
            // Parse args JSON
            const logs = rows.map(row => ({
              id: row.id,
              level: row.level,
              context: row.context,
              message: row.message,
              source: row.source,
              timestamp: row.timestamp,
              args: row.args ? JSON.parse(row.args) : undefined,
              stack: row.stack || undefined,
            }))
            
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({
              success: true,
              count: logs.length,
              logs,
            }))
          } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Failed to query logs',
            }))
          }
          return
        }
        
        next()
      })
      
      // API route: GET /api/logs/stats
      // Let browser requests pass through to React Router
      server.middlewares.use('/api/logs/stats', async (req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
        
        if (req.method === 'OPTIONS') {
          res.writeHead(200)
          res.end()
          return
        }
        
        // Let it pass through to React Router (browser-side)
        next()
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
    logApiPlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@assets': path.resolve(__dirname, './Assets'),
    },
  },
  optimizeDeps: {
    include: ['three', '@react-three/fiber', '@react-three/drei'],
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
