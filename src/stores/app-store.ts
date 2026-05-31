import { create } from "zustand"

interface NowPlayingTrack {
  title: string
  artist: string
  emoji: string
  color: string
}

interface AppStore {
  showCoupleModal: boolean
  showPhoneModal: boolean
  showFavorsModal: boolean
  showMapModal: boolean
  showSettingsModal: boolean
  activePhoneApp: string
  coupleName: string
  nowPlayingTrack: NowPlayingTrack | null
  musicIsPlaying: boolean

  openCoupleModal: () => void
  closeCoupleModal: () => void
  openPhoneModal: (app?: string) => void
  closePhoneModal: () => void
  openFavorsModal: () => void
  closeFavorsModal: () => void
  openMapModal: () => void
  closeMapModal: () => void
  openSettingsModal: () => void
  closeSettingsModal: () => void
  setActivePhoneApp: (app: string) => void
  setCoupleName: (name: string) => void
  setNowPlayingTrack: (track: NowPlayingTrack | null) => void
  setMusicIsPlaying: (v: boolean) => void
}

export const useAppStore = create<AppStore>((set) => ({
  showCoupleModal: false,
  showPhoneModal: false,
  showFavorsModal: false,
  showMapModal: false,
  showSettingsModal: false,
  activePhoneApp: "home",
  coupleName: "ThingsToDo",
  nowPlayingTrack: null,
  musicIsPlaying: false,

  openCoupleModal: () => set({ showCoupleModal: true }),
  closeCoupleModal: () => set({ showCoupleModal: false }),
  openPhoneModal: (app = "home") =>
    set({ showPhoneModal: true, activePhoneApp: app }),
  closePhoneModal: () => set({ showPhoneModal: false, activePhoneApp: "home" }),
  openFavorsModal: () => set({ showFavorsModal: true }),
  closeFavorsModal: () => set({ showFavorsModal: false }),
  openMapModal: () => set({ showMapModal: true }),
  closeMapModal: () => set({ showMapModal: false }),
  openSettingsModal: () => set({ showSettingsModal: true }),
  closeSettingsModal: () => set({ showSettingsModal: false }),
  setActivePhoneApp: (app) => set({ activePhoneApp: app }),
  setCoupleName: (name) => set({ coupleName: name }),
  setNowPlayingTrack: (track) => set({ nowPlayingTrack: track }),
  setMusicIsPlaying: (v) => set({ musicIsPlaying: v }),
}))
