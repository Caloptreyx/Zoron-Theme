/**
 * The console page's small rules: saved quick commands, the downloaded log's name and text, and its bars (which
 * pieces each holds, where the inspector toggle goes, their grids). Pure, so the tests can run it without the panel.
 */

import type { ConsoleBarItem, ConsoleMetric, ZoronTheme } from '../../lib/theme.ts';
import { UUID } from '../../lib/tiles.ts';

/**
 * The user setting (core's user settings, account scope) holding each user's own quick commands: a map of server
 * uuid to that server's list, so they follow the user to every browser.
 */
export const COMMANDS_KEY = 'zoron::quick_commands';
/** Where a browser kept a server's commands before they moved to the account, as a JSON array of strings. */
export const legacyCommandsKey = (serverUuid: string) => `zoron:commands:${serverUuid}`;
export const MAX_COMMANDS = 20;
export const MAX_COMMAND = 200;
/** Servers the map keeps at most; saving one more drops the one edited longest ago. */
export const MAX_COMMAND_SERVERS = 100;

/** Every user's own commands, by server uuid; a server without any is not in it. */
export type ServerCommands = Readonly<Record<string, string[]>>;

/** A command as saved: trimmed, one line, at most MAX_COMMAND characters; null when that leaves nothing valid. */
export function commandOf(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const command = input.trim();
  // oxlint-disable-next-line no-control-regex -- a command is one line of printable text
  if (!command || command.length > MAX_COMMAND || /[\u0000-\u001f\u007f]/.test(command)) return null;
  return command;
}

/** A saved list, whatever it holds: valid commands only, no repeats, at most MAX_COMMANDS, in its order. */
export function commandList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const commands: string[] = [];
  for (const item of value) {
    const command = commandOf(item);
    if (command && !commands.includes(command)) commands.push(command);
    if (commands.length === MAX_COMMANDS) break;
  }
  return commands;
}

/** A browser's old list (`legacyCommandsKey`), whatever is in storage. */
export function parseCommands(raw: string | null): string[] {
  try {
    return commandList(raw ? JSON.parse(raw) : []);
  } catch {
    return [];
  }
}

/**
 * The saved map as it comes back from the API (any JSON): uuid keys (lower cased, each once), valid lists, none
 * empty, at most MAX_COMMAND_SERVERS servers.
 */
export function normalizeCommandMap(raw: unknown): ServerCommands {
  const map: Record<string, string[]> = {};
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return map;
  let count = 0;
  for (const [key, value] of Object.entries(raw)) {
    if (count >= MAX_COMMAND_SERVERS) break;
    const uuid = key.toLowerCase();
    const list = commandList(value);
    if (!UUID.test(uuid) || Object.hasOwn(map, uuid) || list.length === 0) continue;
    map[uuid] = list;
    count++;
  }
  return map;
}

/**
 * The map with one server's list replaced (an empty list removes it). The edited server moves to the end, so when
 * the map is full the server edited longest ago is the one dropped.
 */
export function withServerCommands(map: ServerCommands, uuid: string, list: readonly string[]): ServerCommands {
  const key = uuid.toLowerCase();
  const commands = commandList(list);
  const rest = Object.entries(map).filter(([other]) => other !== key);
  const entries = commands.length > 0 && UUID.test(key) ? [...rest, [key, commands] as const] : rest;
  return Object.fromEntries(entries.slice(Math.max(0, entries.length - MAX_COMMAND_SERVERS)));
}

/** `list` with `input` added at the end; null when it is invalid, already there, or the list is full. */
export function withCommand(list: readonly string[], input: string): string[] | null {
  const command = commandOf(input);
  if (!command || list.includes(command) || list.length >= MAX_COMMANDS) return null;
  return [...list, command];
}

const pad = (n: number) => String(n).padStart(2, '0');

/** `<server name>-<local date and time>.log`, the name stripped of what file systems refuse. */
export function logFileName(serverName: string, date: Date): string {
  const name =
    serverName
      // oxlint-disable-next-line no-control-regex -- control characters are what it removes
      .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]+/g, ' ')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/^\.+/, '')
      .slice(0, 80) || 'console';
  const stamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
  return `${name}-${stamp}.log`;
}

/** A terminal buffer line as plain text, and whether it continues the line before it (soft wrapped). */
export interface BufferLine {
  text: string;
  wrapped: boolean;
}

/** The buffer as a log: wrapped rows joined back into their line, trailing blank lines dropped. */
export function bufferText(lines: readonly BufferLine[]): string {
  const out: string[] = [];
  for (const { text, wrapped } of lines) {
    if (wrapped && out.length > 0) out[out.length - 1] += text;
    else out.push(text);
  }
  while (out.length > 0 && out[out.length - 1].trim() === '') out.pop();
  return out.length > 0 ? `${out.join('\n')}\n` : '';
}

type Bars = Pick<ZoronTheme, 'consoleBar' | 'consoleFooter'>;

/** `list` with `item` at `index`, counted in the list without it (clamped): moved there, or added. */
export function placed<T>(list: readonly T[], item: T, index: number): T[] {
  const rest = list.filter((other) => other !== item);
  const at = Math.max(0, Math.min(index, rest.length));
  return [...rest.slice(0, at), item, ...rest.slice(at)];
}

/**
 * Both bars with `item` in the top one (`'bar'`), the bottom one (`'footer'`) at `index`, or in neither (`null`,
 * hidden); a piece is only ever in one bar.
 */
