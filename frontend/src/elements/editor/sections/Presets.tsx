import { faEllipsis, faPen, faPlus, faShuffle, faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Slider } from '@mantine/core';
import { type CSSProperties, useState } from 'react';
import type { SectionProps } from './types.ts';
import { hsl } from '../../../lib/color.ts';
import { ActionIcon, Button, Menu, Modal, ModalFooter, TextInput } from '../../../lib/core.ts';
import {
  applyPreset,
  type CustomPreset,
  generatePalette,
  LOOK_KEYS,
  MAX_CUSTOM_PRESETS,
  MAX_PRESET_NAME,
  PRESETS,
  type PresetLook,
  pickLook,
  presetName,
} from '../../../lib/theme.ts';
import { useExtTranslations } from '../../../translations.ts';
import { Group, Setting } from '../controls.tsx';
import { PresetMock } from '../mocks.tsx';

/** A preset's drawing and name; picking it lays its look over the draft, and it reads as picked while it matches. */
function PresetTile({ name, look, valid, set }: { name: string; look: PresetLook } & Omit<SectionProps, 'draft'>) {
  const selected = LOOK_KEYS.every((key) => valid[key] === look[key]);
  return (
    <button
      type='button'
      aria-pressed={selected}
      onClick={() => set(applyPreset(valid, look))}
      className={`zoron-tile group flex w-full cursor-pointer flex-col gap-1.5 rounded-2xl border p-1.5 text-left transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 ${
        selected
          ? 'border-(--zoron-accent) shadow-[0_0_0_3px_color-mix(in_srgb,var(--zoron-accent)_22%,transparent)]'
          : 'border-(--mantine-color-default-border) hover:border-(--mantine-color-placeholder)'
      }`}
    >
      <div className='h-20 overflow-hidden rounded-xl'>
        <PresetMock look={look} />
      </div>
      <span className='flex min-w-0 items-center gap-1.5 px-1 pb-0.5 text-sm font-medium'>
        <span
          className='size-2.5 shrink-0 rounded-full'
          style={{ background: `linear-gradient(135deg,${look.accent},${look.accent2})` }}
        />
        <span className='truncate'>{name}</span>
      </span>
    </button>
  );
}

/** The cleaned name, and whether another preset already has it (`own` is the name being renamed, if any). */
function checkName(raw: string, presets: CustomPreset[], own?: string) {
  const name = presetName(raw);
  return { name, taken: name !== null && name !== own && presets.some((preset) => preset.name === name) };
}

function RenamePresetModal({
  preset,
  presets,
  onClose,
  onRename,
}: {
  preset: string;
  presets: CustomPreset[];
  onClose: () => void;
  onRename: (name: string) => void;
}) {
  const { t } = useExtTranslations();
  const [raw, setRaw] = useState(preset);
  const { name, taken } = checkName(raw, presets, preset);

  return (
    <Modal opened onClose={onClose} title={t('presets.renameTitle', { name: preset })}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!name || taken) return;
          onClose();
          if (name !== preset) onRename(name);
        }}
      >
        <TextInput
          label={t('presets.name', {})}
          value={raw}
          maxLength={MAX_PRESET_NAME}
          onChange={(event) => setRaw(event.currentTarget.value)}
          error={taken ? t('presets.nameTaken', {}) : undefined}
          data-autofocus
        />
        <ModalFooter>
          <Button variant='default' onClick={onClose}>
            {t('presets.cancel', {})}
          </Button>
          <Button type='submit' disabled={!name || taken}>
            {t('presets.save', {})}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

