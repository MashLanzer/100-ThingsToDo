import { create } from "zustand"

interface AppStore {
  showCoupleModal: boolean
  showPhoneModal: boolean
  showFavorsModal: boolean
  showMapModal: boolean
  activePhoneApp: string

  openCoupleModal: () => void
  closeCoupleModal: () => void
  openPhoneModal: (app?: string) => void
  closePhoneModal: () => void
  openFavorsModal: () => void
  closeFavorsModal: () => void
  openMapModal: () => void
  closeMapModal: () => void
  setActivePhoneApp: (app: string) => void
}

export const useAppStore = create<AppStore>((set) => ({
  showCoupleModal: false,
  showPhoneModal: false,
  showFavorsModal: false,
  showMapModal: false,
  activePhoneApp: "home",

  openCoupleModal: () => set({ showCoupleModal: true }),
  closeCoupleModal: () => set({ showCoupleModal: false }),
  openPhoneModal: (app = "home") =>
    set({ showPhoneModal: true, activePhoneApp: app }),
  closePhoneModal: () => set({ showPhoneModal: false, activePhoneApp: "home" }),
  openFavorsModal: () => set({ showFavorsModal: true }),
  closeFavorsModal: () => set({ showFavorsModal: false }),
  openMapModal: () => set({ showMapModal: true }),
  closeMapModal: () => set({ showMapModal: false }),
  setActivePhoneApp: (app) => set({ activePhoneApp: app }),
}))
