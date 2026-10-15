import 'dotenv/config'

function required(name, fallback = undefined) {
  const value = process.env[name] ?? fallback
  if (!value) throw new Error(`Missing environment variable: ${name}`)
  return value
}

export const env = {
  port: Number(process.env.PORT || 5050),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwtSecret: required('JWT_SECRET'),
  databaseUrl: required('DATABASE_URL'),
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
}
