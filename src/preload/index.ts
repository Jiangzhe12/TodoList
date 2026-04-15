import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  getStoreData: (): Promise<Record<string, unknown>> => ipcRenderer.invoke('store:get'),
  setStoreData: (data: Record<string, unknown>): Promise<void> =>
    ipcRenderer.invoke('store:set', data),
  minimizeWindow: (): void => ipcRenderer.send('window:minimize'),
  closeWindow: (): void => ipcRenderer.send('window:close'),
  toggleAlwaysOnTop: (): void => ipcRenderer.send('window:toggle-always-on-top'),
  isAlwaysOnTop: (): Promise<boolean> => ipcRenderer.invoke('window:is-always-on-top'),
  onQuickAdd: (callback: () => void): (() => void) => {
    ipcRenderer.on('global:quick-add', callback)
    return () => {
      ipcRenderer.removeListener('global:quick-add', callback)
    }
  },
  onWeeklyReport: (callback: (_event: unknown, report: string) => void): (() => void) => {
    ipcRenderer.on('report:ready', callback)
    return () => {
      ipcRenderer.removeListener('report:ready', callback)
    }
  },
  requestWeeklyReport: (): void => ipcRenderer.send('report:generate')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
