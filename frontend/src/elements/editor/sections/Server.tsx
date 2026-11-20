import type { SectionProps } from './types.ts';
import { MAX_OVERVIEW_ACTIVITY, MIN_OVERVIEW_ACTIVITY, OVERVIEW_HEADERS, OVERVIEW_USAGE } from '../../../lib/theme.ts';
import { useExtTranslations } from '../../../translations.ts';
import { ChoiceTiles, Group, Setting, SliderField, ToggleField } from '../controls.tsx';
import { OverviewHeaderMock, OverviewUsageMock } from '../mocks.tsx';
import { OverviewArrange } from '../OverviewArrange.tsx';

export function ServerSection({ valid, set }: SectionProps) {
  const { t } = useExtTranslations();
  return (
    <div className='flex flex-col gap-7'>
      <Group title={t('overviewSection.page', {})}>
        <ToggleField
          field='serverOverview'
          label={t('overviewSection.serverOverview', {})}
          description={t('overviewSection.serverOverviewHint', {})}
          checked={valid.serverOverview}
          onChange={(serverOverview) => set({ serverOverview })}
        />
        {!valid.serverOverview && (
          <p className='text-xs text-(--mantine-color-placeholder)'>{t('overviewSection.offHint', {})}</p>
        )}
      </Group>

      {valid.serverOverview && (
        <>
          <Group title={t('overviewSection.arrange', {})} hint={t('overviewSection.arrangeHint', {})}>
            <Setting field='overviewGrid'>
              <OverviewArrange
                look={valid}
                grid={valid.overviewGrid}
                onChange={(overviewGrid) => set({ overviewGrid })}
              />
            </Setting>
          </Group>

          <Group title={t('overviewSection.usageStyle', {})}>
            <ChoiceTiles
              field='overviewUsage'
              columns={3}
              value={valid.overviewUsage}
              onChange={(overviewUsage) => set({ overviewUsage })}
              options={OVERVIEW_USAGE.map((usage) => ({
                value: usage,
                label: t(`overviewSection.${usage}`, {}),
                preview: <OverviewUsageMock look={valid} usage={usage} />,
              }))}
            />
            <SliderField
              field='overviewActivityCount'
              label={t('overviewSection.activityCount', {})}
              value={valid.overviewActivityCount}
              min={MIN_OVERVIEW_ACTIVITY}
              max={MAX_OVERVIEW_ACTIVITY}
              onChange={(overviewActivityCount) => set({ overviewActivityCount })}
            />
          </Group>

          <Group title={t('overviewSection.header', {})}>
            <ChoiceTiles
              field='overviewHeader'
              value={valid.overviewHeader}
              onChange={(overviewHeader) => set({ overviewHeader })}
              options={OVERVIEW_HEADERS.map((header) => ({
                value: header,
                label: t(`overviewSection.${header}`, {}),
                preview: <OverviewHeaderMock look={valid} header={header} />,
              }))}
            />
            <ToggleField
              field='overviewDescription'
              label={t('overviewSection.description', {})}
              description={t('overviewSection.descriptionHint', {})}
              checked={valid.overviewDescription}
              onChange={(overviewDescription) => set({ overviewDescription })}
            />
          </Group>
        </>
      )}
    </div>
  );
}
