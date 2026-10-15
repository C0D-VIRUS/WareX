export function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}

export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` })
}

export function errorHandler(error, req, res, next) {
  console.error(error)
  if (res.headersSent) return next(error)
  let status = error.statusCode || 500
  let message = error.message
  if (error.code === 'P2002') { status = 409; message = 'A record with this unique value already exists.' }
  else if (error.code === 'P2025') { status = 404; message = 'The requested record was not found.' }
  else if (error.code === 'P2003') { status = 400; message = 'This change conflicts with a related record.' }
  else if (error.code === 'LIMIT_FILE_SIZE') { status = 413; message = 'Uploaded file exceeds the 5 MB limit.' }
  res.status(status).json({
    message: status >= 500 ? 'Internal server error.' : message,
    ...(process.env.NODE_ENV !== 'production' && status >= 500 ? { detail: error.message } : {}),
  })
}
