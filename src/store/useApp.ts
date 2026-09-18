import { useStore } from 'zustand';
import { appStore, type AppState } from './appStore';

/** Subscribe a component to a slice of the app store. */
export function useApp<T>(selector: (state: AppState) => T): T {
  return useStore(appStore, selector);
}
