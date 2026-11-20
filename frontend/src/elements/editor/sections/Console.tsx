import { faArrowDown, faArrowUp, faPlus, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useState } from 'react';
import type { SectionProps } from './types.ts';
import { ActionIcon, Button, SegmentedControl, TextInput } from '../../../lib/core.ts';
import {
  CONSOLE_GRAPHS,
  CONSOLE_METRICS,
  type ConsoleGraph,
  DENSITIES,
  type Density,
  MAX_SITE_COMMAND,
  MAX_SITE_COMMANDS,
  siteCommand,
  TERMINAL_SCHEME_GROUPS,
  TERMINAL_SKINS,
  terminalPalette,
} from '../../../lib/theme.ts';
import { useExtTranslations } from '../../../translations.ts';
import { ConsoleArrange, METRIC_LABEL } from '../ConsoleArrange.tsx';
import { ChoiceTiles, Group, Setting, SliderField, ToggleChips, ToggleField } from '../controls.tsx';
import { ConsoleGraphMock, TerminalMock, TerminalSkinMock } from '../mocks.tsx';

const GRAPH_LABEL = {
  area: 'consoleSection.graphArea',
  line: 'consoleSection.graphLine',
  bars: 'consoleSection.graphBars',
  none: 'consoleSection.graphNone',
} as const satisfies Record<ConsoleGraph, string>;

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

export function ConsoleSection({ valid, set }: SectionProps) {
  const { t } = useExtTranslations();
  const palette = terminalPalette(valid, true);
  return (
    <div className='flex flex-col gap-7'>
      <Group title={t('consoleSection.page', {})}>
        <ToggleField
          field='consolePage'
          label={t('consoleSection.consolePage', {})}
          description={t('consoleSection.consolePageHint', {})}
          checked={valid.consolePage}
          onChange={(consolePage) => set({ consolePage })}
        />
        {valid.consolePage && (
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
        )}
      </Group>

      {/* the rest of Zoron's own page; core's console has none of it */}
      {valid.consolePage && (
        <>
          <Group title={t('consoleSection.arrange', {})} hint={t('consoleSection.arrangeHint', {})}>
            <ConsoleArrange valid={valid} set={set} />
          </Group>

          <Group title={t('consoleSection.commandBar', {})} hint={t('consoleSection.metricsHint', {})}>
            {/* the canvas above orders the figures; switching one on here adds it at the end */}
            <ToggleChips
              field='consoleMetrics'
              label={t('consoleSection.metrics', {})}
              value={valid.consoleMetrics}
              keepOrder
              onChange={(consoleMetrics) => set({ consoleMetrics })}
              options={CONSOLE_METRICS.map((metric) => ({ value: metric, label: t(METRIC_LABEL[metric], {}) }))}
            />
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
          </Group>

          {/* the canvas above places the inspector or hides it */}
          {valid.consoleInspector !== 'off' && (
            <Group title={t('consoleSection.inspector', {})} hint={t('consoleSection.inspectorHint', {})}>
              <ToggleField
                field='consoleInspectorOpen'
                label={t('consoleSection.inspectorOpen', {})}
                description={t('consoleSection.inspectorOpenHint', {})}
                checked={valid.consoleInspectorOpen}
                onChange={(consoleInspectorOpen) => set({ consoleInspectorOpen })}
              />
            </Group>
          )}

          <Group title={t('consoleSection.quickCommands', {})}>
            <ToggleField
              field='consoleQuickCommands'
              label={t('consoleSection.quickCommandsToggle', {})}
              description={t('consoleSection.quickCommandsHint', {})}
              checked={valid.consoleQuickCommands}
              onChange={(consoleQuickCommands) => set({ consoleQuickCommands })}
            />
            {valid.consoleQuickCommands && <SiteCommands valid={valid} set={set} />}
          </Group>
        </>
      )}

      <Group title={t('consoleSection.scheme', {})} hint={t('consoleSection.schemeHint', {})}>
        {TERMINAL_SCHEME_GROUPS.map((group) => (
          <ChoiceTiles
            key={group.id}
            field='terminalScheme'
            label={t(`consoleSection.${group.id}`, {})}
            columns={3}
            value={valid.terminalScheme}
            onChange={(terminalScheme) => set({ terminalScheme })}
            options={group.schemes.map((scheme) => ({
              value: scheme,
              label: t(`consoleSection.${scheme}`, {}),
              // drawn in dark mode, like every other drawing
              preview: (
                <TerminalMock look={valid} palette={terminalPalette({ ...valid, terminalScheme: scheme }, true)} />
              ),
            }))}
          />
        ))}
      </Group>

      <Group title={t('consoleSection.frame', {})} hint={t('consoleSection.frameHint', {})}>
        <ChoiceTiles
          field='terminalSkin'
          columns={3}
          value={valid.terminalSkin}
          onChange={(terminalSkin) => set({ terminalSkin })}
          options={TERMINAL_SKINS.map((skin) => ({
            value: skin,
            label: t(`consoleSection.${skin}`, {}),
            preview: (
              <TerminalSkinMock
                look={valid}
                palette={terminalPalette(valid, true)}
                scheme={valid.terminalScheme}
                skin={skin}
              />
            ),
          }))}
        />
      </Group>

      <Group title={t('consoleSection.choice', {})}>
        <ToggleField
          field='terminalUserChoice'
          label={t('consoleSection.userChoice', {})}
          description={t('consoleSection.userChoiceHint', {})}
          checked={valid.terminalUserChoice}
          onChange={(terminalUserChoice) => set({ terminalUserChoice })}
        />
      </Group>

      <Group title={t('consoleSection.text', {})} hint={t('consoleSection.textHint', {})}>
        <SliderField
          field='terminalLineHeight'
          label={t('consoleSection.lineHeight', {})}
          value={valid.terminalLineHeight}
          min={100}
          max={180}
          step={5}
          format={(value) => String(value / 100)}
          onChange={(terminalLineHeight) => set({ terminalLineHeight })}
        />
        <ToggleField
          field='consoleHighlight'
          label={t('consoleSection.highlight', {})}
          description={t('consoleSection.highlightHint', {})}
          checked={valid.consoleHighlight}
          onChange={(consoleHighlight) => set({ consoleHighlight })}
        />
      </Group>
    </div>
  );
}
