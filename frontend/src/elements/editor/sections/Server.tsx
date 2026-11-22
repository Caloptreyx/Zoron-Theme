import { faArrowDown, faArrowUp, faChevronRight, faPlus, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useState } from 'react';
import type { SectionProps } from './types.ts';
import { ActionIcon, Button, SegmentedControl, TextInput } from '../../../lib/core.ts';
import {
  CONSOLE_GRAPHS,
  CONSOLE_LAYOUTS,
  CONSOLE_METRICS,
  type ConsoleGraph,
  type ConsoleLayout,
  type ConsoleMetric,
  consoleLayoutOf,
  consoleLayoutPatch,
  DENSITIES,
  DETAILS_OPEN,
  type Density,
  type DetailsOpen,
  MAX_OVERVIEW_ACTIVITY,
  MAX_SITE_COMMAND,
  MAX_SITE_COMMANDS,
  MIN_OVERVIEW_ACTIVITY,
  OVERVIEW_HEADERS,
  OVERVIEW_TEMPLATES,
  OVERVIEW_USAGE,
  type OverviewItem,
  type OverviewTemplate,
  siteCommand,
  terminalPalette,
  type ZoronTheme,
} from '../../../lib/theme.ts';
import { useExtTranslations } from '../../../translations.ts';
import { placeBarItem } from '../../console/console.ts';
import { ConsoleArrange, METRIC_LABEL } from '../ConsoleArrange.tsx';
import { ChoiceTiles, Group, Setting, SliderField, ToggleChips, ToggleField } from '../controls.tsx';
import {
  ConsoleGraphMock,
  ConsoleLayoutMock,
  OverviewHeaderMock,
  OverviewLayoutMock,
  OverviewUsageMock,
} from '../mocks.tsx';
import { OverviewArrange, templateGrid, templateOf } from '../OverviewArrange.tsx';

const GRAPH_LABEL = {
  area: 'consoleSection.graphArea',
  line: 'consoleSection.graphLine',
  bars: 'consoleSection.graphBars',
  none: 'consoleSection.graphNone',
} as const satisfies Record<ConsoleGraph, string>;

const DETAILS_LABEL = {
  wide: 'consoleSection.detailsWide',
  always: 'consoleSection.detailsAlways',
  asked: 'consoleSection.detailsAsked',
} as const satisfies Record<DetailsOpen, string>;

/** The overview's grid and the flag that keeps the extensions block in step with it. */
const gridPatch = (overviewGrid: OverviewItem[]): Partial<ZoronTheme> => ({
  overviewGrid,
  overviewExtensions: overviewGrid.some((item) => item.block === 'extensions'),
});

/**
 * The quick commands every console user gets (`consoleCommands`): added with Enter or the button, removed, moved up
 * and down; the same limits normalizeTheme() keeps (siteCommand(), no repeats, at most MAX_SITE_COMMANDS).
 */
