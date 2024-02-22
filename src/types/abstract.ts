// eslint-disable-next-line @typescript-eslint/ban-types
export type Abstract<T = unknown> = Function & { prototype: T };
