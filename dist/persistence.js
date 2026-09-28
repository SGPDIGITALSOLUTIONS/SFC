(() => {
  let hydrated = false;
  let saving = false;
  let dirty = false;
  let saveTimer;

  async function request(method, body) {
    const response = await fetch('/api/cases', {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not reach the shared case file.');
    return data;
  }

  async function upload() {
    if (!hydrated || saving) return;
    saving = true;
    dirty = false;
    try {
      await request('PUT', { cases });
    } catch (error) {
      if (typeof toast === 'function') toast(error.message || 'Your latest change is only saved on this device for now.');
    } finally {
      saving = false;
      if (dirty) upload();
    }
  }

  window.sfcPersist = () => {
    dirty = true;
    if (!hydrated) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(upload, 450);
  };

  async function hydrate() {
    const caseIdsAtStart = new Set(cases.map(item => item.id));
    try {
      const state = await request('GET');
      if (state.exists && Array.isArray(state.cases) && state.cases.length) {
        const casesAddedWhileLoading = cases.filter(item => !caseIdsAtStart.has(item.id));
        const remoteIds = new Set(state.cases.map(item => item.id));
        cases = [...state.cases, ...casesAddedWhileLoading.filter(item => !remoteIds.has(item.id))];
        if (!cases.some(item => item.id === activeId)) activeId = cases[0].id;
        localStorage.setItem('sfc-cases', JSON.stringify(cases));
        localStorage.setItem('sfc-active', activeId);
      }
      hydrated = true;
      if (!state.exists || dirty) await upload();
      render();
    } catch (error) {
      hydrated = true;
      if (typeof toast === 'function') toast('Working on this device for now. Shared sync will retry when you reopen SFC.');
    }
  }

  window.addEventListener('sfc:authenticated', hydrate, { once: true });
})();