function SiteCommands({ valid, set }: Omit<SectionProps, 'draft'>) {
  const { t } = useExtTranslations();
  const [raw, setRaw] = useState('');
  const commands = valid.consoleCommands;
  const command = siteCommand(raw);
  const taken = command !== null && commands.includes(command);
  const full = commands.length >= MAX_SITE_COMMANDS;
  const swap = (from: number, to: number) => {
    const next = [...commands];
    [next[from], next[to]] = [next[to], next[from]];
    set({ consoleCommands: next });
  };

  return (
    <Setting field='consoleCommands'>
      <div className='flex flex-col gap-2'>
        <div className='flex items-center justify-between gap-2 text-sm'>
          <span>{t('consoleSection.siteCommands', {})}</span>
          <span className='rounded-md bg-(--mantine-color-default) px-1.5 py-0.5 font-mono text-xs tabular-nums text-(--mantine-color-dimmed)'>
            {t('consoleSection.siteCommandsCount', { count: commands.length, max: MAX_SITE_COMMANDS })}
          </span>
        </div>
        <p className='text-xs text-(--mantine-color-dimmed)'>{t('consoleSection.siteCommandsHint', {})}</p>
        {commands.length > 0 && (
          <ul className='flex flex-col gap-1'>
            {commands.map((item, i) => (
              <li
                key={item}
                className='flex items-center gap-0.5 rounded-lg border border-(--mantine-color-default-border) bg-(--mantine-color-default) py-0.5 pr-0.5 pl-2.5'
              >
                <span className='min-w-0 flex-1 truncate font-mono text-xs' title={item}>
                  {item}
                </span>
                <ActionIcon
                  size='sm'
                  variant='subtle'
                  color='gray'
                  disabled={i === 0}
                  aria-label={t('consoleSection.moveUp', { command: item })}
                  onClick={() => swap(i, i - 1)}
                >
                  <FontAwesomeIcon icon={faArrowUp} />
                </ActionIcon>
                <ActionIcon
                  size='sm'
                  variant='subtle'
                  color='gray'
                  disabled={i === commands.length - 1}
                  aria-label={t('consoleSection.moveDown', { command: item })}
                  onClick={() => swap(i, i + 1)}
                >
                  <FontAwesomeIcon icon={faArrowDown} />
                </ActionIcon>
                <ActionIcon
                  size='sm'
                  variant='subtle'
                  color='gray'
                  aria-label={t('consoleSection.removeSiteCommand', { command: item })}
                  onClick={() => set({ consoleCommands: commands.filter((other) => other !== item) })}
                >
                  <FontAwesomeIcon icon={faXmark} />
                </ActionIcon>
              </li>
            ))}
          </ul>
        )}
        <form
          className='flex items-start gap-2'
          onSubmit={(event) => {
            event.preventDefault();
            if (!command || taken || full) return;
            set({ consoleCommands: [...commands, command] });
            setRaw('');
          }}
        >
          <TextInput
            size='xs'
            className='flex-1'
            classNames={{ input: 'font-mono' }}
            placeholder={t('consoleSection.siteCommandPlaceholder', {})}
            aria-label={t('consoleSection.siteCommandPlaceholder', {})}
            value={raw}
            maxLength={MAX_SITE_COMMAND}
            disabled={full}
            onChange={(event) => setRaw(event.currentTarget.value)}
            error={taken ? t('consoleSection.siteCommandTaken', {}) : undefined}
          />
          <Button
            type='submit'
            size='xs'
            variant='default'
            disabled={!command || taken || full}
            leftSection={<FontAwesomeIcon icon={faPlus} />}
          >
            {t('consoleSection.addSiteCommand', {})}
          </Button>
        </form>
        {full && (
          <p className='text-xs text-(--mantine-color-dimmed)'>
            {t('consoleSection.siteCommandsFull', { max: MAX_SITE_COMMANDS })}
          </p>
        )}
      </div>
    </Setting>
  );
}

/**
 * Studio's Server page tab: how a server's two pages are laid out. First the page a server opens on, then ready made
 * layouts for the console and the overview (tiles that write the fields Customize edits, never stored as a name; a
 * theme that matches none reads as Custom) and when the console's details panel opens; then Customize, a disclosure
 * holding every single setting those layouts set: the arrange canvases, the figures, the spacing, the commands for
 * everyone. The settings search opens it when it picks a setting inside (ThemeEditor).
 */