export function placeBarItem(bars: Bars, item: ConsoleBarItem, place: 'bar' | 'footer' | null, index = 0): Bars {
  const consoleBar = bars.consoleBar.filter((other) => other !== item);
  const consoleFooter = bars.consoleFooter.filter((other) => other !== item);
  if (place === 'bar') return { consoleBar: placed(consoleBar, item, index), consoleFooter };
  if (place === 'footer') return { consoleBar, consoleFooter: placed(consoleFooter, item, index) };
  return { consoleBar, consoleFooter };
}

/** The bar pieces that draw something: the figures only while some are picked (none leaves the telemetry out). */
export function shownBarItems(items: readonly ConsoleBarItem[], metrics: readonly ConsoleMetric[]): ConsoleBarItem[] {
  return items.filter((item) => item !== 'metrics' || metrics.length > 0);
}

/**
 * The bar the inspector toggle ends (the shown pieces of each): the top one, unless it is empty and the bottom one is
 * not; with both empty it is the top bar's only piece. None with the inspector off.
 */
export function toggleBar(
  top: readonly ConsoleBarItem[],
  bottom: readonly ConsoleBarItem[],
  inspector: boolean,
): 'top' | 'bottom' | null {
  if (!inspector) return null;
  return top.length === 0 && bottom.length > 0 ? 'bottom' : 'top';
}

/** A bar's grid at one size: the `grid-template-areas` and `grid-template-columns` values. */
export interface BarGrid {
  areas: string;
  columns: string;
}

/**
 * A bar's grid at each size: `wide` (one row), `narrow` (the workspace under 60rem: the figures on a row of their own
 * under the rest) and `phone` (one row per piece).
 */
export interface BarLayout {
  wide: BarGrid;
  narrow: BarGrid;
  phone: BarGrid;
}

type BarCell = ConsoleBarItem | 'toggle';

/** Each piece's grid area: fixed names, so the strings built of them are safe in inline custom properties. */
const AREA: Record<BarCell, string> = { identity: 'id', metrics: 'meters', power: 'power', toggle: 'toggle' };

/**
 * One row of cells: identity as wide as it needs beside the figures, which take the rest, and the rest itself without
 * them; with neither, an empty flexible column leads, so power and the toggle still end the row.
 */
function barRow(cells: readonly BarCell[]): { names: string[]; columns: string[] } {
  const metrics = cells.includes('metrics');
  const names: string[] = [];
  const columns: string[] = [];
  if (!metrics && !cells.includes('identity')) {
    names.push('.');
    columns.push('minmax(0, 1fr)');
  }
  for (const cell of cells) {
    names.push(AREA[cell]);
    if (cell === 'identity') columns.push(metrics ? 'minmax(0, auto)' : 'minmax(0, 1fr)');
    else columns.push(cell === 'metrics' ? 'minmax(0, 1fr)' : 'auto');
  }
  return { names, columns };
}

/**
 * A grid of rows of area names, with `dots` an extra column first: the window frame's dots in the first row, the
 * cell beside them stretched across it in the others.
 */
function barGrid(rows: readonly string[][], columns: readonly string[], dots: boolean): BarGrid {
  const named = dots ? rows.map((row, i) => [i === 0 ? 'dots' : row[0], ...row]) : rows;
  return {
    areas: named.map((row) => `"${row.join(' ')}"`).join(' '),
    columns: (dots ? ['auto', ...columns] : columns).join(' '),
  };
}

const NO_GRID: BarGrid = { areas: 'none', columns: 'none' };

/**
 * The grid of a bar holding `items` (the shown ones, in order) and, with `toggle`, the inspector toggle at its end.
 * Wide: one row in that order. Narrow: the figures move to a row of their own under the others, spanning it. Phone:
 * a row per piece in order, the toggle beside identity (or on a row of its own after the others without it), power
 * and the figures (last, as narrow) full width. `dots` adds the window frame's column of dots (the top bar's).
 */
export function barLayout(items: readonly ConsoleBarItem[], toggle: boolean, dots = false): BarLayout {
  const cells: BarCell[] = toggle ? [...items, 'toggle'] : [...items];
  if (cells.length === 0) return { wide: NO_GRID, narrow: NO_GRID, phone: NO_GRID };

  const row = barRow(cells);
  const wide = barGrid([row.names], row.columns, dots);

  let narrow = wide;
  if (items.includes('metrics')) {
    const others = cells.filter((cell) => cell !== 'metrics');
    const rest = barRow(others);
    narrow =
      others.length === 0
        ? barGrid([['meters']], ['minmax(0, 1fr)'], dots)
        : barGrid([rest.names, rest.names.map(() => 'meters')], rest.columns, dots);
  }

  const rows: string[][] = [];
  for (const item of items) {
    if (item === 'identity') rows.push(toggle ? ['id', 'toggle'] : ['id']);
    else if (item === 'power') rows.push(toggle ? ['power', 'power'] : ['power']);
  }
  if (toggle && !items.includes('identity')) rows.push(['.', 'toggle']);
  if (items.includes('metrics')) rows.push(toggle ? ['meters', 'meters'] : ['meters']);
  const phone = barGrid(rows, toggle ? ['minmax(0, 1fr)', 'auto'] : ['minmax(0, 1fr)'], dots);

  return { wide, narrow, phone };
}
