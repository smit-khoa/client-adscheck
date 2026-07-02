import { defineConfig } from '@rspack/cli';
import { rspack } from '@rspack/core';
import { ModuleFederationPlugin } from '@module-federation/enhanced/rspack';
import { VueLoaderPlugin } from 'rspack-vue-loader';
import path from 'node:path';
import owners from '../../owners.json' with { type: 'json' };

const project_dir = import.meta.dirname;
const is_dev = process.env.NODE_ENV !== 'production';
const { host, port } = owners.remotes.extended_payment;

export default defineConfig({
  mode: is_dev ? 'development' : 'production',
  entry: './src/bootstrap.ts',
  target: 'web',
  output: {
    publicPath: 'auto',
    uniqueName: 'extended_payment',
    clean: true,
    filename: is_dev ? '[name].js' : '[name].[contenthash:8].js',
  },
  devServer: {
    port,
    hot: true,
    allowedHosts: 'all',
    historyApiFallback: true,
    headers: { 'Access-Control-Allow-Origin': '*' },
    client: { webSocketURL: `ws://${host}:${port}/ws`, overlay: false },
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.vue'],
    alias: { '@': path.resolve(project_dir, 'src') },
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'rspack-vue-loader',
        options: { experimentalInlineMatchResource: true },
      },
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        loader: 'builtin:swc-loader',
        options: {
          jsc: { parser: { syntax: 'typescript' }, target: 'es2022' },
        },
      },
      { test: /\.css$/, use: ['postcss-loader'], type: 'css' },
    ],
  },
  plugins: [
    new VueLoaderPlugin(),
    new rspack.DefinePlugin({
      __VUE_OPTIONS_API__: JSON.stringify(true),
      __VUE_PROD_DEVTOOLS__: JSON.stringify(false),
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false),
    }),
    new rspack.HtmlRspackPlugin({ template: './public/index.html', inject: 'body' }),
    new ModuleFederationPlugin({
      name: 'extended_payment',
      dts: {
        generateTypes: { compilerInstance: 'vue-tsc' },
        consumeTypes: false,
      },
      filename: 'remoteEntry.js',
      exposes: { './App': './src/App.vue', './routes': './src/router/index.ts' },
      shared: {
        vue: { singleton: true, requiredVersion: '^3.5.0' },
        'vue-router': { singleton: true, requiredVersion: '^4.0.0' },
        pinia: { singleton: true, requiredVersion: '^3.0.0' },
        '@mf2/shared-types': { singleton: true, requiredVersion: false },
        '@mf2/shared-ui': { singleton: true, requiredVersion: false },
        '@mf2/shared-store': { singleton: true, requiredVersion: false },
        'vue-sonner': { singleton: true, requiredVersion: '^2.0.9' },
      },
    }),
  ].filter(Boolean),
  experiments: { css: true },
  lazyCompilation: false,
});
