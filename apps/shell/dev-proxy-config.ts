// owners.json lives at the repo root (gitignored, per-machine) — copy owners.example.json to start.
import owners from '../../owners.json' with { type: 'json' };
// Underscore MF name -> hyphen URL segment. Single source of truth, shared with the
// dist assembly + verification scripts so the served path can never drift from config.
import { toSegment } from '../../scripts/remote-segments.mjs';

// `shell` is the host, not a remote — only owners.remotes drives the MF remote list.
const remotes = owners.remotes;

export type AppName = keyof typeof remotes;

export const app_names = Object.keys(remotes) as AppName[];

const is_prod = process.env.NODE_ENV === 'production';
const is_dev = !is_prod;
// Normalise to exactly one trailing slash so `${base_path}${segment}` never yields
// `//` or a missing separator regardless of how BASE_PATH was passed.
const base_path = (process.env.BASE_PATH || '/').replace(/\/?$/, '/');
const shell_port = owners.shell.port;

export const app_urls = Object.fromEntries(
  app_names.map((name) => {
    const env_key = `${name.toUpperCase()}_REMOTE_URL`;
    const override = process.env[env_key];
    if (override) return [name, override];
    // Prod serves every app from one origin: reference remotes by BASE_PATH-prefixed
    // relative path so the browser resolves them same-origin, independent of domain.
    if (is_prod) return [name, `${base_path}${toSegment(name)}`];
    // Dev uses same-origin proxy paths so Chrome does not block HTTPS shell ->
    // HTTP localhost remote requests via Private Network Access checks.
    return [name, `https://dev.smit.team:${shell_port}/remotes/${toSegment(name)}`];
  }),
) as Record<AppName, string>;

// Forward proxied remote asset requests back to each localhost dev server.
export const dev_proxy_entries = is_dev
  ? app_names.map((name) => {
      const { host, port } = remotes[name];
      const segment = toSegment(name);

      return {
        context: [`/remotes/${segment}`],
        target: `http://${host}:${port}`,
        pathRewrite: { [`^/remotes/${segment}`]: '' },
        changeOrigin: true,
        secure: false,
        ws: true,
      };
    })
  : [];

export default app_urls;
