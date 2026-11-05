/* Universal Device Tile – Editor: Zeilenliste mit Gruppen. Eine Gruppe steht dort, wo ihre erste Zeile
   steht (so zeichnet die Kachel sie). Ziehen am Griff verschiebt Zeilen und ganze Gruppen; während des
   Ziehens ist die Liste selbst der Stand, beim Loslassen wird die Reihenfolge aus ihr gelesen. */
(function (E) {
    'use strict';
    const h = E.h;
    let listEl = null;
    let inspectorEl = null;
    let listView = null;
    let multiEl = null;
    let listScroll = 0;

    const usedGroups = () => {
        const used = new Set();
        E.rows().forEach(r => { const n = E.groupNumber(r.Group); if (n) used.add(n); });
        return used;
    };

    E.addRow = function (type) {
        const row = Object.assign(E.clone(E.s.rowDefaults), { DisplayType: type });
        E.change(() => { E.rows().push(row); }, true);
        const index = E.rows().length - 1;
        E.select(index);
        const kind = type === 'image' ? 'image' : (type === 'button' ? null : 'variable');
        if (kind) {
            E.pick(kind, 0, id => { E.change(() => { row[kind === 'image' ? 'ImageMedia' : 'Variable'] = id; }, true); if (kind === 'variable') E.suggestType(row); });
        }
    };

    E.duplicateRow = function (index) {
        E.change(d => { d.VariablesList.splice(index + 1, 0, E.clone(d.VariablesList[index])); }, true);
        E.select(index + 1);
    };

    E.deleteRow = function (index) {
        const row = E.rows()[index];
        E.change(d => { d.VariablesList.splice(index, 1); }, true);
        E.select(null);
        E.toast(E.tf('Row “%s” removed.', E.rowTitle(row)), '', [E.t('Undo'), () => E.undo()]);
    };

    const moveRow = (index, delta) => {
        const rows = E.rows();
        const to = index + delta;
        if (to < 0 || to >= rows.length) return;
        E.change(() => { const [r] = rows.splice(index, 1); rows.splice(to, 0, r); }, true);
        E.select(to);
        const item = listEl.querySelector('.row-item[data-index="' + to + '"]');
        if (item && !item.closest('[hidden]')) item.focus();
    };
    E.moveRow = moveRow; // Alt + Pfeil auch in der Vorschau (keys.js)

    const rowItem = (row, index) => {
        const problem = E.rowProblem(row);
        const item = h('div', {
            class: 'row-item' + (index === E.s.selected || E.s.picked.includes(row) ? ' selected' : '') + (problem ? ' has-problem' : ''),
            tabindex: '0', 'data-index': String(index), role: 'button'
        },
            h('span', { class: 'grip', title: E.t('Drag to move') }, E.icon('grip-dots-vertical')),
            E.icon(E.typeIcon(E.rowValue(row, 'DisplayType')), 'type'),
            h('span', { class: 'row-title', text: E.rowTitle(row) }),
            problem ? h('span', { class: 'problem', title: problem }, E.icon('triangle-exclamation')) : null);
        item.addEventListener('click', e => {
            if (e.target.closest('.grip')) return;
            if (e.shiftKey || e.metaKey || e.ctrlKey) E.toggleMulti(index); else E.select(index === E.s.selected ? null : index);
        });
        item.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); E.select(index); }
            if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); moveRow(index, e.key === 'ArrowUp' ? -1 : 1); }
            if (e.key === 'Delete') { e.preventDefault(); E.deleteRow(index); }
        });
        item.querySelector('.grip').addEventListener('pointerdown', e => startDrag(e, item));
        return item;
    };

    const toggle = (group, key, icon, title) => {
        const button = h('button', { type: 'button', class: 'btn small icon toggle' + (group[key] ? ' on' : ''), title: E.t(title), 'aria-pressed': String(!!group[key]) }, E.icon(icon));
        button.addEventListener('click', () => {
            E.change(() => { group[key] = !group[key]; });
            button.classList.toggle('on', !!group[key]);
            button.setAttribute('aria-pressed', String(!!group[key]));
        });
        return button;
    };

    const groupCard = (number, members) => {
        const group = E.groups()[number - 1];
        const iconPreview = h('button', { type: 'button', class: 'group-icon', title: E.t('Select icon') }, group.Groupicon ? E.iconSvg(group.Groupicon) : E.icon('layer-group'));
        const name = h('input', { type: 'text', class: 'group-name', maxlength: '100', value: group.GroupName || '', 'aria-label': E.t('Group name') });
        name.addEventListener('input', () => E.change(() => { group.GroupName = name.value; }));
        iconPreview.addEventListener('click', () => E.pickIcon(group.Groupicon || '', value => {
            E.change(() => { group.Groupicon = value; });
            iconPreview.replaceChildren(value ? E.iconSvg(value) : E.icon('layer-group'));
        }));
        const remove = h('button', { type: 'button', class: 'btn small icon', title: E.t('Dissolve group (rows stay)'), onclick: () => {
            E.change(d => { d.VariablesList.forEach(r => { if (E.groupNumber(r.Group) === number) r.Group = 'keine Gruppe'; }); }, true);
            E.s.extraGroups = E.s.extraGroups.filter(n => n !== number);
            E.emit('structure');
        } }, E.icon('object-ungroup'));
        const body = h('div', { class: 'group-body', 'data-group': String(number) },
            members.length ? members.map(([row, index]) => rowItem(row, index)) : h('div', { class: 'drop-hint', text: E.t('Drag rows here') }));
        const card = h('div', { class: 'group-card', 'data-group': String(number), style: '--group-color:' + E.groupColor(number) },
            h('div', { class: 'group-head' },
                h('span', { class: 'grip', title: E.t('Drag to move') }, E.icon('grip-dots-vertical')),
                iconPreview, name,
                toggle(group, 'ShowGroupName', 'tag', 'Show group name'),
                toggle(group, 'ShowAbove', 'arrow-up-to-line', 'Name above the group'),
                toggle(group, 'line', 'horizontal-rule', 'Line below the group'),
                toggle(group, 'stretch', 'arrows-left-right-to-line', 'Stretch elements'),
                remove),
            body);
        card.querySelector('.grip').addEventListener('pointerdown', e => startDrag(e, card));
        // Klick auf den Kopf (nicht auf Feld oder Knopf) wählt die Gruppe, wie ein Klick auf ihren Namen in der Vorschau
        card.querySelector('.group-head').addEventListener('click', e => {
            if (!e.target.closest('input, button')) E.selectGroup(number);
        });
        return card;
    };

    E.renderRows = function () {
        if (!listEl) return;
        const rows = E.rows();
        const seen = new Set();
        const parts = [];
        rows.forEach((row, index) => {
            const n = E.groupNumber(row.Group);
            if (!n) { parts.push(rowItem(row, index)); return; }
            if (seen.has(n)) return;
            seen.add(n);
            parts.push(groupCard(n, rows.map((r, i) => [r, i]).filter(([r]) => E.groupNumber(r.Group) === n)));
        });
        E.s.extraGroups.filter(n => !seen.has(n)).forEach(n => parts.push(groupCard(n, [])));
        if (parts.length === 0) parts.push(h('p', { class: 'muted pad', text: E.t('No rows yet. Add one or start with a template.') }));
        listEl.replaceChildren(...parts);
    };

    // ---------- Ziehen und Ablegen ----------
    let drag = null;

    // Die Listener hängen am Fenster: Verschieben im DOM nimmt dem Griff den Pointer-Capture
    function startDrag(e, el) {
        if (e.button !== 0 || drag) return;
        e.preventDefault();
        drag = { el, isGroup: el.classList.contains('group-card'), moved: false, pointer: e.pointerId };
        el.classList.add('dragging');
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
    }

    function onMove(e) {
        if (!drag || e.pointerId !== drag.pointer) return;
        e.preventDefault();
        const scroller = listEl.closest('.tab-body');
        const box = scroller.getBoundingClientRect();
        if (e.clientY < box.top + 40) scroller.scrollTop -= 12;
        if (e.clientY > box.bottom - 40) scroller.scrollTop += 12;
        const hit = document.elementFromPoint(e.clientX, e.clientY);
        if (!hit || drag.el.contains(hit)) return;
        const overRow = hit.closest('.row-item');
        const overCard = hit.closest('.group-card');
        const overBody = hit.closest('.group-body');
        if (drag.isGroup) {
            // Gruppen nur auf oberster Ebene: vor oder hinter einen Eintrag der Liste
            let top = overCard || overRow;
            if (top && top.parentElement !== listEl) top = top.closest('.group-card');
            if (!top || top.parentElement !== listEl) return;
            place(listEl, top, e.clientY);
        } else if (overRow && overRow.parentElement) {
            place(overRow.parentElement, overRow, e.clientY);
        } else if (overBody) {
            const hint = overBody.querySelector('.drop-hint');
            if (hint) hint.remove();
            overBody.appendChild(drag.el);
            drag.moved = true;
        } else if (overCard) {
            overCard.querySelector('.group-body').prepend(drag.el);
            drag.moved = true;
        }
    }

    function place(container, ref, y) {
        const r = ref.getBoundingClientRect();
        const before = y < r.top + r.height / 2;
        const anchor = before ? ref : ref.nextSibling;
        if (anchor !== drag.el && drag.el.nextSibling !== anchor) {
            container.insertBefore(drag.el, anchor);
            drag.moved = true;
        }
    }

    function onUp(e) {
        if (!drag || e.pointerId !== drag.pointer) return;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        drag.el.classList.remove('dragging');
        const moved = drag.moved;
        drag = null;
        if (moved) commitOrder();
    }

    /** Reihenfolge und Gruppen aus der Liste übernehmen; die gewählte Zeile bleibt gewählt. */
    function commitOrder() {
        const rows = E.rows();
        const selectedRow = E.s.selected !== null ? rows[E.s.selected] : null;
        const order = [];
        for (const child of listEl.children) {
            if (child.classList.contains('row-item')) {
                order.push([parseInt(child.dataset.index, 10), 'keine Gruppe']);
            } else if (child.classList.contains('group-card')) {
                const group = 'Gruppe ' + child.dataset.group;
                child.querySelectorAll('.row-item').forEach(item => order.push([parseInt(item.dataset.index, 10), group]));
            }
        }
        if (order.length !== rows.length) { E.renderRows(); return; }
        E.change(d => {
            d.VariablesList = order.map(([i, group]) => Object.assign(rows[i], { Group: group }));
        }, true);
        if (selectedRow) E.select(E.rows().indexOf(selectedRow));
    }

    E.newGroup = function () {
        const used = usedGroups();
        E.s.extraGroups.forEach(n => used.add(n));
        for (let n = 1; n <= 10; n++) {
            if (!used.has(n)) {
                E.s.extraGroups.push(n);
                E.renderRows();
                const card = listEl.querySelector('.group-card[data-group="' + n + '"] .group-name');
                if (card) { card.focus(); card.select(); }
                return;
            }
        }
        E.toast(E.t('All 10 groups are in use.'), 'error');
    };

    /** Liste oder Eigenschaften der gewählten Zeile (an derselben Stelle, kein Scrollen dazwischen). */
    const showView = () => {
        if (!listView) return;
        const tab = document.getElementById('tab-rows');
        const detail = E.s.selected !== null && !!E.rows()[E.s.selected];
        const multi = E.isMulti();
        multiEl.hidden = !multi;
        if (multi) E.renderMulti(multiEl);
        if (detail && !listView.hidden) listScroll = tab.scrollTop;
        const back = !detail && listView.hidden;
        listView.hidden = detail;
        inspectorEl.hidden = !detail;
        if (detail) {
            E.renderInspector(inspectorEl);
            tab.scrollTop = 0;
        } else if (back) {
            tab.scrollTop = listScroll;
        }
    };

    E.buildRowsTab = function () {
        const tab = document.getElementById('tab-rows');
        // „+ Zeile ▾“ mit den Anzeigetypen (wie das „+“ in der Vorschau) und „+ Gruppe“ in einer Leiste
        const menu = h('div', { class: 'menu' });
        menu.append(
            h('button', { type: 'button', class: 'btn small primary', onclick: e => { e.stopPropagation(); menu.classList.toggle('open'); } },
                E.icon('plus'), ' ', E.t('Row'), ' ', E.icon('chevron-down')),
            h('div', { class: 'menu-list left' }, h('div', { class: 'menu-title', text: E.t('Add row') }),
                ...E.TYPES.map(([type, icon, caption]) => h('button', { type: 'button', onclick: () => { menu.classList.remove('open'); E.addRow(type); } },
                    E.icon(icon), ' ', E.t(caption))),
                h('hr'), h('button', { type: 'button', onclick: () => { menu.classList.remove('open'); E.addRowsFromDevice(); } }, E.icon('microchip'), ' ', E.t('From a device…'))));
        document.addEventListener('click', e => { if (!menu.contains(e.target)) menu.classList.remove('open'); });
        const bar = h('div', { class: 'list-bar' }, menu,
            h('button', { type: 'button', class: 'btn small', onclick: E.newGroup }, E.icon('plus'), ' ', E.t('Group')),
            h('span', { class: 'grow' }),
            E.f.info(E.t('Keys: arrow keys select the previous or next row, Alt + arrow keys move it, Delete removes it, Ctrl/Cmd + D duplicates it, Escape ends the selection. This also works in the preview.')));
        listEl = h('div', { class: 'rows-list', id: 'rowsList' });
        multiEl = h('div', { class: 'multi-panel', hidden: true });
        listView = h('div', { class: 'list-view' }, bar, multiEl, listEl);
        inspectorEl = h('div', { class: 'inspector', id: 'rowInspector', hidden: true });
        inspectorEl.addEventListener('keydown', e => { if (e.key === 'Escape' && !e.target.closest('input, select, textarea')) E.select(null); });
        tab.replaceChildren(listView, inspectorEl);
        E.renderRows();
        showView();
    };

    E.on('loaded', () => E.buildRowsTab());
    // Beschriftung tippen: nur die Titel nachziehen, die Liste bleibt stehen (Fokus)
    E.on('draft', () => {
        if (!listEl) return;
        listEl.querySelectorAll('.row-item').forEach(item => {
            const row = E.rows()[parseInt(item.dataset.index, 10)];
            const title = item.querySelector('.row-title');
            if (row && title && title.textContent !== E.rowTitle(row)) title.textContent = E.rowTitle(row);
        });
    });
    E.on('structure', () => { E.renderRows(); showView(); });
    E.on('objects', () => { E.renderRows(); });
    E.on('select', () => {
        if (!listEl) return;
        listEl.querySelectorAll('.row-item').forEach(item => {
            const index = parseInt(item.dataset.index, 10);
            item.classList.toggle('selected', index === E.s.selected || E.s.picked.includes(E.rows()[index]));
        });
        listEl.querySelectorAll('.group-card').forEach(card => card.classList.toggle('selected', parseInt(card.dataset.group, 10) === E.s.selectedGroup));
        showView();
        const card = E.s.selectedGroup && listEl.querySelector('.group-card[data-group="' + E.s.selectedGroup + '"]');
        if (card) card.scrollIntoView({ block: 'nearest' });
    });
})(window.UDTE);
