'use strict';

import { defaultShortcuts, keyboardShortcuts } from './store.js';
import { derived, get } from 'svelte/store';

// key -> shortcut
export const shortcutMap = derived(keyboardShortcuts, $shorts => {
  const reverseKeyAction = ([action, key]) => [key, action];

  const existingShortcuts = Object.entries($shorts).map(reverseKeyAction);
  const newShortcuts = Object.entries(defaultShortcuts)
    .filter(([_key, action]) => $shorts[action] == null)
    .map(reverseKeyAction);

  return new Map([...existingShortcuts, ...newShortcuts]);
});

export const executeAction = action =>
  document.querySelector('iframe[title=video]')?.contentWindow?.postMessage({
    type: 'shortcut-action',
    action
  }, '*');

export const onKeyEvent = e => {
  if (!get(shortcutMap).has(e?.key)) return;
  executeAction(get(shortcutMap).get(e?.key));
};

window.executeAction = executeAction;
