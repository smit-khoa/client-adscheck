// Type surface for remote-segments.mjs so the TS configs (dev-proxy-config.ts) can
// import the shared name->segment mapping without an implicit-any error.
export declare const toSegment: (name: string) => string;
export declare const remoteNames: string[];
export declare const remotes: { name: string; segment: string }[];
