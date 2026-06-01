import { reactive, computed } from 'vue'
import { ceilingProposalRepository } from './repositories/CeilingProposalApiRepository.js'

const state = reactive({
  proposals: []
})

export const useCeilings = () => {
  const loadProposals = async (params = {}) => {
    const proposals = await ceilingProposalRepository.list(params)
    state.proposals = proposals
    return proposals
  }

  const createProposal = async (payload) => {
    const proposal = await ceilingProposalRepository.create(payload)
    state.proposals = [proposal, ...state.proposals]
    return proposal
  }

  const decideProposal = async (id, payload) => {
    const proposal = await ceilingProposalRepository.decide(id, payload)
    state.proposals = state.proposals.map((p) => (p.id === id ? proposal : p))
    return proposal
  }

  return {
    proposals: computed(() => state.proposals),
    loadProposals,
    createProposal,
    decideProposal
  }
}
