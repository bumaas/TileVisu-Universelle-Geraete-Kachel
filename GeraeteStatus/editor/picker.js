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
            default: return true;
        }
    };

    const KIND_TITLE = {
        variable: 'Select variable', script: 'Select script', image: 'Select image', object: 'Select object'
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

        let timer = null;
        search.addEventListener('input', () => {
            clearTimeout(timer);
            timer = setTimeout(async () => {
                const q = search.value.trim();
                if (q.length < 2) {
                    fill(list, 0, 0);
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

        fill(list, 0, 0);
        dialog.showModal();
        search.focus();
    };
})(window.UDTE);
