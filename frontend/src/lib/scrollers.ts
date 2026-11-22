/**
 * Rows that scroll sideways with no scrollbar shown (styles/core.css, "sideways scrollers"): core's tab bars, which
 * Zoron makes one pill row, and Zoron's own chip rows. A trackpad scrolls them natively, a mouse wheel only scrolls
 * the page, so a vertical wheel over one scrolls it sideways until its end, then the page again. A tab bar also
 * keeps its current tab in view, as it mounts and as the current tab changes. Keep the list in step with core.css.
 */
const TAB_LISTS =
  ":is(#dashboard-root, #server-root, #admin-root) .mantine-Tabs-list:not([data-orientation='vertical'])";

const SCROLLERS = [
  TAB_LISTS,
  '.zoron-chips',
  '.zoron-con-chips',
  '.zoron-con-term > .mantine-Card-root > :first-child > :last-child',
].join(', ');

/** the edge fade's width in core.css: a tab brought into view clears it */
const FADE = 32;

/** pixels per line for wheels that report lines (Firefox with a mouse) */
const LINE = 40;

const bound = new WeakSet<Element>();
const shownTab = new WeakMap<Element, Element>();

function onWheel(this: HTMLElement, event: WheelEvent) {
  if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
  if (!document.documentElement.hasAttribute('data-zoron')) return;
  const unit =
    event.deltaMode === WheelEvent.DOM_DELTA_LINE
      ? LINE
      : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
        ? this.clientWidth
        : 1;
  const sign = getComputedStyle(this).direction === 'rtl' ? -1 : 1;
  const before = this.scrollLeft;
  this.scrollLeft += event.deltaY * unit * sign;
  // at its end the row did not move: the wheel scrolls the page as usual
  if (this.scrollLeft !== before) event.preventDefault();
}

/** scroll a tab bar just enough to show its current tab clear of the edge fades */
function reveal(list: Element, tab: Element) {
  const outer = list.getBoundingClientRect();
  const inner = tab.getBoundingClientRect();
  if (inner.left < outer.left + FADE) list.scrollLeft -= outer.left + FADE - inner.left;
  else if (inner.right > outer.right - FADE) list.scrollLeft += inner.right - outer.right + FADE;
}

function scan() {
  for (const row of document.querySelectorAll<HTMLElement>(SCROLLERS)) {
    if (!bound.has(row)) {
      bound.add(row);
      row.addEventListener('wheel', onWheel, { passive: false });
    }
    if (!row.matches(TAB_LISTS)) continue;
    const tab = row.querySelector('.mantine-Tabs-tab[data-active]');
    if (!tab || shownTab.get(row) === tab) continue;
    shownTab.set(row, tab);
    if (row.scrollWidth > row.clientWidth) reveal(row, tab);
  }
}

/** watch the page for those rows; the terminal's output (xterm's rows) changes constantly and is skipped cheaply */
export function watchSideScrollers() {
  let frame = 0;
  const observer = new MutationObserver((records) => {
    if (frame) return;
    for (const record of records) {
      const target = record.target instanceof Element ? record.target : record.target.parentElement;
      if (target?.closest('.xterm')) continue;
      frame = requestAnimationFrame(() => {
        frame = 0;
        scan();
      });
      return;
    }
  });
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['data-active'],
  });
  scan();
}
