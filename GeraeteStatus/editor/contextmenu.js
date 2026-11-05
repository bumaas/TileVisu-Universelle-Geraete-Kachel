/* Universal Device Tile – Editor: Kontextmenüs der Vorschau (Rechtsklick) für Zeilen, Gruppen und das
   Statusbild. Einträge: { icon, label, run, danger, checked, disabled, items (Untermenü) } oder '-' (Linie). */
(function (E) {
    'use strict';
    const h = E.h;
    const root = h('div', { class: 'menu-list add-menu ctx', id: 'contextMenu', role: 'menu', hidden: true });
    document.body.appendChild(root);
    let styleClipboard = null;

    // Darstellung einer Zeile (für „Darstellung kopieren/einfügen“): alles außer Ziel, Beschriftung, Typ und Gruppe
    const STYLE = ['ShowIcon', 'ShowLabel', 'ShowValue', 'FontSize', 'TextColor', 'ProgressColor1', 'ProgressColor2', 'SliderColor1',
        'SliderColor2', 'boolButtonColor', 'ButtonWidth', 'VerticalAlignment', 'ShowBorderLine', 'ImageWidth', 'ImageBorderRadius'];

    const close = () => { root.hidden = true; root.replaceChildren(); };

    /** Einträge in eine Liste bauen; Untermenüs öffnen beim Überfahren, per Klick oder Pfeil nach rechts. */
    const build = (list, items) => {
        items.filter(Boolean).forEach(entry => {
            if (entry === '-') { list.appendChild(h('hr')); return; }
            const check = entry.checked !== undefined;
            const button = h('button', {
                type: 'button', role: check ? 'menuitemcheckbox' : 'menuitem', class: entry.danger ? 'danger' : '', disabled: !!entry.disabled,
                'aria-checked': check ? String(!!entry.checked) : null, 'aria-haspopup': entry.items ? 'menu' : null
            }, h('span', { class: 'ctx-icon' }, check ? (entry.checked ? E.icon('check') : null) : (entry.icon ? E.icon(entry.icon) : null)),
                h('span', { class: 'grow', text: entry.label }), entry.items ? E.icon('chevron-right', 'ctx-arrow') : null);
            if (!entry.items) {
                button.addEventListener('click', () => { close(); entry.run(); });
                list.appendChild(button);
                return;
            }
            const sub = h('div', { class: 'menu-list ctx-sub', role: 'menu', hidden: true });
            build(sub, entry.items);
            const item = h('div', { class: 'ctx-item' }, button, sub);
            const open = () => {
                list.querySelectorAll(':scope > .ctx-item > .ctx-sub').forEach(s => { if (s !== sub) s.hidden = true; });
                sub.hidden = false;
                sub.classList.toggle('flip', item.getBoundingClientRect().right + sub.offsetWidth > window.innerWidth - 8);
            };
            item.addEventListener('mouseenter', open);
            button.addEventListener('click', open);
            button.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { e.preventDefault(); open(); const b = sub.querySelector('button:not(:disabled)'); if (b) b.focus(); } });
            sub.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); sub.hidden = true; button.focus(); } });
            list.appendChild(item);
        });
        // ohne Untermenü: beim Überfahren anderer Einträge die offenen Untermenüs schließen
        list.querySelectorAll(':scope > button').forEach(b => b.addEventListener('mouseenter', () => {
            list.querySelectorAll(':scope > .ctx-item > .ctx-sub').forEach(s => { s.hidden = true; });
        }));
    };

    /** Menü an Seitenkoordinaten öffnen (im Fenster gehalten). */
    const open = (x, y, title, items) => {
        close();
        root.append(h('div', { class: 'menu-title', text: title }));
        build(root, items);
        root.hidden = false;
        Object.assign(root.style, {
            left: Math.max(8, Math.min(x, window.innerWidth - root.offsetWidth - 8)) + 'px',
            top: Math.max(8, Math.min(y, window.innerHeight - root.offsetHeight - 8)) + 'px'
        });
        const first = root.querySelector('button:not(:disabled)');
        if (first) first.focus();
    };
    const fromTile = (x, y) => { const f = E.previewFrame().getBoundingClientRect(); return [f.left + x, f.top + y]; };

    root.addEventListener('keydown', e => {
        if (e.key === 'Escape') { e.preventDefault(); close(); return; }
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        e.preventDefault();
        const list = document.activeElement.closest('.menu-list') || root;
        const items = [...list.querySelectorAll(':scope > button:not(:disabled), :scope > .ctx-item > button:not(:disabled)')];
        const at = items.indexOf(document.activeElement);
        if (items.length) items[(at + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length].focus();
    });
    document.addEventListener('click', e => { if (!root.contains(e.target)) close(); });
    document.addEventListener('contextmenu', e => {
        if (!root.contains(e.target) && !e.target.closest('#imageHandle')) close();
        // Menü des Browsers nur in Eingabefeldern (Kopieren, Einfügen), sonst nur das des Editors
        if (!e.target.closest('input, textarea, select, [contenteditable]')) e.preventDefault();
    });
    window.addEventListener('resize', close);
    window.addEventListener('message', e => { if (e.data && e.data.udte && !String(e.data.udte).startsWith('context')) close(); });

    const usedGroups = () => {
        const used = new Set();
        E.rows().forEach(r => { const n = E.groupNumber(r.Group); if (n) used.add(n); });
        (E.s.extraGroups || []).forEach(n => used.add(n));
        return used;
    };
    const freeGroup = () => { const used = usedGroups(); for (let n = 1; n <= 10; n++) if (!used.has(n)) return n; return 0; };
    const groupName = n => { const g = E.groups()[n - 1]; return (g && g.GroupName) || E.tf('Group %d', n); };

    // ---------- Zeile ----------
    function rowMenu(key, x, y) {
        const rows = E.rows();
        const row = rows[key];
        if (!row) return;
        E.select(key);
        const type = E.rowValue(row, 'DisplayType');
        const image = type === 'image';
        const field = image ? 'ImageMedia' : 'Variable';
        const matrix = (E.s.matrix && (E.s.matrix[type] || E.s.matrix.text)) || {};
        const shown = f => (matrix[f] !== undefined ? !!matrix[f] : true);
        const set = mutate => E.change(mutate, true);
        const current = E.groupNumber(row.Group);
        const groups = [...usedGroups()].sort((a, b) => a - b);
        const move = delta => {
            const to = key + delta;
            if (to < 0 || to >= rows.length) return;
            set(() => { rows.splice(key, 1); rows.splice(to, 0, row); });
            E.select(to);
        };
        open(...fromTile(x, y), E.rowTitle(row), [
            { icon: 'magnifying-glass', label: image ? E.t('Select image…') : E.t('Select variable…'),
                run: () => E.pick(image ? 'image' : 'variable', row[field] | 0, id => set(() => { row[field] = id; })) },
            image ? null : { icon: 'pen', label: E.t('Change label'), run: () => E.inplace.editLabel(key, x, y) },
            '-',
            { icon: E.typeIcon(type), label: E.t('Display type'), items: E.TYPES.map(([id, , caption]) => ({
                label: E.t(caption), checked: id === type, run: () => set(() => { row.DisplayType = id; }) })) },
            { icon: 'layer-group', label: E.t('Group'), items: [
                { label: E.t('No group'), checked: !current, run: () => set(() => { row.Group = 'keine Gruppe'; }) },
                ...groups.map(n => ({ label: groupName(n), checked: n === current, run: () => set(() => { row.Group = 'Gruppe ' + n; }) })),
                '-',
                { icon: 'plus', label: E.t('New group'), disabled: !freeGroup(), run: () => { const n = freeGroup(); set(() => { row.Group = 'Gruppe ' + n; }); } }] },
            { icon: 'eye', label: E.t('Show'), items: [['ShowIcon', 'Icon'], ['ShowLabel', 'Label'], ['ShowValue', 'Value']].filter(([f]) => shown(f))
                .map(([f, caption]) => ({ label: E.t(caption), checked: !!E.rowValue(row, f), run: () => set(() => { row[f] = !E.rowValue(row, f); }) })) },
            '-',
            { icon: 'arrow-up', label: E.t('Move up'), disabled: key === 0, run: () => move(-1) },
            { icon: 'arrow-down', label: E.t('Move down'), disabled: key === rows.length - 1, run: () => move(1) },
            '-',
            { icon: 'paintbrush', label: E.t('Copy appearance'), run: () => {
                styleClipboard = {};
                STYLE.forEach(f => { styleClipboard[f] = E.clone(E.rowValue(row, f)); });
                E.toast(E.tf('Appearance of “%s” copied.', E.rowTitle(row)));
            } },
            { icon: 'paint-roller', label: E.t('Paste appearance'), disabled: !styleClipboard, run: () => set(() => { Object.assign(row, E.clone(styleClipboard)); }) },
            '-',
            { icon: 'copy', label: E.t('Duplicate'), run: () => E.duplicateRow(key) },
            { icon: 'trash', label: E.t('Delete'), danger: true, run: () => E.deleteRow(key) }
        ]);
    }

    // ---------- Gruppe ----------
    function groupMenu(key, x, y) {
        const row = E.rows()[key];
        const n = row ? E.groupNumber(row.Group) : 0;
        if (!n) return;
        const group = E.groups()[n - 1];
        E.selectGroup(n);
        const toggle = field => () => E.change(() => { group[field] = !group[field]; }, true);
        const duplicate = () => {
            const m = freeGroup();
            if (!m) { E.toast(E.t('All 10 groups are in use.'), 'error'); return; }
            E.change(d => {
                const rows = d.VariablesList;
                const members = rows.filter(r => E.groupNumber(r.Group) === n);
                const copies = members.map(r => Object.assign(E.clone(r), { Group: 'Gruppe ' + m }));
                rows.splice(rows.indexOf(members[members.length - 1]) + 1, 0, ...copies);
                Object.assign(E.groups()[m - 1], E.clone(group), { Group: m, GroupName: E.tf('%s (copy)', groupName(n)) });
            }, true);
            E.selectGroup(m);
        };
        const dissolve = () => {
            E.change(d => { d.VariablesList.forEach(r => { if (E.groupNumber(r.Group) === n) r.Group = 'keine Gruppe'; }); }, true);
            E.select(null);
        };
        open(...fromTile(x, y), groupName(n), [
            { icon: 'pen', label: E.t('Rename'), run: () => E.inplace.editGroupName(key, x, y) },
            { icon: 'icons', label: E.t('Change icon…'), run: () => E.inplace.pickGroupIcon(key) },
            '-',
            { label: E.t('Show group name'), checked: !!group.ShowGroupName, run: toggle('ShowGroupName') },
            { label: E.t('Name above the group'), checked: !!group.ShowAbove, run: toggle('ShowAbove') },
            { label: E.t('Line below the group'), checked: !!group.line, run: toggle('line') },
            { label: E.t('Stretch elements'), checked: !!group.stretch, run: toggle('stretch') },
            '-',
            { icon: 'copy', label: E.t('Duplicate group'), run: duplicate },
            { icon: 'object-ungroup', label: E.t('Dissolve group (rows stay)'), run: dissolve }
        ]);
    }

    // ---------- Statusbild ----------
    const BUILT_IN = [['wm_aus', 'Washing Machine - Off'], ['wm_an', 'Washing Machine - On'], ['dryer_off', 'Dryer - Off'], ['dryer_on', 'Dryer - On']];
    function statusMenu(x, y) {
        const index = E.s.payload ? E.s.payload.editorAssociation : null;
        const assoc = Number.isInteger(index) ? (E.s.draft.ProfilAssoziazionen || [])[index] : null;
        const position = E.s.draft.BildPosition || 'left';
        const pickImage = () => {
            if (assoc) E.pick('image', assoc.EigenesBild | 0, id => E.change(() => { assoc.Bildauswahl = 'custom'; assoc.EigenesBild = id; }, true));
            else E.pick('image', E.s.draft.DefaultImage | 0, id => E.change(d => { d.DefaultImage = id; d.DefaultIcon = ''; }, true));
        };
        open(x, y, assoc ? E.tf('Status “%s”', assoc.AssoziationName || String(assoc.AssoziationValue)) : E.t('Default Image'), [
            { icon: 'icons', label: E.t('Select icon…'), run: () => E.pickStatusIcon() },
            { icon: 'image', label: E.t('Select image…'), run: pickImage },
            { icon: 'washing-machine', label: E.t('Built-in image'), disabled: !assoc, items: BUILT_IN.map(([id, caption]) => ({
                label: E.t(caption), checked: !!assoc && assoc.Bildauswahl === id, run: () => E.change(() => { assoc.Bildauswahl = id; }, true) })) },
            '-',
            { icon: 'arrows-up-down-left-right', label: E.t('Image position'), items: [['top', 'top'], ['bottom', 'bottom'], ['left', 'left'], ['right', 'right']]
                .map(([p, caption]) => ({ label: E.t(caption), checked: position === p, run: () => { E.change(d => { d.BildPosition = p; }); E.emit('reset'); } })) },
            '-',
            { icon: 'sliders', label: E.t('Status settings'), run: () => E.emit('tab', 'status') }
        ]);
    }

    document.getElementById('imageHandle').addEventListener('contextmenu', e => { e.preventDefault(); statusMenu(e.clientX, e.clientY); });
    E.on('bridge', data => {
        if (data.udte === 'context') rowMenu(parseInt(data.key, 10), Number(data.x), Number(data.y));
        if (data.udte === 'contextGroup') groupMenu(parseInt(data.key, 10), Number(data.x), Number(data.y));
    });
})(window.UDTE);
