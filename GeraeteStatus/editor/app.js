/* Universal Device Tile – Editor: Start, Reiter, Speichern und Verwerfen. Gespeichert wird nur auf Klick;
   der Hook prüft den Entwurf und lehnt ab, wenn der Stand inzwischen anders gespeichert wurde. */
(function (E) {
    'use strict';
    const h = E.h;

    document.querySelectorAll('[data-t]').forEach(el => { el.textContent = E.t(el.getAttribute('data-t')); });
    document.querySelectorAll('[data-t-title]').forEach(el => { el.title = E.t(el.getAttribute('data-t-title')); });
    document.getElementById('tile').title = E.t('Preview');

    const saveButton = document.getElementById('save');
    const discardButton = document.getElementById('discard');
    const dirtyMark = document.getElementById('dirty');

    const showTab = name => {
        document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
        ['rows', 'status', 'tile'].forEach(tab => { document.getElementById('tab-' + tab).hidden = tab !== name; });
    };
    document.querySelectorAll('#tabs button').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));
    E.on('tab', showTab);

    const updateDirty = () => {
        const dirty = E.isDirty();
        dirtyMark.hidden = !dirty;
        saveButton.disabled = !dirty;
        discardButton.disabled = !dirty;
        document.title = (dirty ? '● ' : '') + E.s.instance.name + ' – ' + E.t('Tile editor');
    };
    E.on('draft', updateDirty);

    const blocked = message => {
        document.body.replaceChildren(h('div', { class: 'blocked' }, E.icon('lock-keyhole'), h('h1', { text: E.t('Tile editor') }), h('p', { text: message })));
    };

    E.on('access', status => {
        blocked(status === 429 ? E.t('Too many attempts. Wait a minute and open the editor again from the configuration.')
            : E.t('Access has expired. Open the editor again with the button in the configuration of the tile.'));
    });

    const takeSaved = data => {
        E.s.saved = data.config;
        E.s.base = data.base;
        const selected = E.s.selected;
        E.s.draft = E.clone(data.config);
        E.s.extraGroups = [];
        E.emit('reset');
        E.emit('structure');
        E.select(selected);
        E.emit('draft');
    };

    const save = async force => {
        saveButton.disabled = true;
        const answer = await E.api('save', { config: E.s.draft, base: E.s.base, force: force === true });
        if (answer.status === 200) {
            takeSaved(answer.data);
            E.toast(answer.data.changed && answer.data.changed.length ? E.t('Saved. The tile shows the new configuration.') : E.t('Nothing changed.'), 'ok');
            return;
        }
        updateDirty();
        if (answer.status === 409) {
            E.dialog(E.t('Changed in the meantime'),
                E.t('The configuration of this tile was saved elsewhere in the meantime (e.g. in the configuration form). Save anyway replaces it with this draft.'),
                [[E.t('Cancel'), () => true],
                 [E.t('Load saved state'), async () => { await reload(); return true; }],
                 [E.t('Save anyway'), () => { save(true); return true; }, 'primary danger']]);
        } else if (answer.status === 422) {
            const list = h('ul', { class: 'errors' }, (answer.data.errors || []).map(e => h('li', { text: e })));
            E.dialog(E.t('Not saved'), h('div', {}, h('p', { text: E.t('Some values are not valid. Correct them and save again:') }), list));
        } else if (answer.status !== 401 && answer.status !== 429) {
            E.toast(E.t('Saving failed.'), 'error');
        }
    };

    const reload = async () => {
        const answer = await E.api('load', {});
        if (answer.status !== 200) {
            if (answer.status !== 401 && answer.status !== 429) E.toast(E.t('Loading failed.'), 'error');
            return false;
        }
        E.s.simulate = {};
        E.load(answer.data);
        if ((answer.data.warnings || []).length) {
            E.toast(E.t('Some stored values were invalid and are shown with their default.'), 'error');
        }
        return true;
    };

    saveButton.addEventListener('click', () => save(false));
    discardButton.addEventListener('click', () => {
        E.dialog(E.t('Discard changes?'), E.t('The draft goes back to the saved configuration.'), [
            [E.t('Cancel'), () => true],
            [E.t('Discard'), () => { takeSaved({ config: E.s.saved, base: E.s.base }); E.select(null); return true; }, 'danger']
        ]);
    });
    document.addEventListener('keydown', e => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            if (E.isDirty()) save(false);
        }
    });
    window.addEventListener('beforeunload', e => {
        if (E.isDirty()) { e.preventDefault(); e.returnValue = ''; }
    });

    E.on('preview', data => {
        const errors = data.errors || [];
        const box = document.getElementById('previewErrors') || (() => {
            const el = h('div', { id: 'previewErrors', class: 'warn-box' });
            document.querySelector('.stage').appendChild(el);
            return el;
        })();
        box.hidden = errors.length === 0;
        box.replaceChildren(h('strong', { text: E.t('These values are not used:') }), h('ul', {}, errors.slice(0, 8).map(e => h('li', { text: e }))));
    });

    document.getElementById('title').textContent = E.t('Tile editor');
    if (!E.hasCode()) {
        blocked(E.t('Open the editor with the button “Open editor” in the configuration of the tile.'));
        return;
    }
    reload().then(ok => { if (ok) E.loadTile(); });
    E.on('loaded', () => { document.getElementById('title').textContent = E.t('Tile editor') + ' · ' + E.s.instance.name; updateDirty(); });
})(window.UDTE);
