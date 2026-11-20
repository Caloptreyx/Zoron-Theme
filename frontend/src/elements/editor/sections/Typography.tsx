import type { SectionProps } from './types.ts';
import { SegmentedControl } from '../../../lib/core.ts';
import { FONTS, MONO_FONTS, type MonoFont } from '../../../lib/theme.ts';
import { useExtTranslations } from '../../../translations.ts';
import { ChoiceTiles, Group, Setting, SliderField, ToggleField } from '../controls.tsx';
import { FontMock } from '../mocks.tsx';

export function TypographySection({ valid, set }: SectionProps) {
  const { t } = useExtTranslations();
  const fontTiles = FONTS.map((font) => ({
    value: font,
    label: t(`typography.${font}`, {}),
    preview: <FontMock look={valid} font={font} />,
  }));
  return (
    <div className='flex flex-col gap-7'>
      <Group title={t('typography.body', {})}>
        <ChoiceTiles
          field='font'
          columns={3}
          value={valid.font}
          onChange={(font) => set({ font })}
          options={fontTiles}
        />
      </Group>
      <Group title={t('typography.headings', {})}>
        <ChoiceTiles
          field='headingFont'
          columns={3}
          value={valid.headingFont}
          onChange={(headingFont) => set({ headingFont })}
          options={fontTiles}
        />
        <SliderField
          field='headingWeight'
          label={t('typography.weight', {})}
          value={valid.headingWeight}
          min={400}
          max={800}
          step={50}
          onChange={(headingWeight) => set({ headingWeight })}
        />
        <ToggleField
          field='gradientTitles'
          label={t('typography.gradientTitles', {})}
          description={t('typography.gradientTitlesHint', {})}
          checked={valid.gradientTitles}
          onChange={(gradientTitles) => set({ gradientTitles })}
        />
      </Group>
      <Group title={t('typography.mono', {})}>
        <Setting field='monoFont'>
          <SegmentedControl
            fullWidth
            value={valid.monoFont}
            onChange={(monoFont) => set({ monoFont: monoFont as MonoFont })}
            data={MONO_FONTS.map((font) => ({ value: font, label: t(`typography.${font}`, {}) }))}
          />
        </Setting>
      </Group>
    </div>
  );
}
