/* Enhance the three authored answers; the HTML remains the reading fallback. */
(() => {
  const section = document.getElementById('questions');
  const tablist = section?.querySelector('.question-tabs');
  if (!tablist) return;
  const tabs = [...tablist.querySelectorAll('[data-question]')];
  const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
  if (!tabs.length || panels.some(panel => !panel)) return;

  function selectQuestion(button) {
    tabs.forEach((tab, i) => {
      const chosen = tab === button;
      tab.setAttribute('aria-selected', String(chosen));
      tab.tabIndex = chosen ? 0 : -1;
      panels[i].hidden = !chosen;
    });
  }

  tabs.forEach((button, i) => {
    panels[i].setAttribute('role', 'tabpanel');
    panels[i].setAttribute('aria-labelledby', button.id);
    panels[i].tabIndex = 0;
    button.addEventListener('click', () => selectQuestion(button));
    button.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (i + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (i + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) {
        event.preventDefault();
        selectQuestion(tabs[next]);
        tabs[next].focus();
      }
    });
  });
  selectQuestion(tabs[0]);
  section.classList.add('questions-ready');
  tablist.hidden = false;
})();
