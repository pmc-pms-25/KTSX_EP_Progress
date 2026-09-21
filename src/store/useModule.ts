import { useStore } from 'zustand';
import type { ModuleState, ModuleStore } from './moduleStore';

/** Subscribe a component to a slice of a module's store. */
export function useModule<T, U>(store: ModuleStore<T>, selector: (state: ModuleState<T>) => U): U {
  return useStore(store, selector);
}
