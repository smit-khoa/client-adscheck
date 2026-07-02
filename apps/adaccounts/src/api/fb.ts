// Local FB-API barrel mirroring the @mf2/shared-fb public surface, so BM tool
// runners ported from the standalone bm remote import from one place instead of
// reaching into fb-graph / types / fb-token / smit-connect individually. Keeps
// the ported runners untouched apart from the import path.
export { graph, graphql, responseHasMarker } from './fb-graph';
export { getToken } from './fb-token';
export { extFetch } from './smit-connect';
export { isGraphError } from './types';
export type { FbTokenBundle, ExtFetchOptions, GraphResult, GraphError } from './types';
