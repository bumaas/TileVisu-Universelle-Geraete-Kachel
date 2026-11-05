/* Universal Device Tile – Editor: Mehrfachauswahl. Umschalt-, Cmd- oder Strg-Klick (Liste und Vorschau) nimmt
   Zeilen hinzu oder heraus; ab zwei Zeilen steht über der Liste ein Feld, das Gruppe, Anzeigetyp und Aussehen
   für alle setzt, sie dupliziert oder löscht. Gemerkt werden die Zeilen selbst, nicht ihre Plätze. */
(function (E) {
    'use strict';
    const h = E.h;

    /** Gewählte Zeilen, die es noch gibt (in der Reihenfolge der Liste); nur bei zweien und mehr eine Mehrfachauswahl. */
    E.pickedRows = () => E.rows().filter(r => E.s.picked.includes(r));
    E.isMulti = () => E.pickedRows().length > 1;

    const setPicked = list => {
        if (list.length <= 1) {
            E.select(list.length ? E.rows().indexOf(list[0]) : null);
            return;
        }
        E.s.selected = null;
        E.s.selectedGroup = null;
        E.s.picked = list;
        E.emit('select', null);
    };

    /** Zeile zur Auswahl hinzufügen oder herausnehmen (eine einzeln gewählte Zeile zählt mit). */
    E.toggleMulti = function (index) {
        const row = E.rows()[index];
        if (!row) return;
        let list = E.isMulti() ? E.pickedRows() : (E.s.selected !== null && E.rows()[E.s.selected] ? [E.rows()[E.s.selected]] : []);
        list = list.includes(row) ? list.filter(r => r !== row) : list.concat([row]);
        setPicked(list);
    };

    E.deleteRows = function (list) {
        E.change(d => { d.VariablesList = d.VariablesList.filter(r => !list.includes(r)); }, true);
        E.select(null);
        E.toast(E.tf('%d rows removed.', list.length), '', [E.t('Undo'), () => E.undo()]);
    };

    /** Kopie je Zeile direkt hinter ihr; die Kopien sind danach gewählt. */
    E.duplicateRows = function (list) {
        const copies = [];
        E.change(d => {
            list.map(r => d.VariablesList.indexOf(r)).filter(i => i >= 0).sort((a, b) => b - a).forEach(i => {
                const copy = E.clone(d.VariablesList[i]);
                d.VariablesList.splice(i + 1, 0, copy);
                copies.unshift(copy);
            });
        }, true);
        setPicked(copies);
    };

    const visible = (type, field) => {
        const m = E.s.matrix[type] || E.s.matrix.text || {};
        return m[field] !== undefined ? !!m[field] : true;
    };

    E.renderMulti = function (container) {
        const rows = E.pickedRows();
        const f = E.f;
        const types = rows.map(r => E.rowValue(r, 'DisplayType'));
        const all = field => types.every(t => visible(t, field));
        // gemeinsamer Wert aller Zeilen, sonst undefined („gemischt“)
        const common = field => {
            const values = rows.map(r => JSON.stringify(E.rowValue(r, field)));
            return values.every(v => v === values[0]) ? E.rowValue(rows[0], field) : undefined;
        };
        const setAll = (field, structural) => value => E.change(() => rows.forEach(r => { r[field] = value; }), structural);
        const mixed = field => (common(field) === undefined ? [['', '—']] : []);
        const free = () => {
            const used = new Set(E.s.extraGroups || []);
            E.rows().forEach(r => { const n = E.groupNumber(r.Group); if (n) used.add(n); });
            for (let n = 1; n <= 10; n++) if (!used.has(n)) return n;
            return 0;
        };

        const head = h('div', { class: 'detail-head' },
            h('strong', { class: 'grow', text: E.tf('%d rows selected', rows.length) }),
            h('button', { type: 'button', class: 'btn small icon', title: E.t('Duplicate'), onclick: () => E.duplicateRows(rows) }, E.icon('copy')),
            h('button', { type: 'button', class: 'btn small icon danger', title: E.t('Delete'), onclick: () => E.deleteRows(rows) }, E.icon('trash')),
            h('button', { type: 'button', class: 'btn small icon', title: E.t('End selection'), onclick: () => E.select(null) }, E.icon('xmark')));
        const type = f.segments(() => common('DisplayType'), setAll('DisplayType', true), E.TYPES.map(([id, icon, caption]) => [id, E.t(caption), icon]), true);

        const groups = [['keine Gruppe', E.t('No group')]].concat(E.groups().map((g, i) => ['Gruppe ' + (i + 1), g.GroupName || E.tf('Group %d', i + 1)]));
        const group = f.select(E.t('Group'), () => (common('Group') === undefined ? '' : common('Group')), value => {
            if (value === '') return;
            const target = value === 'new' ? 'Gruppe ' + free() : value;
            E.change(() => rows.forEach(r => { r.Group = target; }), true);
        }, mixed('Group').concat(groups, free() ? [['new', E.t('New group')]] : []));

        const look = [];
        const chips = [['ShowIcon', 'Icon'], ['ShowLabel', 'Label'], ['ShowValue', 'Value']].filter(([field]) => all(field))
            .map(([field, caption]) => [E.t(caption), () => rows.every(r => !!E.rowValue(r, field)), setAll(field)]);
        if (chips.length) look.push(h('div', { class: 'field' }, h('label', { text: E.t('Show') }), f.chips(...chips)));
        const sizes = [];
        if (all('FontSize')) sizes.push(f.number(E.t('Font size'), () => (common('FontSize') === undefined ? -1 : common('FontSize')), setAll('FontSize'), { min: -1, max: 100, suffix: 'px', empty: -1 }));
        if (all('TextColor')) sizes.push(f.color(E.t('Text color'), () => (common('TextColor') === undefined ? -1 : common('TextColor')), setAll('TextColor')));
        if (sizes.length) look.push(f.row(...sizes));
        if (E.hasStyle && E.hasStyle()) {
            look.push(h('button', { type: 'button', class: 'btn small', onclick: () => E.pasteStyle(rows) }, E.icon('paint-roller'), ' ', E.t('Paste appearance')));
        }

        const layout = [group];
        const align = [];
        if (all('VerticalAlignment')) align.push(f.select(E.t('Alignment'), () => (common('VerticalAlignment') === undefined ? '' : common('VerticalAlignment')),
            value => { if (value !== '') setAll('VerticalAlignment')(value); }, mixed('VerticalAlignment').concat(E.alignOptions())));
        if (all('ShowBorderLine')) align.push(f.checkbox(E.t('Line below the row'), () => rows.every(r => !!E.rowValue(r, 'ShowBorderLine')), setAll('ShowBorderLine')));
        if (align.length) layout.push(f.row(...align));

        container.replaceChildren(head,
            h('div', { class: 'type-picker' }, type),
            f.section(E.t('Arrangement'), ...layout),
            look.length ? f.section(E.t('Appearance'), ...look) : null,
            h('p', { class: 'muted', text: E.t('Shift, Cmd or Ctrl + click adds or removes rows.') }));
    };
})(window.UDTE);
