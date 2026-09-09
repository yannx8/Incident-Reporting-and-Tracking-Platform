// Re-exports notification data so CoreLayout can import it without
// creating a circular dependency with mockData.ts (which imports from types.ts).
export { initialNotifications } from './mockData';
