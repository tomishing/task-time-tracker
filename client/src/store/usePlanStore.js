import { create } from 'zustand'

const usePlanStore = create((set) => ({
  plans: [],
  setPlans: (plans) => set({ plans }),
  addPlan: (plan) => set((state) => ({ plans: [...state.plans, plan] })),
  removePlan: (id) => set((state) => ({ plans: state.plans.filter(p => p.id !== id) })),
  updatePlan: (id, updates) => set((state) => ({
    plans: state.plans.map(p => p.id === id ? { ...p, ...updates } : p)
  })),
}))

export default usePlanStore
