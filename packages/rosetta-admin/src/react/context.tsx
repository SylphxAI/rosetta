'use client';

/**
 * React context for translation admin
 */

import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useState,
	type JSX,
	type ReactNode,
} from 'react';
import type { AdminAPIClient } from '../core/types';
import { createAdminStore, type AdminStore } from '../core/store';

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
 */
export function useAdminState<T>(selector: (store: AdminStore) => T): T {
	const store = useAdminStore();
	const [value, setValue] = useState(() => selector(store));

	useEffect(() => {
		// Update immediately in case state changed
		setValue(selector(store));

		// Subscribe to future changes
		return store.subscribe(() => {
			setValue(selector(store));
		});
	}, [store, selector]);

	return value;
}
