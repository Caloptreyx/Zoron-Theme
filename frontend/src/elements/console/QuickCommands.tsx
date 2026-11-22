import { faAngleRight, faPen, faPlus, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { type FormEvent, useEffect, useState, useSyncExternalStore } from 'react';
import { z } from 'zod';
import {
  ActionIcon,
  Button,
  getUserSetting,
  httpErrorToHuman,
  Popover,
  removeUserSetting,
  SocketRequest,
  setUserSetting,
  TextInput,
  updateUserSettings,
  useServerCan,
  useServerStore,
  useToast,
  useUserSetting,
  useUserSettingsLoaded,
} from '../../lib/core.ts';
import { useZoronTheme } from '../../lib/store.ts';
import { useExtTranslations } from '../../translations.ts';
import {
  COMMANDS_KEY,
  commandList,
  commandOf,
  legacyCommandsKey,
  MAX_COMMAND,
  MAX_COMMANDS,
  normalizeCommandMap,
  parseCommands,
  type ServerCommands,
  withCommand,
  withServerCommands,
} from './console.ts';

/** Core parses each setting through a schema; this one is normalizeCommandMap(), so a malformed map reads as none. */
const commandsSchema = z.unknown().transform(normalizeCommandMap);
const NONE: ServerCommands = {};
const NO_COMMANDS: readonly string[] = [];

/**
 * The map being saved, shown until the panel answers (as server tiles do, useTiles.ts: core's own setter only logs
 * a refusal, so Zoron sends the map itself and hands it to core's store once the panel took it).
 */
let pending: { id: number; map: ServerCommands } | null = null;
let saves = 0;
const listeners = new Set<() => void>();
/** Servers whose list this browser kept before the account did, already moved (or being moved) this load. */
const moved = new Set<string>();

function setPending(next: typeof pending) {
  pending = next;
  for (const listener of listeners) listener();
}

function subscribePending(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Saves one server's own list: shown at once, then sent. Accepted, it becomes core's value; refused (over the panel's
 * size limit, an impersonating admin), the saved map shows again and core's toast says why. Resolves to whether
 * the panel took it.
 */
function useSaveCommands() {
  const { addToast } = useToast();

  return async (uuid: string, list: readonly string[]): Promise<boolean> => {
    const map = withServerCommands(pending?.map ?? getUserSetting(COMMANDS_KEY, commandsSchema, NONE), uuid, list);
    const id = ++saves;
    setPending({ id, map });
    const empty = Object.keys(map).length === 0;
    try {
      await updateUserSettings({ [COMMANDS_KEY]: empty ? null : map });
      if (empty) removeUserSetting(COMMANDS_KEY);
      else setUserSetting(COMMANDS_KEY, map);
      return true;
    } catch (err) {
      addToast(httpErrorToHuman(err), 'error');
      return false;
    } finally {
      if (pending?.id === id) setPending(null);
    }
  };
}

/**
 * A server's own quick commands, saved to the user's account (core's user settings, under COMMANDS_KEY) so they
 * follow them to every browser, shared by every part showing them (the chips, the panel's list), with the setter that
 * saves them. A list this browser kept before (`legacyCommandsKey`) joins the account's once the account's settings
 * have loaded, and is forgotten here once the panel took it.
 */
function useQuickCommands(uuid: string) {
  const [saved] = useUserSetting(COMMANDS_KEY, commandsSchema, NONE);
  const unsaved = useSyncExternalStore(subscribePending, () => pending);
  const loaded = useUserSettingsLoaded();
  const save = useSaveCommands();
  const key = uuid.toLowerCase();
  const commands = (unsaved?.map ?? saved)[key] ?? NO_COMMANDS;

  useEffect(() => {
    if (!loaded || moved.has(key)) return;
    moved.add(key);
    const storageKey = legacyCommandsKey(uuid);
    const forget = () => {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // storage blocked: nothing was kept there either
      }
    };
    let kept: string[];
    try {
      kept = parseCommands(localStorage.getItem(storageKey));
    } catch {
      return;
    }
    const current = (pending?.map ?? getUserSetting(COMMANDS_KEY, commandsSchema, NONE))[key] ?? NO_COMMANDS;
    const merged = commandList([...current, ...kept]);
    if (merged.length === current.length) {
      forget();
      return;
    }
    void save(uuid, merged).then((ok) => {
      if (ok) forget();
      // refused: kept here, tried again on the next load
    });
  }, [loaded, key, uuid, save]);

  return [commands, (next: readonly string[]) => save(uuid, next)] as const;
}

/**
 * Sends a command over the server's websocket; `ready` while it is connected and the server is not offline, with
 * `reason` saying why not otherwise.
 */
function useCommandSender() {
  const { t } = useExtTranslations();
  const state = useServerStore((state) => state.state);
  const socketConnected = useServerStore((state) => state.socketConnected);
  const socketInstance = useServerStore((state) => state.socketInstance);
  const connected = socketConnected && socketInstance !== null;
  const ready = connected && state !== 'offline';
  return {
    ready,
    reason: ready ? null : connected ? t('console.offline', {}) : t('console.connecting', {}),
    send: (command: string) => socketInstance?.send(SocketRequest.SEND_COMMAND, command),
  };
}

/**
 * The quick commands as a row of chips, just above the prompt or just under the terminal's toolbar (`consoleChips`,
 * `data-chips` on the workspace places it; 'panel' and 'off' show none), a click sending one while the console can
 * take it (its title says why not otherwise): the site's (`consoleCommands`, set in Studio, marked quietly) first,
 * then the user's own saved ones that are not already among them, and a last chip to manage them: `onEdit` (the
 * details panel at its list) where there is a panel, else the same list in a popover by the chip, so quick commands
 * never depend on the panel. With none saved, only that chip, which says what it is. Needs `control.console`, as
 * core's command input does.
 */
export function CommandChips({ onEdit }: { onEdit?: () => void }) {
  const { t } = useExtTranslations();
  const theme = useZoronTheme();
  const uuid = useServerStore((state) => state.server.uuid);
  const canConsole = useServerCan('control.console');
  const [saved] = useQuickCommands(uuid);
  const { ready, reason, send } = useCommandSender();
  const [editing, setEditing] = useState(false);

  const site = theme.consoleCommands;
  if (!canConsole || theme.consoleChips === 'off' || theme.consoleChips === 'panel') return null;
  const own = saved.filter((command) => !site.includes(command));

  // the site's and the visitor's own never overlap, so the command is a unique key
  const chip = (command: string, fromSite: boolean) => (
    <button
      key={command}
      type='button'
      className='zoron-con-chip'
      data-site={fromSite || undefined}
      disabled={!ready}
      title={reason ?? t(fromSite ? 'console.sendSiteCommand' : 'console.sendCommand', { command })}
      aria-label={t(fromSite ? 'console.sendSiteCommand' : 'console.sendCommand', { command })}
      onClick={() => send(command)}
    >
      <FontAwesomeIcon icon={faAngleRight} className='zoron-con-chip-cue' />
      <span className='truncate'>{command}</span>
    </button>
  );

  const edit = (
    <button
      type='button'
      className='zoron-con-chip'
      data-edit
      data-zoron-inspector-toggle
      title={t('console.editCommands', {})}
      aria-label={t('console.editCommands', {})}
      aria-expanded={onEdit ? undefined : editing}
      onClick={onEdit ?? (() => setEditing(!editing))}
    >
      <FontAwesomeIcon icon={own.length > 0 ? faPen : faPlus} />
      {own.length === 0 && <span>{t('console.addFirstCommand', {})}</span>}
    </button>
  );

  return (
    <div className='zoron-con-chips' role='group' aria-label={t('console.commands', {})}>
      {site.map((command) => chip(command, true))}
      {own.map((command) => chip(command, false))}
      {onEdit ? (
        edit
      ) : (
        <Popover
          opened={editing}
          onChange={setEditing}
          position='top-start'
          width='min(22rem, calc(100vw - 1.5rem))'
          trapFocus
        >
          <Popover.Target>{edit}</Popover.Target>
          <Popover.Dropdown p='sm'>
            <CommandsEditor key={uuid} />
          </Popover.Dropdown>
        </Popover>
      )}
    </div>
  );
}

/** One row of the inspector's list: the whole row sends the command (same rules as the chips). */
function CommandRow({
  command,
  title,
  disabled,
  onClick,
}: {
  command: string;
  title: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button type='button' className='zoron-con-command' disabled={disabled} title={title} onClick={onClick}>
      <FontAwesomeIcon icon={faAngleRight} className='shrink-0 opacity-50' />
      <span className='truncate'>{command}</span>
    </button>
  );
}

/**
 * The inspector's list of quick commands: the site's first (under their own heading, no remove button), then the
 * visitor's own, each with a remove button; each one sends on a click (same rules as the chips) and the field under
 * them adds one (not one the site already has). Keyed by the server, so a half typed command stays with its server.
 */
export function CommandsEditor() {
  const { t } = useExtTranslations();
  const theme = useZoronTheme();
  const uuid = useServerStore((state) => state.server.uuid);
  const [commands, save] = useQuickCommands(uuid);
  const { ready, reason, send } = useCommandSender();
  const [draft, setDraft] = useState('');

  const site = theme.consoleCommands;
  const own = commands.filter((command) => !site.includes(command));
  const typed = commandOf(draft);
  const next = typed !== null && !site.includes(typed) ? withCommand(commands, typed) : null;

  const add = (event: FormEvent) => {
    event.preventDefault();
    if (!next) return;
    void save(next);
    setDraft('');
  };

  return (
    <div className='flex flex-col gap-3'>
      {site.length > 0 && (
        <>
          <h3 className='zoron-con-commands-head'>{t('console.siteCommands', {})}</h3>
          <ul className='zoron-con-commands'>
            {site.map((command) => (
              <li key={command}>
                <CommandRow
                  command={command}
                  title={reason ?? t('console.sendSiteCommand', { command })}
                  disabled={!ready}
                  onClick={() => send(command)}
                />
              </li>
            ))}
          </ul>
          <h3 className='zoron-con-commands-head'>{t('console.ownCommands', {})}</h3>
        </>
      )}
      {own.length === 0 ? (
        <p className='text-sm text-(--mantine-color-dimmed)'>
          {t(site.length > 0 ? 'console.ownEmpty' : 'console.commandsEmpty', {})}
        </p>
      ) : (
        <ul className='zoron-con-commands'>
          {own.map((command) => (
            <li key={command}>
              <CommandRow
                command={command}
                title={reason ?? t('console.sendCommand', { command })}
                disabled={!ready}
                onClick={() => send(command)}
              />
              <ActionIcon
                variant='subtle'
                color='gray'
                size='md'
                aria-label={t('console.removeCommand', { command })}
                onClick={() => void save(commands.filter((saved) => saved !== command))}
              >
                <FontAwesomeIcon icon={faXmark} />
              </ActionIcon>
            </li>
          ))}
        </ul>
      )}
      {reason && site.length + own.length > 0 && <p className='text-xs text-(--mantine-color-dimmed)'>{reason}</p>}
      {commands.length >= MAX_COMMANDS ? (
        <p className='text-xs text-(--mantine-color-dimmed)'>
          {t('console.commandsFull', { count: `${MAX_COMMANDS}` })}
        </p>
      ) : (
        <form onSubmit={add} className='flex gap-2'>
          <TextInput
            className='min-w-0 flex-1'
            value={draft}
            onChange={(event) => setDraft(event.currentTarget.value)}
            placeholder={t('console.commandPlaceholder', {})}
            aria-label={t('console.commandPlaceholder', {})}
            maxLength={MAX_COMMAND}
            classNames={{ input: 'font-mono' }}
          />
          <Button type='submit' variant='default' disabled={next === null}>
            {t('console.addCommand', {})}
          </Button>
        </form>
      )}
    </div>
  );
}
