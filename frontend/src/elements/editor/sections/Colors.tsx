import { faArrowRightArrowLeft, faCircleCheck, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { SectionProps } from './types.ts';
import { ActionIcon, Tooltip } from '../../../lib/core.ts';
import { type ContrastIssue, contrastIssues, lightBase } from '../../../lib/theme.ts';
import { useExtTranslations } from '../../../translations.ts';
import { ColorField, Group } from '../controls.tsx';

const PAIR_LABEL = {
  text: 'colors.pairText',
  dimmed: 'colors.pairDimmed',
  accentInk: 'colors.pairAccentInk',
  lightText: 'colors.pairLightText',
} as const satisfies Record<ContrastIssue['pair'], string>;

export function ColorsSection({ draft, valid, set }: SectionProps) {
  const { t } = useExtTranslations();
  const issues = contrastIssues(valid);
  const light = lightBase({ ...valid, lightBackground: '', lightSurface: '', lightText: '' });

  return (
    <div className='flex flex-col gap-7'>
      <div
        className={`flex items-start gap-2.5 rounded-xl border p-3 text-sm ${
          issues.length
            ? 'border-transparent bg-(--mantine-color-yellow-light)'
            : 'border-(--mantine-color-default-border) bg-(--mantine-color-default)'
        }`}
      >
        <FontAwesomeIcon
          icon={issues.length ? faTriangleExclamation : faCircleCheck}
          className={`mt-0.5 ${issues.length ? 'text-(--mantine-color-yellow-light-color)' : 'text-(--mantine-color-green-text)'}`}
        />
        <div className='flex flex-col gap-1'>
          <span className='font-medium'>{t('colors.contrast', {})}</span>
          {issues.length === 0 ? (
            <span className='text-xs text-(--mantine-color-dimmed)'>{t('colors.contrastOk', {})}</span>
          ) : (
            issues.map((issue) => (
              <span key={issue.pair} className='text-xs'>
                {t(PAIR_LABEL[issue.pair], {})}:{' '}
                <span className='text-(--mantine-color-dimmed)'>
                  {t('colors.contrastRatio', { ratio: issue.ratio, min: issue.min })}
                </span>
              </span>
            ))
          )}
        </div>
      </div>

      <Group
        title={t('colors.brand', {})}
        action={
          <Tooltip label={t('colors.swap', {})}>
            <ActionIcon
              variant='subtle'
              color='gray'
              aria-label={t('colors.swap', {})}
              onClick={() => set({ accent: draft.accent2, accent2: draft.accent })}
            >
              <FontAwesomeIcon icon={faArrowRightArrowLeft} />
            </ActionIcon>
          </Tooltip>
        }
      >
        <div
          className='h-2 rounded-full'
          style={{ background: `linear-gradient(90deg,${valid.accent},${valid.accent2})` }}
        />
        <ColorField
          field='accent'
          label={t('colors.accent', {})}
          value={draft.accent}
          onChange={(accent) => set({ accent })}
        />
        <ColorField
          field='accent2'
          label={t('colors.accent2', {})}
          description={t('colors.accent2Hint', {})}
          value={draft.accent2}
          onChange={(accent2) => set({ accent2 })}
        />
      </Group>

      <Group title={t('colors.base', {})}>
        <ColorField
          field='background'
          label={t('colors.background', {})}
          value={draft.background}
          onChange={(background) => set({ background })}
        />
        <ColorField
          field='surface'
          label={t('colors.surface', {})}
          value={draft.surface}
          onChange={(surface) => set({ surface })}
        />
        <ColorField field='text' label={t('colors.text', {})} value={draft.text} onChange={(text) => set({ text })} />
      </Group>

      <Group title={t('colors.status', {})} hint={t('colors.statusHint', {})}>
        <ColorField
          field='success'
          optional
          fallback='#40c057'
          label={t('colors.success', {})}
          value={draft.success}
          onChange={(success) => set({ success })}
        />
        <ColorField
          field='warning'
          optional
          fallback='#fab005'
          label={t('colors.warning', {})}
          value={draft.warning}
          onChange={(warning) => set({ warning })}
        />
        <ColorField
          field='danger'
          optional
          fallback='#fa5252'
          label={t('colors.danger', {})}
          value={draft.danger}
          onChange={(danger) => set({ danger })}
        />
      </Group>

      <Group title={t('colors.light', {})} hint={t('colors.lightHint', {})}>
        <ColorField
          field='lightBackground'
          optional
          fallback={light.background}
          label={t('colors.lightBackground', {})}
          value={draft.lightBackground}
          onChange={(lightBackground) => set({ lightBackground })}
        />
        <ColorField
          field='lightSurface'
          optional
          fallback={light.surface}
          label={t('colors.lightSurface', {})}
          value={draft.lightSurface}
          onChange={(lightSurface) => set({ lightSurface })}
        />
        <ColorField
          field='lightText'
          optional
          fallback={light.text}
          label={t('colors.lightText', {})}
          value={draft.lightText}
          onChange={(lightText) => set({ lightText })}
        />
      </Group>
    </div>
  );
}
