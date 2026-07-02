import { defineConfig } from "@rspack/cli";
import { rspack } from "@rspack/core";
import { ModuleFederationPlugin } from "@module-federation/enhanced/rspack";
import { VueLoaderPlugin } from "rspack-vue-loader";
import path from "node:path";
import { app_names, app_urls, dev_proxy_entries } from "./dev-proxy-config.ts";
// owners.json is the single source of truth for every app's dev port. The shell's
// host (dev.smit.team) + https stay hard-coded here, but the port lives in owners.shell
// so a port change is one edit, not scattered across config + package.json scripts.
// Lives at the repo root (gitignored, per-machine) — copy owners.example.json to start.
import owners from "../../owners.json" with { type: "json" };

const project_dir = import.meta.dirname;
const is_dev = process.env.NODE_ENV !== "production";
const shell_port = owners.shell.port;
const use_rsdoctor = process.env.RSDOCTOR === "true";

// Preconnect only helps cross-origin dev (remotes on other localhost ports). In prod
// remotes are same-origin relative paths, so a preconnect to them is a no-op — emit none.
const preconnect_links = is_dev
  ? app_names
      .map(
        (name) => `<link rel="preconnect" href="${app_urls[name]}" crossorigin />`
      )
      .join("\n    ")
  : "";

const mf_remotes = Object.fromEntries(
  app_names.map((name) => [name, `${name}@${app_urls[name]}/mf-manifest.json`])
);

export default defineConfig({
  mode: is_dev ? "development" : "production",
  entry: "./src/bootstrap.ts",
  target: "web",
  output: {
    // Under a sub-path host (e.g. GitHub Pages /MF-2-vue/), assets must resolve from
    // BASE_PATH. Default to '/' for root deploys: the shell's entry scripts are injected
    // into index.html with a relative src, so on a deep route reload (e.g. /app/adaccounts)
    // 'auto' would resolve them against the route path and 404. An absolute '/' is required.
    // publicPath: is_dev
    //   ? `https://dev.smit.team:${shell_port}/`
    //   : process.env.BASE_PATH || "/",
    publicPath: "/",
    uniqueName: "shell_host",
    clean: true,
    filename: is_dev ? "[name].js" : "[name].[contenthash:8].js",
    chunkFilename: is_dev
      ? "[name].chunk.js"
      : "[name].[contenthash:8].chunk.js",
  },
  devServer: {
    port: shell_port,
    host: "0.0.0.0",
    server: "https",
    allowedHosts: "all",
    hot: true,
    historyApiFallback: true,
    headers: { "Access-Control-Allow-Origin": "*" },
    client: { overlay: false },
    // Browser talks to the HTTPS shell origin; devServer forwards remote assets
    // to localhost remotes to avoid Chrome Private Network Access blocking.
    proxy: dev_proxy_entries,
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".vue"],
    alias: { "@": path.resolve(project_dir, "src") },
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: "rspack-vue-loader",
        options: {
          experimentalInlineMatchResource: true,
        },
      },
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        loader: "builtin:swc-loader",
        options: {
          jsc: {
            parser: { syntax: "typescript" },
            target: "es2022",
          },
        },
      },
      {
        test: /\.css$/,
        use: ["postcss-loader"],
        type: "css",
      },
    ],
  },
  plugins: [
    new VueLoaderPlugin(),
    new rspack.DefinePlugin({
      __DASHBOARD_URL__: JSON.stringify(
        process.env.DASHBOARD_URL || "https://dashboard.smit.team"
      ),
      // Router history base — keeps client-side routes under the sub-path host.
      __BASE_PATH__: JSON.stringify(process.env.BASE_PATH || "/"),
      __VUE_OPTIONS_API__: JSON.stringify(true),
      __VUE_PROD_DEVTOOLS__: JSON.stringify(false),
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false),
    }),
    new rspack.HtmlRspackPlugin({
      template: "./public/index.html",
      inject: "body",
      templateParameters: {
        PRECONNECT_LINKS: preconnect_links,
        BASE_PATH: process.env.BASE_PATH || "/",
      },
    }),
    // Copy static public assets into dist — HtmlRspackPlugin references them but
    // does not emit them. Keep shell-owned images here so they resolve in prod.
    new rspack.CopyRspackPlugin({
      patterns: [
        { from: "public/favicon.svg", to: "favicon.svg" },
        { from: "public/assets", to: "assets" },
      ],
    }),
    new ModuleFederationPlugin({
      name: "shell_host",
      // DTS: hút .d.ts do từng remote sinh vào @mf-types/ (gitignored) để
      // import('<remote>/routes' | '/App') có type thật từ source remote, không phải
      // khai tay. Host chỉ tiêu thụ — không tự sinh type cho chính nó.
      dts: { generateTypes: false, consumeTypes: true },
      remotes: mf_remotes,
      shared: {
        vue: { singleton: true, eager: true, requiredVersion: "^3.5.0" },
        "vue-router": {
          singleton: true,
          eager: true,
          requiredVersion: "^4.0.0",
        },
        pinia: { singleton: true, eager: true, requiredVersion: "^3.0.0" },
        // requiredVersion: false — bỏ version check cho package workspace nội bộ (tránh warn 'workspace:*').
        "@mf2/shared-types": { singleton: true, eager: true, requiredVersion: false },
        "@mf2/shared-ui": { singleton: true, eager: true, requiredVersion: false },
        "@mf2/shared-store": { singleton: true, eager: true, requiredVersion: false },
        // vue-sonner keeps its toast queue in module state. Without sharing it as
        // a singleton, each remote bundles its own copy: toast() pushes to one
        // emitter while <Toaster> listens on another → toasts never render in the
        // shell. Singleton ensures one shared emitter across host + remotes.
        "vue-sonner": { singleton: true, eager: true, requiredVersion: "^2.0.9" },
      },
    }),
    use_rsdoctor &&
      new (require("@rsdoctor/rspack-plugin").RsdoctorRspackPlugin)({}),
  ].filter(Boolean),
  optimization: {
    minimize: !is_dev,
    runtimeChunk: { name: "runtime" },
    splitChunks: {
      chunks: "all",
      cacheGroups: {
        mfRuntime: {
          test: /[\\/]node_modules[\\/]@module-federation[\\/]/,
          name: "mf-runtime",
          priority: 30,
          reuseExistingChunk: true,
        },
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: "vendors",
          priority: 10,
          reuseExistingChunk: true,
        },
      },
    },
  },
  experiments: {
    css: true,
  },
  // lazyCompilation (default { imports: true } for web) defers compiling dynamic
  // imports until runtime requests them. MF remotes load as dynamic imports, and the
  // cross-origin host→remote compile trigger never completes — the import() hangs and
  // Suspense stays on the loading fallback forever. Disable so remotes compile eagerly.
  lazyCompilation: false,
  performance: {
    hints: is_dev ? false : "warning",
    maxAssetSize: 300_000,
    maxEntrypointSize: 300_000,
    assetFilter: (filename: string) => !/\.map$/.test(filename),
  },
});
