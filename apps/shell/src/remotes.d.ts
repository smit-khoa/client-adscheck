// Stable offline fallback for remote module types. The MF `dts.consumeTypes` plugin
// fetches richer types over HTTP from a *running* remote (IDE/dev), but an offline
// typecheck (CI builds each app in isolation, no remote served) gets an empty @mf-types/.
// These hand-written declarations guarantee the host always has remote types to compile
// against. Drift is caught when a remote is rebuilt — its generated types must stay
// compatible with the shapes declared here.
declare module 'adaccounts/App' {
  import type { Component } from 'vue';
  const App: Component;
  export default App;
}

declare module 'ads_manager/App' {
  import type { Component } from 'vue';
  const App: Component;
  export default App;
}

declare module 'extended_payment/App' {
  import type { Component } from 'vue';
  const App: Component;
  export default App;
}

declare module 'adaccounts/routes' {
  import type { RouteRecordRaw } from 'vue-router';
  const routes: RouteRecordRaw[];
  export default routes;
}

declare module 'ads_manager/routes' {
  import type { RouteRecordRaw } from 'vue-router';
  const routes: RouteRecordRaw[];
  export default routes;
}

declare module 'extended_payment/routes' {
  import type { RouteRecordRaw } from 'vue-router';
  const routes: RouteRecordRaw[];
  export default routes;
}
