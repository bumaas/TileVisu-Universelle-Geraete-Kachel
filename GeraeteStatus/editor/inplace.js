/* Universal Device Tile – Editor: Bearbeiten direkt in der Vorschau. Die Brücke in der Kachel (bridge.js)
   meldet Doppelklicks auf Beschriftungen und Gruppennamen und gezogene Zeilen; preview.js reicht sie als
   Ereignis „bridge“ weiter. Das Eingabefeld liegt im Editor über der Kachel, nicht in ihr: die Kachel
   zeichnet ihre Zeilen bei jedem neuen Stand neu. */
(function (E) {
    'use strict';
    const h = E.h;

    /** Beschriftung direkt in der Vorschau ändern: Eingabefeld über dem Text der Zeile (Doppelklick). */
    const editLabel = (key, x, y) => {
        const d = E.previewDoc();
        const row = E.rows()[key];
        const item = d && d.querySelector('.variable-item[data-row-key="' + key + '"]');
        if (!row || !item) return;
        const live = ((E.s.payload && E.s.payload.variables) || []).find(v => String(v.key) === String(key)) || {};
        const clean = text => text.replace(/[\s ]+$/, '').replace(/:$/, '').trim();
        const spans = [...item.querySelectorAll('span')];
        const main = spans.find(s => live.label && clean(s.textContent) === live.label) || null;
        const second = live.secondVariable && live.secondVariable.label;
        const hit = d.elementFromPoint(x, y);
        const hitSpan = hit && hit.closest && hit.closest('span');
        let field = 'Label';
        let anchor = main;
        if (hitSpan && hitSpan !== main && second && clean(hitSpan.textContent) === second) {
            field = 'SecondVariableLabel';
            anchor = hitSpan;
        }
        inlineEdit((anchor || item).getBoundingClientRect(), {
            value: row[field] || '', max: 200,
            placeholder: (field === 'Label' ? live.label : second) || E.t('Label'),
            label: field === 'Label' ? E.t('Label') : E.t('Label of the second variable')
        }, value => {
            E.change(() => { row[field] = value; }, true);
            E.toast(value === '' ? E.t('Label removed: the tile shows the name of the variable.') : E.tf('Label: %s', value));
        });
    };

    /** Gruppenname direkt in der Vorschau ändern (Doppelklick auf den Namen; key = eine Zeile der Gruppe). */
    const editGroupName = (key, x, y) => {
        const d = E.previewDoc();
        const row = E.rows()[key];
        const number = row ? E.groupNumber(row.Group) : 0;
        const hit = d && d.elementFromPoint(x, y);
        const anchor = hit && hit.closest && hit.closest('.group-name-label, .group-name-above');
        if (!number || !anchor) return;
        const group = E.groups()[number - 1];
        inlineEdit(anchor.getBoundingClientRect(), {
            value: group.GroupName || '', max: 100, placeholder: E.t('Group name'), label: E.t('Group name')
        }, value => {
            E.change(() => { group.GroupName = value; }, true);
            E.toast(E.tf('Group name: %s', value || '–'));
        });
    };

    /** Eingabefeld über einer Stelle der Kachel (rect im iframe); Enter oder Klick daneben übernimmt, Escape verwirft. */
    const inlineEdit = (r, opts, apply) => {
        const f = E.previewFrame().getBoundingClientRect();
        const input = h('input', { type: 'text', class: 'label-edit', maxlength: String(opts.max), spellcheck: 'false', placeholder: opts.placeholder, 'aria-label': opts.label });
        input.value = opts.value;
        Object.assign(input.style, {
            left: Math.max(4, f.left + r.left - 4) + 'px', top: (f.top + r.top + r.height / 2 - 16) + 'px',
            width: Math.max(160, Math.min(f.width - 16, r.width + 60)) + 'px'
        });
        let done = false;
        const close = commit => {
            if (done) return;
            done = true;
            const value = input.value.trim();
            input.remove();
            if (commit && value !== opts.value) apply(value);
        };
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); close(true); }
            if (e.key === 'Escape') { e.preventDefault(); close(false); }
        });
        input.addEventListener('blur', () => close(true));
        document.body.appendChild(input);
        input.focus();
        input.select();
    };

    /** Reihenfolge aus der live sortierten Kachel übernehmen: rows = [{key, group}] in Kachel-Reihenfolge, group =
        Schlüssel einer Zeile der Gruppe zu Beginn des Ziehens (null = ohne Gruppe). Zeilen, die die Kachel nicht
        zeigt, bleiben hinter ihrem bisherigen Vorgänger. */
    const applyOrder = (entries, focus, mode) => {
        const rows = E.rows();
        const orig = rows.slice();
        if (!Array.isArray(entries) || entries.some(e => !orig[e.key] || (e.group !== null && !orig[e.group]))) return;
        const plan = entries.map(e => ({ row: orig[e.key], group: e.group === null ? 'keine Gruppe' : orig[e.group].Group }));
        const result = plan.map(p => p.row);
        orig.forEach((row, i) => {
            if (result.includes(row)) return;
            const prev = orig.slice(0, i).reverse().find(r => result.includes(r));
            result.splice(prev ? result.indexOf(prev) + 1 : 0, 0, row);
        });
        const focused = orig[focus];
        E.change(() => {
            plan.forEach(p => { p.row.Group = p.group; });
            rows.splice(0, rows.length, ...result);
        }, true);
        if (mode === 'group' && focused) E.selectGroup(E.groupNumber(focused.Group));
        else E.select(rows.indexOf(focused));
    };

    const pickGroupIcon = key => {
        const row = E.rows()[key];
        const number = row ? E.groupNumber(row.Group) : 0;
        if (!number) return;
        const group = E.groups()[number - 1];
        E.pickIcon(group.Groupicon || '', value => E.change(() => { group.Groupicon = value; }, true));
    };

    /** Doppelklick aufs Statusbild: Icon der Zuordnung, die die Vorschau gerade zeigt (ein Bild wird dabei zum Icon). */
    E.pickStatusIcon = function () {
        const index = E.s.payload ? E.s.payload.editorAssociation : null;
        const assoc = Number.isInteger(index) ? (E.s.draft.ProfilAssoziazionen || [])[index] : null;
        E.emit('tab', 'status');
        if (!assoc) {
            E.toast(E.t('No status association matches the value shown.'));
            return;
        }
        const current = assoc.Bildauswahl === 'symcon_icon' ? (assoc.SymconIcon || '') : '';
        E.pickIcon(current, value => {
            E.change(() => {
                assoc.Bildauswahl = value === '' ? 'none' : 'symcon_icon';
                assoc.SymconIcon = value;
            }, true);
            E.toast(E.tf('Status “%s”: %s', assoc.AssoziationName || String(assoc.AssoziationValue), value || E.t('No icon')));
        });
    };

    E.on('bridge', data => {
        const key = parseInt(data.key, 10);
        E.emit('tab', 'rows');
        if (data.udte === 'drop') {
            applyOrder(data.rows, parseInt(data.focus, 10), data.mode);
        } else if (data.udte === 'selectGroup') {
            const row = E.rows()[key];
            if (row && E.groupNumber(row.Group)) E.selectGroup(E.groupNumber(row.Group));
        } else if (data.udte === 'edit') {
            E.select(key);
            editLabel(key, Number(data.x), Number(data.y));
        } else if (data.udte === 'editGroup') {
            editGroupName(key, Number(data.x), Number(data.y));
        } else if (data.udte === 'editGroupIcon') {
            pickGroupIcon(key);
        } else if (data.udte === 'rowIcon') {
            E.select(key);
            E.toast(E.t('The icon of a row comes from the presentation of its variable.'));
        }
    });
})(window.UDTE);