/** The admins' own presets: saved from the current look, kept in the theme, renamed and deleted from a menu. */
function CustomPresets({ draft, valid, set }: SectionProps) {
  const { t } = useExtTranslations();
  const [raw, setRaw] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const presets = draft.customPresets;
  const { name, taken } = checkName(raw, presets);
  const full = presets.length >= MAX_CUSTOM_PRESETS;

  return (
    <Group title={t('presets.custom', {})} hint={t('presets.customHint', {})}>
      <Setting field='customPresets'>
        <div className='flex flex-col gap-3'>
          {presets.length > 0 && (
            <div className='grid grid-cols-2 gap-2.5'>
              {presets.map((preset) => (
                <div key={preset.name} className='relative'>
                  <PresetTile name={preset.name} look={preset.look} valid={valid} set={set} />
                  <div className='absolute top-2.5 right-2.5'>
                    <Menu position='bottom-end' zIndex={400}>
                      <Menu.Target>
                        <ActionIcon size='sm' variant='default' aria-label={t('presets.options', {})}>
                          <FontAwesomeIcon icon={faEllipsis} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Label>{preset.name}</Menu.Label>
                        <Menu.Item
                          leftSection={<FontAwesomeIcon icon={faPen} />}
                          onClick={() => setRenaming(preset.name)}
                        >
                          {t('presets.rename', {})}
                        </Menu.Item>
                        <Menu.Item
                          color='red'
                          leftSection={<FontAwesomeIcon icon={faTrash} />}
                          onClick={() => set({ customPresets: presets.filter((p) => p.name !== preset.name) })}
                        >
                          {t('presets.delete', {})}
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </div>
                </div>
              ))}
            </div>
          )}
          <form
            className='flex items-start gap-2'
            onSubmit={(event) => {
              event.preventDefault();
              if (!name || taken || full) return;
              set({ customPresets: [...presets, { name, look: pickLook(valid) }] });
              setRaw('');
            }}
          >
            <TextInput
              size='xs'
              className='flex-1'
              placeholder={t('presets.name', {})}
              aria-label={t('presets.name', {})}
              value={raw}
              maxLength={MAX_PRESET_NAME}
              disabled={full}
              onChange={(event) => setRaw(event.currentTarget.value)}
              error={taken ? t('presets.nameTaken', {}) : undefined}
            />
            <Button
              type='submit'
              size='xs'
              variant='default'
              disabled={!name || taken || full}
              leftSection={<FontAwesomeIcon icon={faPlus} />}
            >
              {t('presets.saveLook', {})}
            </Button>
          </form>
          {full && (
            <p className='text-xs text-(--mantine-color-dimmed)'>{t('presets.full', { max: MAX_CUSTOM_PRESETS })}</p>
          )}
        </div>
      </Setting>
      {renaming !== null && (
        <RenamePresetModal
          preset={renaming}
          presets={presets}
          onClose={() => setRenaming(null)}
          onRename={(newName) =>
            set({ customPresets: presets.map((p) => (p.name === renaming ? { ...p, name: newName } : p)) })
          }
        />
      )}
    </Group>
  );
}

export function PresetsSection({ draft, valid, set }: SectionProps) {
  const { t } = useExtTranslations();
  const [hue, setHue] = useState(265);
  const palette = generatePalette(hue);

  return (
    <div className='flex flex-col gap-7'>
      {/* the default (Carbon) is minimal, so that group leads */}
      {(['minimal', 'glass'] as const).map((style) => (
        <Group key={style} title={t(`presets.${style}`, {})}>
          <div className='grid grid-cols-2 gap-2.5'>
            {PRESETS.filter((preset) => preset.style === style).map((preset) => (
              <PresetTile
                key={preset.id}
                name={t(`presets.${preset.id}`, {})}
                look={preset.look}
                valid={valid}
                set={set}
              />
            ))}
          </div>
        </Group>
      ))}

      <CustomPresets draft={draft} valid={valid} set={set} />

      <Group title={t('presets.generate', {})} hint={t('presets.generateHint', {})}>
        <div className='flex flex-col gap-3 rounded-2xl border border-(--mantine-color-default-border) bg-(--mantine-color-default) p-3'>
          <div className='flex h-10 overflow-hidden rounded-lg'>
            {(['accent', 'accent2', 'background', 'surface', 'text'] as const).map((key) => (
              <div key={key} className='flex-1' style={{ background: palette[key] }} />
            ))}
          </div>
          <Slider
            min={0}
            max={359}
            value={hue}
            onChange={setHue}
            label={null}
            aria-label={t('presets.hue', {})}
            color='gray'
            styles={{
              // Mantine paints the track from `::before` with `--slider-track-bg`; the hue rainbow goes under it
              track: {
                '--slider-track-bg': 'transparent',
                borderRadius: 999,
                background: `linear-gradient(90deg,${[0, 60, 120, 180, 240, 300, 360].map((h) => hsl(h, 86, 60)).join(',')})`,
              } as CSSProperties,
              bar: { background: 'transparent' },
            }}
          />
          <div className='flex gap-2'>
            <Button
              variant='default'
              size='xs'
              leftSection={<FontAwesomeIcon icon={faShuffle} />}
              onClick={() => setHue(Math.floor(Math.random() * 360))}
            >
              {t('presets.shuffle', {})}
            </Button>
            <Button size='xs' className='flex-1' onClick={() => set(palette)}>
              {t('presets.applyPalette', {})}
            </Button>
          </div>
        </div>
      </Group>
    </div>
  );
}
