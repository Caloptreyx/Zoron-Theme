import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { SECTION_IDS, sectionChanged, sectionFields, withSection } from '../frontend/src/elements/editor/fields.ts';
import { DEFAULT_THEME, PRESETS, pickLook } from '../frontend/src/lib/theme.ts';

describe('SECTION_FIELDS', () => {
  test('every theme field belongs to exactly one section', () => {
    const listed = SECTION_IDS.flatMap(sectionFields);
    assert.equal(new Set(listed).size, listed.length);
    assert.deepEqual([...listed].sort(), Object.keys(DEFAULT_THEME).sort());
  });
});

describe('sectionChanged', () => {
  test('sees a change only in the section that owns the field', () => {
    const theme = { ...DEFAULT_THEME, accent: '#123456' };
    assert.equal(sectionChanged('colors', theme, DEFAULT_THEME), true);
    assert.equal(sectionChanged('layout', theme, DEFAULT_THEME), false);
  });

  test('compares custom presets by value', () => {
    const preset = { name: 'Mine', look: pickLook(DEFAULT_THEME) };
    const a = { ...DEFAULT_THEME, customPresets: [preset] };
    const b = { ...DEFAULT_THEME, customPresets: [{ ...preset, look: { ...preset.look } }] };
    assert.equal(sectionChanged('presets', a, b), false);
    assert.equal(sectionChanged('presets', a, DEFAULT_THEME), true);
  });
});

describe('withSection', () => {
  test('resets one section and keeps the others', () => {
    const theme = {
      ...DEFAULT_THEME,
      ...PRESETS[1].look,
      terminalScheme: 'nord' as const,
      terminalSkin: 'crt' as const,
      terminalLineHeight: 150,
      terminalUserChoice: false,
      consoleMetrics: ['cpu' as const],
      consoleInspector: 'off' as const,
      consoleCommands: ['save-all'],
    };
    const reset = withSection(theme, 'terminal', DEFAULT_THEME);
    assert.equal(reset.terminalScheme, DEFAULT_THEME.terminalScheme);
    assert.equal(reset.terminalSkin, DEFAULT_THEME.terminalSkin);
    assert.equal(reset.terminalUserChoice, DEFAULT_THEME.terminalUserChoice);
    assert.equal(reset.terminalLineHeight, DEFAULT_THEME.terminalLineHeight);
    // the console's layout is the Server page tab's
    assert.deepEqual(reset.consoleMetrics, ['cpu']);
    assert.equal(reset.consoleInspector, 'off');
    assert.deepEqual(reset.consoleCommands, ['save-all']);
    assert.equal(reset.accent, PRESETS[1].look.accent);
    const server = withSection(theme, 'server', DEFAULT_THEME);
    assert.deepEqual(server.consoleMetrics, DEFAULT_THEME.consoleMetrics);
    assert.equal(server.consoleInspector, DEFAULT_THEME.consoleInspector);
    assert.deepEqual(server.consoleCommands, []);
    assert.equal(server.terminalScheme, 'nord');
  });

  test('resets the server page, the overview switch included', () => {
    const theme = {
      ...DEFAULT_THEME,
      serverOverview: false,
      overviewGrid: [{ block: 'glance' as const, x: 0, y: 0, w: 12, h: 1 }],
      overviewUsage: 'graphs' as const,
      overviewActivityCount: 15,
      overviewHeader: 'banner' as const,
      overviewDescription: false,
      homePage: false,
    };
    assert.equal(sectionChanged('server', theme, DEFAULT_THEME), true);
    const reset = withSection(theme, 'server', DEFAULT_THEME);
    assert.equal(sectionChanged('server', reset, DEFAULT_THEME), false);
    assert.deepEqual(reset.overviewGrid, DEFAULT_THEME.overviewGrid);
    assert.equal(reset.serverOverview, true);
    assert.equal(reset.homePage, false);
  });
});
