type Meta = Record<string, unknown>

function log(level: 'info' | 'warn' | 'error', message: string, meta?: Meta) {
  const ts = new Date().toISOString()
  const metaStr = meta ? ' ' + JSON.stringify(meta) : ''
  console[level](`[ZeroAudit][${ts}] ${message}${metaStr}`)
}

export const logger = {
  info:  (msg: string, meta?: Meta) => log('info',  msg, meta),
  warn:  (msg: string, meta?: Meta) => log('warn',  msg, meta),
  error: (msg: string, meta?: Meta) => log('error', msg, meta),
}
