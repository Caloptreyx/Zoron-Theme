import type { SectionProps } from './types.ts';
import { TextInput } from '../../../lib/core.ts';
import { BACKDROPS, PATTERNS, SAFE_URL } from '../../../lib/theme.ts';
import { useExtTranslations } from '../../../translations.ts';
import { ChoiceTiles, Group, Setting, SliderField, ToggleField } from '../controls.tsx';
import { BackdropMock, PatternMock } from '../mocks.tsx';

export function BackdropSection({ draft, valid, set }: SectionProps) {
  const { t } = useExtTranslations();
  const imageInvalid = draft.backgroundImage !== '' && !SAFE_URL.test(draft.backgroundImage);
  return (
    <div className='flex flex-col gap-7'>
      <Group title={t('backdrop.style', {})}>
        <ChoiceTiles
          field='backdrop'
          value={valid.backdrop}
          onChange={(backdrop) => set({ backdrop })}
          options={BACKDROPS.map((backdrop) => ({
            value: backdrop,
            label: t(`backdrop.${backdrop}`, {}),
            preview: <BackdropMock look={valid} backdrop={backdrop} />,
          }))}
        />
        <SliderField
          field='backdropIntensity'
          label={t('backdrop.intensity', {})}
          value={valid.backdropIntensity}
          min={0}
          max={100}
          unit='%'
          onChange={(backdropIntensity) => set({ backdropIntensity })}
        />
        <ToggleField
          field='backdropAnimate'
          label={t('backdrop.animate', {})}
          description={t('backdrop.animateHint', {})}
          checked={valid.backdropAnimate}
          onChange={(backdropAnimate) => set({ backdropAnimate })}
        />
      </Group>

      <Group title={t('backdrop.pattern', {})}>
        <ChoiceTiles
          field='pattern'
          columns={4}
          value={valid.pattern}
          onChange={(pattern) => set({ pattern })}
          options={PATTERNS.map((pattern) => ({
            value: pattern,
            label: t(`backdrop.${pattern}`, {}),
            preview: <PatternMock look={valid} pattern={pattern} />,
          }))}
        />
        <SliderField
          field='patternOpacity'
          label={t('backdrop.patternOpacity', {})}
          value={valid.patternOpacity}
          min={0}
          max={100}
          unit='%'
          onChange={(patternOpacity) => set({ patternOpacity })}
        />
      </Group>

      <Group title={t('backdrop.image', {})} hint={t('backdrop.imageHint', {})}>
        <Setting field='backgroundImage'>
          <TextInput
            placeholder='https://'
            aria-label={t('backdrop.image', {})}
            value={draft.backgroundImage}
            error={imageInvalid ? t('backdrop.imageInvalid', {}) : undefined}
            onChange={(e) => set({ backgroundImage: e.currentTarget.value.trim() })}
          />
        </Setting>
        {valid.backgroundImage && (
          <SliderField
            field='backgroundDim'
            label={t('backdrop.dim', {})}
            value={valid.backgroundDim}
            min={0}
            max={95}
            unit='%'
            onChange={(backgroundDim) => set({ backgroundDim })}
          />
        )}
      </Group>
    </div>
  );
}
