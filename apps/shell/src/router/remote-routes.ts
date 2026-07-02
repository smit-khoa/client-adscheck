import type { Router, RouteRecordRaw } from 'vue-router';

// Registry of remotes whose child routes are loaded on demand. Each remote exposes
// a `./routes` module (RouteRecordRaw[]) via Module Federation; the shell injects them
// under the named parent route the first time the user navigates into that branch.
interface RemoteEntry {
  /** Name of the parent route already declared in the static route tree. */
  parentName: string;
  /** Root path that identifies this remote's branch. */
  basePath: string;
  /** Lazy import of the remote's exposed `./routes`. */
  load: () => Promise<{ default: RouteRecordRaw[] }>;
}

const REMOTES: RemoteEntry[] = [
  {
    parentName: 'remote-adaccounts',
    basePath: '/adscheck-pro',
    load: () => import('adaccounts/routes'),
  },
  {
    parentName: 'remote-extended-payment',
    basePath: '/extended-payment',
    load: () => import('extended_payment/routes'),
  },
];

// Remotes whose routes have already been registered — guarantees addRoute runs once
// even across repeated back/forward navigation into the same branch.
const registered = new Set<string>();
// In-flight registration promises, keyed by parent name. Concurrent navigations into the
// same branch await the SAME registration instead of each calling addRoute (which would
// warn/duplicate). Cleared on failure so a later navigation can retry.
const inflight = new Map<string, Promise<void>>();

function registerRemote(router: Router, remote: RemoteEntry): Promise<void> {
  let promise = inflight.get(remote.parentName);
  if (!promise) {
    promise = remote
      .load()
      .then((mod) => {
        for (const child of mod.default) {
          router.addRoute(remote.parentName, child);
        }
        registered.add(remote.parentName);
      })
      .catch((err) => {
        // Remote down / chunk failed: drop the cached promise so the next navigation
        // retries, and rethrow so the caller lets navigation continue to the host.
        inflight.delete(remote.parentName);
        throw err;
      });
    inflight.set(remote.parentName, promise);
  }
  return promise;
}

/**
 * Install a global guard that lazily registers a remote's child routes the first time
 * the user enters its branch. Matches by URL segment (not by resolved route name) so a
 * deep-linked child path that does not yet match any route — and therefore falls into
 * the NotFound catch-all — still triggers registration, then re-resolves.
 */
export function installRemoteRoutes(router: Router): void {
  router.beforeEach(async (to) => {
    const pending = REMOTES.filter(
      (r) => !registered.has(r.parentName) && pathTargetsRemote(to.path, r.basePath)
    );
    if (pending.length === 0) return true;

    try {
      await Promise.all(pending.map((r) => registerRemote(router, r)));
    } catch {
      // A remote failed to load: let navigation proceed to the host route so RemoteHost
      // mounts and its error boundary / Suspense surfaces the failure with a Retry — a
      // throwing guard would instead brick navigation outside the component tree.
      return true;
    }

    // Re-resolve so a deep-linked child path matches the freshly added routes.
    return { path: to.fullPath, replace: true };
  });
}

/** True when `path` is the remote base path or any sub-path of it. */
function pathTargetsRemote(path: string, basePath: string): boolean {
  return path === basePath || path.startsWith(`${basePath}/`);
}
