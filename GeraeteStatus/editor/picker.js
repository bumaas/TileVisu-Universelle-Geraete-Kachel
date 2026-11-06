/* Universal Device Tile – Editor: Objektauswahl als Baum mit Suche (nur lesend; gewählt wird erst
   mit „Speichern“ im Editor). kind: variable | script | image | object. */
(function (E) {
    'use strict';
    const h = E.h;

    const TYPE_ICON = { 0: 'folder', 1: 'cube', 2: 'square-poll-horizontal', 3: 'file-code', 4: 'clock', 5: 'image', 6: 'link' };
    const VAR_ICON = { 0: 'toggle-on', 1: 'hashtag', 2: 'gauge', 3: 'font' };

    const selectable = (kind, info) => {
        switch (kind) {
            case 'variable': return info.type === 2;
            case 'script': return info.type === 3;
            case 'image': return info.type === 5 && info.mediaType === 1;
            case 'instance': return info.type === 1;
            default: return true;
        }
    };

    const NEAR_KEY = 'udte-near-' + location.pathname; // Ordner der letzten Wahl, je Kachel

    const KIND_TITLE = {
        variable: 'Select variable', script: 'Select script', image: 'Select image', object: 'Select object', instance: 'Select device'
    };

    E.pick = function (kind, current, done) {
        const dialog = h('dialog', { class: 'picker' });
        const search = h('input', { type: 'search', placeholder: E.t('Search by name'), autocomplete: 'off' });
        const list = h('div', { class: 'tree', role: 'tree' });
        const close = () => { dialog.close(); dialog.remove(); };
        dialog.append(
            h('div', { class: 'dialog-head' }, h('h2', { text: E.t(KIND_TITLE[kind] || KIND_TITLE.object) }),
                h('button', { type: 'button', class: 'btn icon', title: E.t('Close'), onclick: close }, E.icon('xmark'))),
            search, list,
            h('div', { class: 'dialog-foot' }, h('span', { class: 'muted', text: E.t('Double-click or Enter selects.') }),
                h('button', { type: 'button', class: 'btn', onclick: close }, E.t('Cancel')))
        );
        document.body.appendChild(dialog);
        dialog.addEventListener('cancel', e => { e.preventDefault(); close(); });

        const choose = info => {
            E.s.objects[String(info.id)] = Object.assign({}, E.s.objects[String(info.id)], info);
            if (info.parent > 0) {
                try { localStorage.setItem(NEAR_KEY, String(info.parent)); } catch (_) { /* nur für diese Sitzung */ }
            }
            close();
            done(info.id);
            E.ensureObjects([info.id]).then(() => E.emit('objects'));
        };

        const node = (info, depth) => {
            const canPick = selectable(kind, info);
            const icon = info.type === 2 ? (VAR_ICON[info.varType] || 'square') : (TYPE_ICON[info.type] || 'square');
            const toggle = h('button', { type: 'button', class: 'twisty', tabindex: '-1', 'aria-hidden': 'true' },
                info.children ? E.icon('chevron-right') : null);
            const label = h('div', {
                class: 'node' + (canPick ? ' pickable' : '') + (info.id === current ? ' current' : ''),
                role: 'treeitem', tabindex: '0', style: 'padding-left:' + (8 + depth * 18) + 'px', 'aria-expanded': info.children ? 'false' : null
            }, toggle, E.icon(icon, 'type'), h('span', { class: 'name', text: info.name || ('#' + info.id) }),
                info.path ? h('span', { class: 'path', text: info.path }) : null,
                info.type === 2 ? h('span', { class: 'value', text: info.value || '' }) : null);
            const children = h('div', { class: 'children', hidden: true });
            let loaded = false;
            const expand = async () => {
                if (!info.children) return;
                const open = children.hidden;
                children.hidden = !open;
                label.setAttribute('aria-expanded', String(open));
                toggle.classList.toggle('open', open);
                if (open && !loaded) {
                    loaded = true;
                    await fill(children, info.id, depth + 1);
                }
            };
            toggle.addEventListener('click', e => { e.stopPropagation(); expand(); });
            label.addEventListener('click', () => (canPick ? label.focus() : expand()));
            label.addEventListener('dblclick', () => canPick && choose(info));
            label.addEventListener('keydown', e => {
                if (e.key === 'Enter') { e.preventDefault(); canPick ? choose(info) : expand(); }
                if (e.key === 'ArrowRight' && children.hidden) expand();
                if (e.key === 'ArrowLeft' && !children.hidden) expand();
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    const all = [...list.querySelectorAll('.node')].filter(n => n.offsetParent !== null);
                    const i = all.indexOf(label) + (e.key === 'ArrowDown' ? 1 : -1);
                    if (all[i]) all[i].focus();
                }
            });
            if (canPick) {
                const pickButton = h('button', { type: 'button', class: 'btn small pick', onclick: e => { e.stopPropagation(); choose(info); } }, E.t('Select'));
                label.appendChild(pickButton);
            }
            return h('div', { class: 'tree-item' }, label, children);
        };

        const fill = async (container, parent, depth) => {
            container.replaceChildren(h('div', { class: 'muted pad', text: E.t('Loading…') }));
            const answer = await E.api('tree', { parent });
            container.replaceChildren();
            const items = answer.status === 200 ? answer.data.items : [];
            items.forEach(info => container.appendChild(node(info, depth)));
            if (answer.status === 200 && answer.data.more) {
                container.appendChild(h('div', { class: 'muted pad', text: E.t('Only the first 200 objects are shown. Use the search.') }));
            }
            if (items.length === 0) {
                container.appendChild(h('div', { class: 'muted pad', text: E.t('Empty') }));
            }
        };

        /** Wo die Auswahl beginnt: beim Ordner des aktuellen Objekts, sonst der letzten Wahl, sonst bei den
            Variablen der Zeilen über der gewählten (beim Einrichten eines Geräts liegen sie nebeneinander). */
        const parentOf = id => {
            const info = id > 0 ? E.s.objects[String(id)] : null;
            return info && info.parent > 0 ? info.parent : 0;
        };
        const contextParent = () => {
            if (parentOf(current)) return parentOf(current);
            let stored = 0;
            try { stored = parseInt(localStorage.getItem(NEAR_KEY) || '0', 10) || 0; } catch (_) { /* ohne Speicher */ }
            if (stored > 0) return stored;
            const rows = E.rows();
            const ids = [];
            for (let i = E.s.selected === null ? -1 : Math.min(E.s.selected, rows.length - 1); i >= 0; i--) ids.push(rows[i].Variable | 0);
            rows.forEach(r => ids.push(r.Variable | 0));
            ids.push(E.s.draft.Status | 0);
            return ids.map(parentOf).find(p => p > 0) || 0;
        };

        let near = null;
        const showDefault = async () => {
            if (near === null) {
                // Kurzinfos (mit Elternteil) für die Kandidaten holen, die der Editor noch nicht kennt
                await E.ensureObjects([current, E.s.draft.Status | 0, ...E.rows().map(r => r.Variable | 0)]);
                near = contextParent();
                // Gerät wählen: bei den Nachbarn des Geräts beginnen, nicht in ihm (Kurzinfo des Geräts vorher holen)
                if (near > 0 && kind === 'instance') await E.ensureObjects([near]);
                const at =near > 0 && kind === 'instance' ? E.s.objects[String(near)] : null;
                if (at && at.type === 1 && at.parent > 0) near = at.parent;
            }
            if (near > 0) await E.ensureObjects([near]);
            const info = near > 0 ? E.s.objects[String(near)] : null;
            if (!info) {
                fill(list, 0, 0);
                return;
            }
            const nearBody = h('div', {});
            const allBody = h('div', {});
            const up = h('button', { type: 'button', class: 'btn small', title: E.t('One level up'), onclick: () => { near = info.parent | 0; showDefault(); } },
                E.icon('arrow-turn-up'), ' ', E.t('Up'));
            list.replaceChildren(
                h('div', { class: 'tree-section' }, h('h3', {}, h('span', { text: E.t('Next to the last selection') })),
                    h('div', { class: 'near-head' }, E.icon(TYPE_ICON[info.type] || 'folder', 'type'),
                        h('span', { class: 'grow' }, h('strong', { text: info.name || ('#' + info.id) }),
                            info.path ? h('span', { class: 'path', text: ' · ' + info.path }) : null), up)),
                nearBody,
                h('div', { class: 'tree-section' }, h('h3', { text: E.t('All objects') })),
                allBody);
            await Promise.all([fill(nearBody, near, 0), fill(allBody, 0, 0)]);
            const mark = list.querySelector('.node.current');
            if (mark) mark.scrollIntoView({ block: 'nearest' });
        };

        let timer = null;
        search.addEventListener('input', () => {
            clearTimeout(timer);
            timer = setTimeout(async () => {
                const q = search.value.trim();
                if (q.length < 2) {
                    showDefault();
                    return;
                }
                list.replaceChildren(h('div', { class: 'muted pad', text: E.t('Searching…') }));
                const answer = await E.api('search', { q, kind });
                if (search.value.trim() !== q) return;
                list.replaceChildren();
                const items = answer.status === 200 ? answer.data.items : [];
                items.forEach(info => list.appendChild(node(Object.assign({}, info, { children: false }), 0)));
                if (items.length === 0) list.appendChild(h('div', { class: 'muted pad', text: E.t('No matches') }));
                if (answer.data.more) list.appendChild(h('div', { class: 'muted pad', text: E.t('More matches: refine the search.') }));
            }, 250);
        });

        showDefault();
        dialog.showModal();
        search.focus();
    };
})(window.UDTE);
