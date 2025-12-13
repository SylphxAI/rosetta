'use client';

/**
 * React context for translation admin
 */

import {
	type JSX,
	type ReactNode,
	createContext,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { type AdminStore, createAdminStore } from '../core/store';
import type { AdminAPIClient } from '../core/types';

interface AdminContextValue {
	store: AdminStore;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export interface TranslationAdminProviderProps {
	children: ReactNode;
	/**
	 * API client for fetching/saving translations
	 */
	client: AdminAPIClient;
}

/**
 * Provider for translation admin hooks
 */
export function TranslationAdminProvider({
	children,
	client,
}: TranslationAdminProviderProps): JSX.Element {
	const store = useMemo(() => createAdminStore(client), [client]);

	// Fetch data on mount
	useEffect(() => {
		store.fetchData().catch(console.error);
	}, [store]);

	return <AdminContext.Provider value={{ store }}>{children}</AdminContext.Provider>;
}

/**
 * Hook to access admin store (internal use)
 */
export function useAdminStore(): AdminStore {
	const context = useContext(AdminContext);
	if (!context) {
		throw new Error('useAdminStore must be used within TranslationAdminProvider');
	}
	return context.store;
}

/**
 * Hook to subscribe to store state changes
 *
 * Uses a ref for the selector to avoid infinite re-renders when
 * inline selector functions are passed.
 */
export function useAdminState<T>(selector: (store: AdminStore) => T): T {
	const store = useAdminStore();
	const selectorRef = useRef(selector);
	const [value, setValue] = useState(() => selector(store));

	// Keep selector ref up to date
	selectorRef.current = selector;

	useEffect(() => {
		// Update immediately in case state changed
		const newValue = selectorRef.current(store);
		setValue(newValue);

		// Subscribe to future changes
		return store.subscribe(() => {
			const nextValue = selectorRef.current(store);
			setValue(nextValue);
		});
	}, [store]); // selector intentionally omitted - using ref instead

	return value;
}
