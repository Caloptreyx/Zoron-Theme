import { faGauge, faPalette } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { createElement, lazy } from 'react';
import { Extension, type ExtensionContext } from 'shared';
import { ConsoleSwitch } from './elements/console/Console.tsx';
import TerminalButtons from './elements/console/TerminalButtons.tsx';
import { closeTerminal, initTerminal, openTerminal, prepareTerminal } from './elements/console/xterm.ts';
import Greeting from './elements/Greeting.tsx';
import { HomeSwitch } from './elements/home/Home.tsx';
import LoginLinks from './elements/LoginLinks.tsx';
import { ServerHome } from './elements/server/Overview.tsx';
import Shell from './elements/shell/Shell.tsx';
import { AccountContentContainer, Sidebar } from './lib/core.ts';
import { THEME_UPDATE_PERMISSION } from './lib/permissions.ts';
import { corePages } from './lib/routes.ts';
import { watchSideScrollers } from './lib/scrollers.ts';
import { bootTheme, currentTheme, listenForPreview, startTheme } from './lib/store.ts';
import ThemeEditor, { LOGIN_PREVIEW_PATH } from './pages/ThemeEditor.tsx';
import { getExtTranslations } from './translations.ts';

// core awaits its startup requests (settings, and icons from panel 1.2.7) before it initialises extensions and
// mounts, its boot spinner in the stock colours meanwhile: the cached theme paints as this module loads instead
bootTheme();

// the login preview route is the only place that loads it outside core's own lazy auth router
const Login = lazy(() => import('@/pages/auth/Login.tsx'));

class DevCaloptreyxZoronExtension extends Extension {
  public cardIcon = createElement(FontAwesomeIcon, { icon: faPalette });
  public cardConfigurationPage: React.FC | null = ThemeEditor;
  public cardComponent: React.FC | null = null;

  public initialize(ctx: ExtensionContext): void {
    // the look is runtime CSS (lib/store.ts): the cached theme painted as this module loaded and its fetch is on its
    // way; inside the editor's preview frame the editor's drafts replace both
    startTheme();
    listenForPreview();

    // core's tab bars and Zoron's chip rows scroll sideways with a mouse wheel, and a tab bar shows its current tab
    watchSideScrollers();

    // `greeting`: a welcome above the servers list, whichever of core's two list routes is the start page
    ctx.extensionRegistry.pages.dashboard.home
      .enterContainerAll((container) => container.prependComponent(Greeting))
      .enterContainerGrouped((container) => container.prependComponent(Greeting));

    // `loginLinks`: chips at the top of every sign in page (core renders the auth slot above its logo)
    ctx.extensionRegistry.pages.auth.prependComponent(LoginLinks);

    // `homePage` (on by default): core's two server lists become Zoron's servers page (elements/home); the registries
    // are compared at render time, where core passes the merged ones
    AccountContentContainer.addRenderInterceptor((element, props) => {
      const home = window.extensionContext.extensionRegistry.pages.dashboard.home;
      if (props.registry !== home.containerAll && props.registry !== home.containerGrouped) return element;
      return createElement(HomeSwitch, { ...props, element });
    });

    // `sidebar: 'rail'` (the default) swaps core's sidebar for Zoron's rail and panel; the other layouts keep core's
    Sidebar.addRenderInterceptor((element, props) => createElement(Shell, { ...props, element }));

    // `serverOverview` (on by default): a server opens on Zoron's overview (elements/server) at `/`, and core's console
    // moves to `/terminal`, the next link. One route keeps `/` whichever is on, its name, icon and active matches read
    // the theme when the sidebar renders and its element when it mounts, so Studio's switch needs no reload. Core's
    // console keeps its own `/console/popout`, which `/terminal` does not own, so an egg's custom sidebar order leaves
    // it reachable. The console's subpages (resource history and crashes, panel 1.2.9) light the console's link only.
    // `consolePage` (on by default): wherever the console shows (`/terminal`, or `/` with the overview off), it is
    // Zoron's console page (elements/console), switched when it mounts as well; the popout stays core's.
    ctx.extensionRegistry.routes.addServerRouteInterceptor((routes) => {
      corePages.history = routes.some((route) => route.path === '/console/history');
      const index = routes.findIndex((route) => route.path === '/');
      if (index === -1) return;
      const consoleRoute = routes[index];
      const CoreConsole = consoleRoute.element;
      const Console = function ZoronConsole() {
        return createElement(ConsoleSwitch, { Core: CoreConsole });
      };
      const overview = () => currentTheme().serverOverview;
      const consoleName = consoleRoute.name;
      const consoleIcon = consoleRoute.icon;
      const consoleMatches = consoleRoute.activeMatches;
      routes.splice(
        index,
        1,
        {
          ...consoleRoute,
          name: () =>
            overview()
              ? getExtTranslations().t('overview.title', {})
              : typeof consoleName === 'function'
                ? consoleName()
                : (consoleName ?? ''),
          get icon() {
            return overview() ? faGauge : consoleIcon;
          },
          get activeMatches() {
            return overview() ? undefined : consoleMatches;
          },
          element: function ZoronServerHome() {
            return createElement(ServerHome, { Console });
          },
        },
        {
          ...consoleRoute,
          path: '/terminal',
          element: Console,
          filter: () => overview() && (consoleRoute.filter?.() ?? true),
        },
      );
    });

    // every console (Zoron's page, core's, the popout): the theme's terminal colours, font and line height, live, the
    // highlighting of uncoloured warnings and errors, and clear and download buttons in its header
    ctx.extensionRegistry.pages.server.console
      .enterXTerm((xterm) =>
        xterm
          .addInitHandler(initTerminal)
          .addAfterPluginsHandler(prepareTerminal)
          .addAfterOpenHandler(openTerminal)
          .addOnUnmountHandler(closeTerminal),
      )
      .enterTerminalHeaderRightComponents((header) => header.appendComponent(TerminalButtons));

    // auth routes redirect signed in users, so the editor previews core's real login page here instead
    ctx.extensionRegistry.routes.addGlobalRoute({
      path: LOGIN_PREVIEW_PATH,
      element: () => createElement(Login),
    });

    // the backend's `zoron-theme` admin permission group (backend/src/permissions.rs) in core's role editor
    ctx.extensionRegistry.enterPermissionIcons((icons) =>
      icons.addAdminPermissionIcon('zoron-theme', createElement(FontAwesomeIcon, { icon: faPalette })),
    );
    ctx.extensionRegistry.routes.addAdminRoute({
      name: () => getExtTranslations().t('nav.editor', {}),
      icon: faPalette,
      path: '/zoron',
      category: 'system',
      // core shows it to roles holding either; saving needs settings.update or zoron-theme.update (lib/permissions.ts)
      permission: ['settings.read', THEME_UPDATE_PERMISSION],
      element: ThemeEditor,
      exact: true,
    });
  }
}

export default new DevCaloptreyxZoronExtension();
