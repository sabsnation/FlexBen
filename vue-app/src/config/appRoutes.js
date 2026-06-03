/** Rota inicial após login e destino da marca no app. */
export const HOME_ROUTE = '/dashboard'

export const LOGIN_ROUTE = '/login'

/** Telas públicas que usuário logado não deve ver. */
export const GUEST_ONLY_PATHS = [LOGIN_ROUTE, '/recuperar-senha']
