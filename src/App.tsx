import { MotionConfig } from 'motion/react';
import { createHashRouter, RouterProvider, type RouteObject } from 'react-router-dom';
import { engineeringModule } from './modules/engineering/module';
import { procurementModule } from './modules/procurement/module';
import { PackageDrawer } from './ui/package/PackageDrawer';
import { AppShell } from './ui/shell/AppShell';
import { LegacyRedirect } from './ui/shell/LegacyRedirect';
import { ModuleRoute } from './ui/shell/ModuleRoute';
import { appStore } from './store/appStore';
import { LoadingScreen } from './ui/states/LoadingScreen';
import { NotFound } from './ui/states/NotFound';
import { RouteError } from './ui/states/RouteError';

/** Hash routing: works from any static host path without server rewrites. Module pages load lazily. */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    // A failed page chunk (e.g. a stale hashed file after a redeploy) and the first lazy page load.
    errorElement: <RouteError />,
    HydrateFallback: () => <LoadingScreen step="config" />,
    children: [
      // Until the index page exists, the root (and old links) go to Procurement.
      { index: true, element: <LegacyRedirect /> },
      { path: 'discipline/:name', element: <LegacyRedirect /> },
      {
        path: 'procurement',
        element: <ModuleRoute module={procurementModule} overlay={<PackageDrawer />} />,
        children: [
          { index: true, lazy: () => import('./ui/overview/OverviewPage').then((m) => ({ Component: m.OverviewPage })) },
          { path: 'discipline/:name', lazy: () => import('./ui/discipline/DisciplinePage').then((m) => ({ Component: m.DisciplinePage })) },
          // Unknown sub-paths stay inside the module, so the header's module controls still apply.
          { path: '*', element: <NotFound /> },
        ],
      },
      {
        path: 'engineering',
        element: <ModuleRoute module={engineeringModule} />,
        children: [
          { index: true, lazy: () => import('./ui/engineering/EngOverviewPage').then((m) => ({ Component: m.EngOverviewPage })) },
          { path: '*', element: <NotFound /> },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
];

// Fetch config.json in parallel with the first page chunk instead of after it (loadConfig is idempotent;
// AppShell calls it too). Skipped under Vitest, where tests seed the app store themselves.
if (import.meta.env.MODE !== 'test') void appStore.getState().loadConfig();

const router = createHashRouter(routes);

export function App() {
  return (
    // Motion follows the OS "reduce motion" setting for every animated component.
    <MotionConfig reducedMotion="user">
      <RouterProvider router={router} />
    </MotionConfig>
  );
}
