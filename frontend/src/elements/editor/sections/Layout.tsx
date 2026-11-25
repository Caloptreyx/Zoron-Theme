import { faPlus, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { SectionProps } from './types.ts';
import { ActionIcon, Button, Menu, SegmentedControl, TextInput } from '../../../lib/core.ts';
import { useCanEditEmails } from '../../../lib/permissions.ts';
import {
  BUTTON_STYLES,
  DENSITIES,
  type Density,
  HOME_LAYOUTS,
  LOGIN_LINK_ICONS,
  type LoginLink,
  MAX_LOGIN_LINK_LABEL,
  MAX_LOGIN_LINKS,
  NAV_STYLES,
  SAFE_URL,
  SIDEBARS,
  type ZoronTheme,
} from '../../../lib/theme.ts';
import { useExtTranslations } from '../../../translations.ts';
import { LOGIN_LINK_GLYPHS } from '../../LoginLinks.tsx';
import { ChoiceTiles, Group, Setting, SliderField, ToggleField } from '../controls.tsx';
import { ButtonMock, HomeLayoutMock, NavMock, SidebarMock } from '../mocks.tsx';

const BUTTON_LABEL = {
  gradient: 'layout.gradient',
  solid: 'layout.buttonSolid',
  soft: 'layout.soft',
  outline: 'layout.outline',
} as const satisfies Record<ZoronTheme['buttonStyle'], string>;

const HOME_LAYOUT_LABEL = {
  cards: 'layout.homeCards',
  compact: 'layout.homeCompact',
  list: 'layout.homeList',
} as const satisfies Record<ZoronTheme['homeLayout'], string>;

export function LayoutSection({ draft, valid, set }: SectionProps) {
  const { t } = useExtTranslations();
  const canEditEmails = useCanEditEmails();
  return (
    <div className='flex flex-col gap-7'>
      <Group title={t('layout.sidebar', {})}>
        <ChoiceTiles
          field='sidebar'
          columns={3}
          value={valid.sidebar}
          onChange={(sidebar) => set({ sidebar })}
          options={SIDEBARS.map((sidebar) => ({
            value: sidebar,
            label: t(`layout.${sidebar}`, {}),
            preview: <SidebarMock look={valid} sidebar={sidebar} />,
          }))}
        />
      </Group>

      <Group title={t('layout.home', {})}>
        <ToggleField
          field='homePage'
          label={t('layout.homePage', {})}
          description={t('layout.homePageHint', {})}
          checked={valid.homePage}
          onChange={(homePage) => set({ homePage })}
        />
        {valid.homePage && (
          <>
            <ChoiceTiles
              field='homeLayout'
              label={t('layout.homeLayout', {})}
              columns={3}
              value={valid.homeLayout}
              onChange={(homeLayout) => set({ homeLayout })}
              options={HOME_LAYOUTS.map((layout) => ({
                value: layout,
                label: t(HOME_LAYOUT_LABEL[layout], {}),
                preview: <HomeLayoutMock look={valid} layout={layout} />,
              }))}
            />
            <ToggleField
              field='homeGroups'
              label={t('layout.homeGroups', {})}
              description={t('layout.homeGroupsHint', {})}
              checked={valid.homeGroups}
              onChange={(homeGroups) => set({ homeGroups })}
            />
            <ToggleField
              field='homeLayoutChoice'
              label={t('layout.homeLayoutChoice', {})}
              description={t('layout.homeLayoutChoiceHint', {})}
              checked={valid.homeLayoutChoice}
              onChange={(homeLayoutChoice) => set({ homeLayoutChoice })}
            />
          </>
        )}
      </Group>

      <Group title={t('layout.nav', {})}>
        <ChoiceTiles
          field='navStyle'
          value={valid.navStyle}
          onChange={(navStyle) => set({ navStyle })}
          options={NAV_STYLES.map((nav) => ({
            value: nav,
            label: t(`layout.${nav}`, {}),
            preview: <NavMock look={valid} nav={nav} />,
          }))}
        />
      </Group>

      <Group title={t('layout.buttons', {})}>
        <ChoiceTiles
          field='buttonStyle'
          value={valid.buttonStyle}
          onChange={(buttonStyle) => set({ buttonStyle })}
          options={BUTTON_STYLES.map((style) => ({
            value: style,
            label: t(BUTTON_LABEL[style], {}),
            preview: <ButtonMock look={valid} style={style} />,
          }))}
        />
        <SliderField
          field='glow'
          label={t('layout.glowStrength', {})}
          value={valid.glow}
          min={0}
          max={100}
          unit='%'
          onChange={(glow) => set({ glow })}
        />
      </Group>

      <Group title={t('layout.density', {})}>
        <Setting field='density'>
          <SegmentedControl
            fullWidth
            value={valid.density}
            onChange={(density) => set({ density: density as Density })}
            data={DENSITIES.map((density) => ({ value: density, label: t(`layout.${density}`, {}) }))}
          />
        </Setting>
        <SliderField
          field='uiScale'
          label={t('layout.scale', {})}
          value={valid.uiScale}
          min={85}
          max={115}
          unit='%'
          onChange={(uiScale) => set({ uiScale })}
        />
      </Group>

      <Group title={t('layout.login', {})} hint={t('layout.loginHint', {})}>
        <LoginLinksField draft={draft} set={set} />
      </Group>
      <Group title={t('layout.email', {})} hint={t('layout.emailHint', {})}>
        <ToggleField
          field='emailTemplates'
          label={t('layout.emailTemplates', {})}
          description={canEditEmails ? t('layout.emailTemplatesHint', {}) : t('layout.emailTemplatesLocked', {})}
          checked={valid.emailTemplates}
          disabled={!canEditEmails}
          onChange={(emailTemplates) => set({ emailTemplates })}
        />
        {valid.emailTemplates && (
          <>
            <ToggleField
              field='emailSync'
              label={t('layout.emailSync', {})}
              description={t('layout.emailSyncHint', {})}
              checked={draft.emailSync}
              disabled={!canEditEmails}
              onChange={(emailSync) => set({ emailSync })}
            />
            <Setting field='emailLogo'>
              <TextInput
                label={t('layout.emailLogo', {})}
                value={draft.emailLogo}
                maxLength={2048}
                disabled={!canEditEmails}
                error={draft.emailLogo.trim() !== valid.emailLogo ? t('layout.loginUrlInvalid', {}) : undefined}
                onChange={(event) => set({ emailLogo: event.currentTarget.value })}
              />
            </Setting>
            <Setting field='emailFooter'>
              <TextInput
                label={t('layout.emailFooter', {})}
                value={draft.emailFooter}
                maxLength={200}
                disabled={!canEditEmails}
                onChange={(event) => set({ emailFooter: event.currentTarget.value })}
              />
            </Setting>
          </>
        )}
      </Group>
    </div>
  );
}

/**
 * The sign in pages' links (`loginLinks`), edited from the draft so a half typed address stays in its field; the
 * preview and the saved theme keep only the links normalizeTheme() accepts (a label and a SAFE_URL address).
 */
function LoginLinksField({ draft, set }: Pick<SectionProps, 'draft' | 'set'>) {
  const { t } = useExtTranslations();
  const links = draft.loginLinks;
  const update = (index: number, patch: Partial<LoginLink>) =>
    set({ loginLinks: links.map((link, i) => (i === index ? { ...link, ...patch } : link)) });

  return (
    <Setting field='loginLinks'>
      <div className='flex flex-col gap-2'>
        {links.map((link, index) => (
          <div
            key={index}
            className='flex flex-col gap-1.5 rounded-lg border border-(--mantine-color-default-border) bg-(--mantine-color-default) p-2'
          >
            <div className='flex items-center gap-1.5'>
              <Menu position='bottom-start' zIndex={400}>
                <Menu.Target>
                  <ActionIcon variant='default' size='input-xs' aria-label={t('layout.loginIcon', {})}>
                    <FontAwesomeIcon icon={LOGIN_LINK_GLYPHS[link.icon] ?? LOGIN_LINK_GLYPHS.link} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  {LOGIN_LINK_ICONS.map((icon) => (
                    <Menu.Item
                      key={icon}
                      leftSection={<FontAwesomeIcon icon={LOGIN_LINK_GLYPHS[icon]} />}
                      onClick={() => update(index, { icon })}
                    >
                      {t(`layout.loginIcons.${icon}`, {})}
                    </Menu.Item>
                  ))}
                </Menu.Dropdown>
              </Menu>
              <TextInput
                size='xs'
                className='flex-1'
                placeholder={t('layout.loginLabel', {})}
                aria-label={t('layout.loginLabel', {})}
                value={link.label}
                maxLength={MAX_LOGIN_LINK_LABEL}
                onChange={(event) => update(index, { label: event.currentTarget.value })}
              />
              <ActionIcon
                size='input-xs'
                variant='subtle'
                color='gray'
                aria-label={t('layout.loginRemove', {})}
                onClick={() => set({ loginLinks: links.filter((_, i) => i !== index) })}
              >
                <FontAwesomeIcon icon={faXmark} />
              </ActionIcon>
            </div>
            <TextInput
              size='xs'
              classNames={{ input: 'font-mono' }}
              placeholder={t('layout.loginUrlPlaceholder', {})}
              aria-label={t('layout.loginUrl', {})}
              value={link.url}
              onChange={(event) => update(index, { url: event.currentTarget.value.trim() })}
              error={link.url !== '' && !SAFE_URL.test(link.url) ? t('layout.loginUrlInvalid', {}) : undefined}
            />
          </div>
        ))}
        <Button
          size='xs'
          variant='default'
          className='self-start'
          disabled={links.length >= MAX_LOGIN_LINKS}
          leftSection={<FontAwesomeIcon icon={faPlus} />}
          onClick={() => set({ loginLinks: [...links, { label: '', url: '', icon: 'link' }] })}
        >
          {t('layout.loginAdd', {})}
        </Button>
      </div>
    </Setting>
  );
}
