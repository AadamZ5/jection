// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Abstract<T = void> = abstract new (...args: any[]) => T;
