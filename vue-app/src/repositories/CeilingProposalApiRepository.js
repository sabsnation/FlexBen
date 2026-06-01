import { httpApiClient } from '../adapters/HttpApiClient.js'

export class CeilingProposalApiRepository {
  constructor(client = httpApiClient) {
    this.client = client
  }

  async list(params = {}) {
    const qs = new URLSearchParams()
    if (params.status) qs.set('status', params.status)
    if (params.pendingApproval) qs.set('pendingApproval', '1')
    const query = qs.toString() ? `?${qs.toString()}` : ''
    const { proposals } = await this.client.get(`/ceiling-proposals${query}`)
    return proposals
  }

  async create(payload) {
    const { proposal } = await this.client.post('/ceiling-proposals', payload)
    return proposal
  }

  async decide(id, payload) {
    const { proposal } = await this.client.post(`/ceiling-proposals/${id}/decision`, payload)
    return proposal
  }
}

export const ceilingProposalRepository = new CeilingProposalApiRepository()
