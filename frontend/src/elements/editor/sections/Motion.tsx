import type { SectionProps } from './types.ts';
import { SegmentedControl } from '../../../lib/core.ts';
import { MOTIONS, type Motion, TRANSITIONS } from '../../../lib/theme.ts';
import { useExtTranslations } from '../../../translations.ts';
import { ChoiceTiles, Group, Setting, ToggleField } from '../controls.tsx';
import { TransitionMock } from '../mocks.tsx';

export function MotionSection({ valid, set }: SectionProps) {
  const { t } = useExtTranslations();
  return (
    <div className='flex flex-col gap-7'>
      <Group title={t('motion.level', {})} hint={t('motion.levelHint', {})}>
        <Setting field='motion'>
          <SegmentedControl
            fullWidth
            value={valid.motion}
            onChange={(motion) => set({ motion: motion as Motion })}
            data={MOTIONS.map((motion) => ({ value: motion, label: t(`motion.${motion}`, {}) }))}
          />
        </Setting>
      </Group>
      {valid.motion !== 'none' && (
        <Group title={t('motion.transition', {})}>
          <ChoiceTiles
            field='pageTransition'
            columns={4}
            value={valid.pageTransition}
            onChange={(pageTransition) => set({ pageTransition })}
            options={TRANSITIONS.map((transition) => ({
              value: transition,
              label: t(transition === 'none' ? 'motion.transitionNone' : `motion.${transition}`, {}),
              preview: <TransitionMock look={valid} transition={transition} />,
            }))}
          />
          <ToggleField
            field='hoverLift'
            label={t('motion.lift', {})}
            description={t('motion.liftHint', {})}
            checked={valid.hoverLift}
            onChange={(hoverLift) => set({ hoverLift })}
          />
        </Group>
      )}
      <Group title={t('motion.extras', {})}>
        <ToggleField
          field='greeting'
          label={t('motion.greeting', {})}
          description={t('motion.greetingHint', {})}
          checked={valid.greeting}
          onChange={(greeting) => set({ greeting })}
        />
      </Group>
    </div>
  );
}