export function ServerSection({ valid, set }: SectionProps) {
  const { t } = useExtTranslations();
  const palette = terminalPalette(valid, true);
  const consoleLayout = consoleLayoutOf(valid);
  const overviewLayout = templateOf(valid.overviewGrid);
  const panel = valid.consolePage && valid.consoleInspector !== 'off';

  // an empty pick is a hidden Figures piece; picking one again from none puts the piece back before power
  const setMetrics = (consoleMetrics: ConsoleMetric[]) => {
    if (consoleMetrics.length === 0) {
      set({ consoleMetrics, ...placeBarItem(valid, 'metrics', null) });
    } else if (valid.consoleMetrics.length === 0) {
      const power = valid.consoleBar.indexOf('power');
      const at = power === -1 ? valid.consoleBar.length : power;
      set({ consoleMetrics, ...placeBarItem(valid, 'metrics', 'bar', at) });
    } else {
      set({ consoleMetrics });
    }
  };

  return (
    <div className='flex flex-col gap-7'>
      <Group title={t('overviewSection.opensOn', {})} hint={t('overviewSection.opensOnHint', {})}>
        <Setting field='serverOverview'>
          <SegmentedControl
            fullWidth
            value={valid.serverOverview ? 'overview' : 'console'}
            onChange={(page) => set({ serverOverview: page === 'overview' })}
            data={[
              { value: 'overview', label: t('overviewSection.overview', {}) },
              { value: 'console', label: t('overviewSection.console', {}) },
            ]}
          />
        </Setting>
      </Group>

      <Group title={t('consoleSection.layout', {})} hint={t('consoleSection.layoutHint', {})}>
        {valid.consolePage ? (
          <ChoiceTiles<ConsoleLayout | 'custom'>
            columns={consoleLayout ? 2 : 3}
            value={consoleLayout ?? 'custom'}
            onChange={(layout) => {
              if (layout !== 'custom') set(consoleLayoutPatch(valid, layout));
            }}
            options={[
              ...CONSOLE_LAYOUTS.map((layout) => ({
                value: layout,
                label: t(`consoleSection.${layout}`, {}),
                preview: <ConsoleLayoutMock look={valid} layout={{ ...valid, ...consoleLayoutPatch(valid, layout) }} />,
              })),
              ...(consoleLayout
                ? []
                : [
                    {
                      value: 'custom' as const,
                      label: t('consoleSection.custom', {}),
                      preview: <ConsoleLayoutMock look={valid} layout={valid} />,
                    },
                  ]),
            ]}
          />
        ) : (
          <p className='text-xs text-(--mantine-color-placeholder)'>{t('consoleSection.coreConsole', {})}</p>
        )}
      </Group>

      {panel && (
        <Group title={t('consoleSection.inspector', {})} hint={t('consoleSection.inspectorHint', {})}>
          <Setting field='consoleDetailsOpen'>
            <div className='flex flex-col gap-1.5'>
              <span className='text-sm'>{t('consoleSection.detailsOpen', {})}</span>
              <SegmentedControl
                fullWidth
                value={valid.consoleDetailsOpen}
                onChange={(open) => set({ consoleDetailsOpen: open as DetailsOpen })}
                data={DETAILS_OPEN.map((open) => ({ value: open, label: t(DETAILS_LABEL[open], {}) }))}
              />
              <p className='text-xs text-(--mantine-color-dimmed)'>{t('consoleSection.detailsOpenHint', {})}</p>
            </div>
          </Setting>
        </Group>
      )}

      {valid.serverOverview && (
        <Group title={t('overviewSection.layout', {})}>
          <ChoiceTiles<OverviewTemplate | 'custom'>
            columns={overviewLayout ? 3 : 4}
            value={overviewLayout ?? 'custom'}
            onChange={(template) => {
              if (template !== 'custom') set(gridPatch(templateGrid(valid.overviewGrid, template)));
            }}
            options={[
              ...OVERVIEW_TEMPLATES.map((template) => ({
                value: template,
                label: t(`overviewSection.${template}`, {}),
                preview: <OverviewLayoutMock look={valid} grid={templateGrid(valid.overviewGrid, template)} />,
              })),
              ...(overviewLayout
                ? []
                : [
                    {
                      value: 'custom' as const,
                      label: t('overviewSection.custom', {}),
                      preview: <OverviewLayoutMock look={valid} grid={valid.overviewGrid} />,
                    },
                  ]),
            ]}
          />
          <ChoiceTiles
            field='overviewUsage'
            label={t('overviewSection.usageStyle', {})}
            columns={3}
            value={valid.overviewUsage}
            onChange={(overviewUsage) => set({ overviewUsage })}
            options={OVERVIEW_USAGE.map((usage) => ({
              value: usage,
              label: t(`overviewSection.${usage}`, {}),
              preview: <OverviewUsageMock look={valid} usage={usage} />,
            }))}
          />
          <ChoiceTiles
            field='overviewHeader'
            label={t('overviewSection.header', {})}
            value={valid.overviewHeader}
            onChange={(overviewHeader) => set({ overviewHeader })}
            options={OVERVIEW_HEADERS.map((header) => ({
              value: header,
              label: t(`overviewSection.${header}`, {}),
              preview: <OverviewHeaderMock look={valid} header={header} />,
            }))}
          />
        </Group>
      )}

      <details className='zoron-customize group/customize flex flex-col'>
        <summary className='flex cursor-pointer list-none items-start gap-2 rounded-lg py-1 select-none [&::-webkit-details-marker]:hidden'>
          <FontAwesomeIcon
            icon={faChevronRight}
            className='mt-1 text-[0.625rem] text-(--mantine-color-dimmed) transition-transform duration-150 group-open/customize:rotate-90'
          />
          <span className='min-w-0'>
            <span className='block text-[0.6875rem] font-semibold uppercase tracking-[0.09em] text-(--mantine-color-dimmed)'>
              {t('consoleSection.customize', {})}
            </span>
            <span className='mt-0.5 block text-xs text-(--mantine-color-placeholder)'>
              {t('consoleSection.customizeHint', {})}
            </span>
          </span>
        </summary>

        <div className='mt-5 flex flex-col gap-7'>
          <Group title={t('consoleSection.console', {})}>
            <ToggleField
              field='consolePage'
              label={t('consoleSection.consolePage', {})}
              description={t('consoleSection.consolePageHint', {})}
              checked={valid.consolePage}
              onChange={(consolePage) => set({ consolePage })}
            />
            {valid.consolePage && (
              <>
                <Setting field='consoleDensity'>
                  <div className='flex flex-col gap-1.5'>
                    <span className='text-sm'>{t('consoleSection.density', {})}</span>
                    <SegmentedControl
                      fullWidth
                      value={valid.consoleDensity}
                      onChange={(density) => set({ consoleDensity: density as Density })}
                      data={DENSITIES.map((density) => ({ value: density, label: t(`layout.${density}`, {}) }))}
                    />
                  </div>
                </Setting>
                <div className='flex flex-col gap-1.5'>
                  <span className='text-sm'>{t('consoleSection.arrange', {})}</span>
                  <p className='text-xs text-(--mantine-color-dimmed)'>{t('consoleSection.arrangeHint', {})}</p>
                  <ConsoleArrange valid={valid} set={set} />
                </div>
                {/* the canvas above orders the figures; switching one on here adds it at the end */}
                <ToggleChips
                  field='consoleMetrics'
                  label={t('consoleSection.metrics', {})}
                  value={valid.consoleMetrics}
                  keepOrder
                  onChange={setMetrics}
                  options={CONSOLE_METRICS.map((metric) => ({ value: metric, label: t(METRIC_LABEL[metric], {}) }))}
                />
                <p className='-mt-1 text-xs text-(--mantine-color-dimmed)'>{t('consoleSection.metricsHint', {})}</p>
                <ChoiceTiles
                  field='consoleGraphs'
                  label={t('consoleSection.graphs', {})}
                  columns={4}
                  value={valid.consoleGraphs}
                  onChange={(consoleGraphs) => set({ consoleGraphs })}
                  options={CONSOLE_GRAPHS.map((graph) => ({
                    value: graph,
                    label: t(GRAPH_LABEL[graph], {}),
                    preview: <ConsoleGraphMock look={valid} palette={palette} graph={graph} />,
                  }))}
                />
                {valid.consoleChips !== 'off' && <SiteCommands valid={valid} set={set} />}
              </>
            )}
          </Group>

          {valid.serverOverview && (
            <Group title={t('overviewSection.overview', {})} hint={t('overviewSection.arrangeHint', {})}>
              <Setting field='overviewGrid'>
                <OverviewArrange grid={valid.overviewGrid} onChange={(grid) => set(gridPatch(grid))} />
              </Setting>
              <SliderField
                field='overviewActivityCount'
                label={t('overviewSection.activityCount', {})}
                value={valid.overviewActivityCount}
                min={MIN_OVERVIEW_ACTIVITY}
                max={MAX_OVERVIEW_ACTIVITY}
                onChange={(overviewActivityCount) => set({ overviewActivityCount })}
              />
              <ToggleField
                field='overviewDescription'
                label={t('overviewSection.description', {})}
                description={t('overviewSection.descriptionHint', {})}
                checked={valid.overviewDescription}
                onChange={(overviewDescription) => set({ overviewDescription })}
              />
            </Group>
          )}
        </div>
      </details>
    </div>
  );
}
