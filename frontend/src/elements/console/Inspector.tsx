import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { type KeyboardEvent, useId } from 'react';
import { ActionIcon, ExtensionSlot, useServerCan, useServerStore } from '../../lib/core.ts';
import { useZoronTheme } from '../../lib/store.ts';
import { useExtTranslations } from '../../translations.ts';
import { ConnectDetails } from '../server/parts.tsx';
import { CommandsEditor } from './QuickCommands.tsx';

export type InspectorTab = 'details' | 'commands';

const TAB_LABEL = {
  details: 'console.details',
  commands: 'console.commandsTab',
} as const;

/** The inspector's parts: Details, and Commands with `control.console` and `consoleQuickCommands`. */
export function useInspectorTabs(): InspectorTab[] {
  const canConsole = useServerCan('control.console');
  const quickCommands = useZoronTheme().consoleQuickCommands;
  return canConsole && quickCommands ? ['details', 'commands'] : ['details'];
}

/**
 * The console's inspector. Details: the server's description, how to connect, then core's `statCards` and
 * `statBlocks` slots, where other extensions put their pills (an auto stop countdown), so nothing hides behind a tab.
 * Commands, the quick commands, is a second tab where `useInspectorTabs` allows it; without it the head is the
 * "Details" heading (none in the phone's sheet, whose title it is then). The same in the workspace's side panel and
 * the phone's sheet; `onClose` adds a close button where the panel has no other.
 */
export function Inspector({
  tab,
  onTab,
  onClose,
}: {
  tab: InspectorTab;
  onTab: (tab: InspectorTab) => void;
  onClose?: () => void;
}) {
  const { t } = useExtTranslations();
  const id = useId();
  const server = useServerStore((state) => state.server);
  const registry = window.extensionContext.extensionRegistry.pages.server.console;

  const tabs = useInspectorTabs();
  const current = tabs.includes(tab) ? tab : 'details';
  const tabbed = tabs.length > 1;

  // arrows, Home and End move between the tabs, as a tab list does
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const at = tabs.indexOf(current);
    const next =
      event.key === 'ArrowRight'
        ? tabs[(at + 1) % tabs.length]
        : event.key === 'ArrowLeft'
          ? tabs[(at - 1 + tabs.length) % tabs.length]
          : event.key === 'Home'
            ? tabs[0]
            : event.key === 'End'
              ? tabs[tabs.length - 1]
              : null;
    if (!next) return;
    event.preventDefault();
    onTab(next);
    document.getElementById(`${id}-${next}`)?.focus();
  };

  const body = (
    <>
      {current === 'details' && (
        <>
          {server.description && <p className='zoron-con-desc'>{server.description}</p>}
          <ConnectDetails />
          <ExtensionSlot components={registry.statCards} name='console-stat-card' />
          <ExtensionSlot components={registry.statBlocks} name='console-stat-block' />
        </>
      )}
      {current === 'commands' && <CommandsEditor key={server.uuid} />}
    </>
  );

  return (
    <div className='zoron-con-inspect'>
      {(tabbed || onClose) && (
        <div className='zoron-con-inspect-head'>
          {tabbed ? (
            <div role='tablist' aria-label={t('console.details', {})} className='zoron-con-tabs' onKeyDown={onKeyDown}>
              {tabs.map((name) => (
                <button
                  key={name}
                  type='button'
                  role='tab'
                  id={`${id}-${name}`}
                  aria-selected={name === current}
                  aria-controls={`${id}-panel`}
                  tabIndex={name === current ? 0 : -1}
                  className='zoron-con-tab'
                  onClick={() => onTab(name)}
                >
                  {t(TAB_LABEL[name], {})}
                </button>
              ))}
            </div>
          ) : (
            <h2 className='zoron-con-inspect-title'>{t('console.details', {})}</h2>
          )}
          {onClose && (
            <ActionIcon variant='subtle' color='gray' aria-label={t('console.hidePanel', {})} onClick={onClose}>
              <FontAwesomeIcon icon={faXmark} />
            </ActionIcon>
          )}
        </div>
      )}
      {tabbed ? (
        <div role='tabpanel' id={`${id}-panel`} aria-labelledby={`${id}-${current}`} className='zoron-con-inspect-body'>
          {body}
        </div>
      ) : (
        <div className='zoron-con-inspect-body'>{body}</div>
      )}
    </div>
  );
}
