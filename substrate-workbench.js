/* A teaching model of a shared workspace. No sessions, tools, or services are started. */
const modes = {
  source: {
    left: ['SESSION 01', 'keep the conversation', 'source/transcript.txt'],
    right: ['SESSION 02', 'check the note against', 'source/transcript.txt'],
    folder: 'The source stays close.',
    files: ['source', 'notes'],
    route: ['Transcript', 'Attributed note', 'Next session reads'],
    caption: 'A verbatim record and an attributed note, kept together in a folder you own.',
  },
  return: {
    left: ['LAST SESSION', 'leave the next step', 'NEXT.md'],
    right: ['NEXT SESSION', 'read before starting', 'AGENTS.md + NEXT.md'],
    folder: 'A useful place to return.',
    files: ['agents', 'next'],
    route: ['Read the handoff', 'Check the source', 'Continue the task'],
    caption: 'The next run starts from the work left behind. A schedule can bring it back at a chosen time.',
  },
  ability: {
    left: ['THE TASK', 'find the fitting ability', 'check the links'],
    right: ['SELECTED SKILL', 'read its procedure', 'check-links/SKILL.md'],
    folder: 'Add what the work needs.',
    files: ['skill'],
    route: ['A task', 'A matching skill', 'Tools in your harness'],
    caption: 'A skill describes an ability. A plugin can package it with tools. The harness governs access.',
  },
};

export function initSubstrateWorkbench(root) {
  if (!root || root.dataset.workbenchReady === 'true') return;
  const tabs = [...root.querySelectorAll('[data-substrate-tab]')];
  const panels = [...root.querySelectorAll('[data-substrate-panel]')];
  if (tabs.length !== 3 || panels.length !== 3) return;

  const setText = (selector, value) => {
    const target = root.querySelector(selector);
    if (target) target.textContent = value;
  };
  function select(mode, focus = false) {
    const state = modes[mode];
    if (!state) return;
    root.dataset.substrateMode = mode;
    tabs.forEach(tab => {
      const selected = tab.dataset.substrateTab === mode;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focus) tab.focus();
    });
    panels.forEach(panel => { panel.hidden = panel.dataset.substratePanel !== mode; });
    for (const side of ['left', 'right']) {
      ['label', 'action', 'file'].forEach((part, i) => {
        setText(`[data-terminal-${side}="${part}"]`, state[side][i]);
      });
    }
    root.querySelectorAll('[data-workspace-file]').forEach(file => {
      file.dataset.lit = String(state.files.includes(file.dataset.workspaceFile));
    });
    root.querySelectorAll('[data-workspace-step]').forEach((step, i) => {
      step.textContent = state.route[i];
    });
    setText('[data-folder-caption]', state.folder);
    setText('[data-workspace-caption]', state.caption);
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab.dataset.substrateTab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (i + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (i + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      select(tabs[next].dataset.substrateTab, true);
    });
  });
  root.dataset.workbenchReady = 'true';
  const controls = root.querySelector('[data-substrate-controls]');
  if (controls) controls.hidden = false;
  select('source');
}

document.querySelectorAll('[data-substrate-workbench]').forEach(initSubstrateWorkbench);
