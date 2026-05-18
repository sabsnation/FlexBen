import { api, getToken, setToken, clearToken } from '../api.js'

/**
 * Adapter HTTP: isola o transporte (fetch) do domínio da aplicação.
 * Permite trocar por mock ou outro cliente sem alterar repositórios.
 */
export class HttpApiClient {
  get(path) {
    return api.get(path)
  }

  getText(path) {
    return api.getText(path)
  }

  post(path, body) {
    return api.post(path, body)
  }

  patch(path, body) {
    return api.patch(path, body)
  }

  delete(path) {
    return api.delete(path)
  }

  getToken() {
    return getToken()
  }

  setToken(token) {
    setToken(token)
  }

  clearToken() {
    clearToken()
  }
}

export const httpApiClient = new HttpApiClient()
