import type { SectionProps } from './types.ts';
import { TERMINAL_SCHEME_GROUPS, TERMINAL_SKINS, terminalPalette } from '../../../lib/theme.ts';
import { useExtTranslations } from '../../../translations.ts';
import { ChoiceTiles, Group, SliderField, ToggleField } from '../controls.tsx';
import { TerminalMock, TerminalSkinMock } from '../mocks.tsx';

/**
 * Studio's Terminal tab: how every console looks (Zoron's page, the panel's console and its pop-out): the colours,
 * the frame, whether visitors may pick their own, the line height and log highlighting. Where things sit is the
 * Server page tab's.
 */
export function TerminalSection({ valid, set }: SectionProps) {
  const { t } = useExtTranslations();
  return (
    <div className='flex flex-col gap-7'>
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
