// Three language modes: 'both' (Swahili first, English beneath), 'sw', 'en'.

import sw from './sw.js';
import en from './en.js';

export const DICTS = { sw, en };
export const LANGUAGE_MODES = ['both', 'sw', 'en'];
export const DEFAULT_LANGUAGE = 'both';

function fill(str, vars) {
  return str.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

export function lookup(lang, key, vars = {}) {
  const dict = DICTS[lang];
  const s = dict?.[key] ?? DICTS.en[key];
  if (s === undefined) throw new Error(`Missing translation key "${key}"`);
  return fill(s, vars);
}

/**
 * Text for a key in the given mode: { primary, secondary }.
 * secondary is null unless the mode is bilingual and the two languages differ.
 */
export function translate(mode, key, vars = {}) {
  if (mode === 'en') return { primary: lookup('en', key, vars), secondary: null };
  const primary = lookup('sw', key, vars);
  if (mode === 'sw') return { primary, secondary: null };
  const english = lookup('en', key, vars);
  return { primary, secondary: english === primary ? null : english };
}

/** Plain single-string form, for canvas text and aria labels. */
export function translatePlain(mode, key, vars = {}) {
  const { primary, secondary } = translate(mode, key, vars);
  return secondary ? `${primary} · ${secondary}` : primary;
}

/** Applies translations to every [data-i18n] element under root. */
export function applyTranslations(root, mode, varsFor = () => ({})) {
  for (const el of root.querySelectorAll('[data-i18n]')) {
    const key = el.dataset.i18n;
    const { primary, secondary } = translate(mode, key, varsFor(key, el));
    const style = el.dataset.i18nStyle || 'stack';
    el.textContent = '';
    if (!secondary || style === 'primary') {
      el.textContent = primary;
    } else if (style === 'inline') {
      el.textContent = `${primary} · ${secondary}`;
    } else {
      const p = document.createElement('span');
      p.className = 't-pri';
      p.textContent = primary;
      const s = document.createElement('span');
      s.className = 't-sec';
      s.textContent = secondary;
      el.append(p, s);
    }
    el.lang = mode === 'en' ? 'en' : 'sw';
  }
  for (const el of root.querySelectorAll('[data-i18n-aria]')) {
    el.setAttribute('aria-label', translatePlain(mode, el.dataset.i18nAria));
  }
  document.documentElement.lang = mode === 'en' ? 'en' : 'sw';
}
