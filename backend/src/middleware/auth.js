import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'flexben-dev-secret'

export function authRequired(req, res, next) {
  const raw = req.headers.authorization || ''
  const token = raw.startsWith('Bearer ') ? raw.slice(7) : ''
  if (!token) return res.status(401).json({ message: 'Token ausente.' })
  try {
    req.auth = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ message: 'Token inválido ou expirado.' })
  }
}

export function adminRequired(req, res, next) {
  if (req.auth?.role !== 'administrador') {
    return res.status(403).json({ message: 'Acesso restrito ao administrador.' })
  }
  next()
}

export function roleRequired(allowedRoles = []) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.auth?.role)) {
      return res.status(403).json({ message: 'Acesso negado para o perfil informado.' })
    }
    next()
  }
}
