import type { SectionProps } from './types.ts';
import { SegmentedControl } from '../../../lib/core.ts';
import { SHADOWS, type Shadow, SURFACES } from '../../../lib/theme.ts';
import { useExtTranslations } from '../../../translations.ts';
import { ChoiceTiles, Group, Setting, SliderField } from '../controls.tsx';
import { SurfaceMock } from '../mocks.tsx';

const SHADOW_LABEL = {
  none: 'surfaces.shadowNone',
  soft: 'surfaces.shadowSoft',
  deep: 'surfaces.shadowDeep',
} as const satisfies Record<Shadow, string>;

export function SurfacesSection({ valid, set }: SectionProps) {
  const { t } = useExtTranslations();
  return (
    <div className='flex flex-col gap-7'>
      <Group title={t('surfaces.material', {})}>
        <ChoiceTiles
          field='surfaceStyle'
          columns={3}
          value={valid.surfaceStyle}
          onChange={(surfaceStyle) => set({ surfaceStyle })}
          options={SURFACES.map((surface) => ({
            value: surface,
            label: t(`surfaces.${surface}`, {}),
            preview: <SurfaceMock look={valid} surface={surface} />,
          }))}
        />
        {valid.surfaceStyle === 'glass' && (
          <>
            <SliderField
              field='surfaceOpacity'
              label={t('surfaces.opacity', {})}
              value={valid.surfaceOpacity}
              min={30}
              max={100}
              unit='%'
              onChange={(surfaceOpacity) => set({ surfaceOpacity })}
            />
            <SliderField
              field='blur'
              label={t('surfaces.blur', {})}
              value={valid.blur}
              min={0}
              max={40}
              unit='px'
              onChange={(blur) => set({ blur })}
            />
          </>
        )}
        <SliderField
          field='borderStrength'
          label={t('surfaces.border', {})}
          value={valid.borderStrength}
          min={0}
          max={100}
          unit='%'
          onChange={(borderStrength) => set({ borderStrength })}
        />
      </Group>

      <Group title={t('surfaces.shadow', {})}>
        <Setting field='shadow'>
          <SegmentedControl
            fullWidth
            value={valid.shadow}
            onChange={(shadow) => set({ shadow: shadow as Shadow })}
            data={SHADOWS.map((shadow) => ({ value: shadow, label: t(SHADOW_LABEL[shadow], {}) }))}
          />
        </Setting>
      </Group>

      <Group title={t('surfaces.corners', {})}>
        <SliderField
          field='radius'
          label={t('surfaces.radius', {})}
          value={valid.radius}
          min={0}
          max={32}
          unit='px'
          onChange={(radius) => set({ radius })}
        />
        <SliderField
          field='controlRadius'
          label={t('surfaces.controlRadius', {})}
          value={valid.controlRadius}
          min={0}
          max={24}
          unit='px'
          onChange={(controlRadius) => set({ controlRadius })}
        />
      </Group>
    </div>
  );
}
