export function makeBusinessId(prefix) {
  const stamp = Date.now().toString().slice(-8)
  const random = Math.floor(Math.random() * 90 + 10)
  return `${prefix}-${stamp}${random}`
}
