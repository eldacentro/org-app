/// <reference types="../../../node_modules/@types/react/index.d.ts"/>
/// <reference types="../../../node_modules/@types/react-dom/index.d.ts"/>

declare const React: typeof React;
declare const ReactDOM: typeof ReactDOM;

// Hash corto del commit, inyectado por vite.config.ts (define).
declare const __BUILD_SHA__: string;

// Número de build (total de commits), inyectado por vite.config.ts (define).
declare const __BUILD_NUMBER__: string;

interface MyWorkerGlobalScope extends DedicatedWorkerGlobalScope {
  setting: {
    apiHost: string | undefined;
    userID: string | undefined;
    idToken: string | undefined;
    FEATURE_FLAGS: Record<string, boolean>;
  };
  onmessage: DedicatedWorkerGlobalScope['onmessage'];
  postMessage: DedicatedWorkerGlobalScope['postMessage'];
}
