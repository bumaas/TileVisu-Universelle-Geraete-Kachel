/* Universal Device Tile – Editor: Vorschau mit der echten Kachel. Das iframe bekommt einmal das HTML,
   das die Visualisierung auch bekommt (IPS_GetVisualizationTile), danach per handleMessage den Stand
   des Entwurfs (api=preview). Bedienung in der Vorschau schaltet nichts: requestAction der Kachel geht
   an diese Seite und wird verworfen. */
(function (E) {
    'use strict';
    const h = E.h;

    const THEMES = {
        dark: { card: '#1c1c1e', content: '#f2f2f7', accent: '#00cdab', page: '#000000' },
        light: { card: '#ffffff', content: '#1c1c1e', accent: '#00b89c', page: '#e9e9ee' }
    };
    const SIZES = [
        ['s', '1×1', 210, 210], ['m', '2×1', 430, 210], ['l', '2×2', 430, 430], ['xl', '4×2', 870, 430], ['max', 'Maximized', 0, 0]
    ];

    let size = 'l';
    let custom = { w: 430, h: 430 }; // frei gezogene Größe (Greifer unten rechts)
    let theme = 'dark';
    let ready = false;
    let timer = null;
    let poll = null;
    let pending = false;
    let lastSent = '';

    try {
        size = localStorage.getItem('udte-size') || size;
        theme = localStorage.getItem('udte-theme') || theme;
        const saved = JSON.parse(localStorage.getItem('udte-custom') || 'null');
        if (saved && saved.w > 0 && saved.h > 0) custom = { w: saved.w | 0, h: saved.h | 0 };
    } catch (_) { /* ohne Speicher */ }

    const frame = () => document.getElementById('tile');
    const doc = () => { try { return frame().contentDocument; } catch (_) { return null; } };
    E.previewFrame = frame;
    E.previewDoc = doc;

    const themeCss = () => {
        const t = THEMES[theme] || THEMES.dark;
        return ':root{--accent-color:' + t.accent + ';--content-color:' + t.content + ';--card-color:' + t.card + '}'
            + 'html,body{background:var(--card-color)}body{font-size:14px!important;margin:12px 20px 15px 20px!important}'
            + '.udte-selected{outline:2px dashed var(--accent-color);outline-offset:3px;border-radius:6px}'
            + '.variable-item{cursor:pointer}'
            + '#udte-add{display:flex;align-items:center;justify-content:center;width:100%;height:30px;margin:6px 0 0;padding:0;'
            + 'border:1.5px dashed currentColor;border-radius:8px;background:transparent;color:var(--content-color);opacity:.35;'
            + 'font:300 22px/1 sans-serif;cursor:pointer}'
            + '#udte-add:hover,#udte-add:focus-visible{opacity:1;color:var(--accent-color);outline:none}'
            + '.udte-drag-source{opacity:.6;outline:2px dashed var(--accent-color);outline-offset:3px;border-radius:6px;box-shadow:0 8px 22px rgba(0,0,0,.35)}'
            + '.udte-drag-part{opacity:.6}.udte-empty-group{opacity:.3}'
            + '.udte-drop-group{outline:1.5px solid var(--accent-color);outline-offset:5px;border-radius:8px}'
            + '#udte-group-outline{position:absolute;z-index:40;pointer-events:none;border:2px dashed var(--accent-color);border-radius:8px}'
            + '.group-name-label,.group-name-above{cursor:grab}'
            + 'html.udte-dragging .udte-selected{outline:none}html.udte-dragging #udte-group-outline{display:none}'
            + '.udte-placeholder{border:1.5px dashed rgba(127,127,127,.6);border-radius:8px;padding:4px 8px;box-sizing:border-box;max-width:100%}'
            + '#udte-status-placeholder>span:first-child{white-space:nowrap}html,body{overflow-x:clip}'
            + '.udte-placeholder{min-width:0}.udte-placeholder .variable-label{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
            + '#div2:has(.udte-placeholder){min-width:0}#udte-status-placeholder{max-width:100%}#udte-status-placeholder>span:first-child{flex:none}'
            + '.udte-placeholder .variable-value{opacity:.6;font-style:italic;flex:0 100 auto!important;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
            + '.variable-group-item:has(>.udte-placeholder){min-width:0;max-width:100%}'
            + '#udte-status-placeholder{display:flex;align-items:center;gap:8px;margin:4px 0 8px;font-weight:bold}'
            + '.udte-pick{margin-left:auto;padding:3px 10px;border-radius:6px;border:1px solid var(--accent-color);background:transparent;'
            + 'color:var(--accent-color);font:inherit;font-size:12px;font-weight:600;cursor:pointer;flex:none}'
            + '.udte-pick:hover{background:var(--accent-color);color:var(--card-color)}'
            + 'html.udte-dragging,html.udte-dragging *{user-select:none!important;cursor:grabbing!important}';
    };

    /* Das iframe hat bewusst kein sandbox: die Kachel läuft in der Visualisierung genauso mit der Herkunft
       von Symcon, und Editor wie Brücke greifen direkt auf ihr Dokument zu (Thema, Hervorhebung, Stand). */

    /** Brücke in der Kachel (bridge.js, gleiche Version wie dieser Teil): Klicks, Doppelklicks, „+“, Ziehen. */
    const bridge = () => {
        const own = document.querySelector('script[src*="f=preview.js"]');
        const src = own ? new URL(own.getAttribute('src').replace('f=preview.js', 'f=bridge.js'), location.href).href : '';
        const settings = JSON.stringify({ add: E.t('Add row') }).replace(/</g, '\\u003c');
        const attr = src.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
        return '<script>window.UDTE_BRIDGE=' + settings + ';<\/script>' + (src ? '<script src="' + attr + '"><\/script>' : '');
    };

    /** Auswahl des Anzeigetyps unter dem „+“ der Vorschau; die neue Zeile kommt ans Ende der Liste. */
    const addMenu = document.getElementById('addMenu');
    const closeAddMenu = () => { addMenu.hidden = true; };
    const openAddMenu = () => {
        const d = doc();
        const plus = d && d.getElementById('udte-add');
        if (!plus) return;
        addMenu.replaceChildren(h('div', { class: 'menu-title', text: E.t('Add row') }),
            ...E.TYPES.map(([type, icon, caption]) => h('button', {
                type: 'button', role: 'menuitem',
                onclick: () => { closeAddMenu(); E.emit('tab', 'rows'); E.addRow(type); }
            }, E.icon(icon), ' ', E.t(caption))));
        addMenu.hidden = false;
        const f = frame().getBoundingClientRect();
        const r = plus.getBoundingClientRect();
        const width = addMenu.offsetWidth;
        const height = addMenu.offsetHeight;
        let top = f.top + r.bottom + 6;
        if (top + height > window.innerHeight - 8) top = Math.max(8, f.top + r.top - height - 6);
        const left = Math.min(Math.max(8, f.left + r.left + r.width / 2 - width / 2), window.innerWidth - width - 8);
        Object.assign(addMenu.style, { left: left + 'px', top: top + 'px' });
        addMenu.querySelector('button').focus();
    };
    document.addEventListener('click', e => { if (!addMenu.hidden && !addMenu.contains(e.target)) closeAddMenu(); });
    addMenu.addEventListener('keydown', e => {
        const items = [...addMenu.querySelectorAll('button')];
        const at = items.indexOf(document.activeElement);
        if (e.key === 'Escape') {
            e.preventDefault();
            closeAddMenu();
            const plus = doc() && doc().getElementById('udte-add');
            if (plus) plus.focus();
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            items[(at + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length].focus();
        }
    });
    window.addEventListener('resize', closeAddMenu);
    document.getElementById('stageArea').addEventListener('scroll', closeAddMenu, { passive: true });

    const applyTheme = () => {
        const t = THEMES[theme] || THEMES.dark;
        document.getElementById('stageArea').style.background = t.page;
        const frameBox = document.getElementById('tileFrame');
        frameBox.style.background = t.card;
        frameBox.style.color = t.content;
        const d = doc();
        const style = d && d.getElementById('udte-theme');
        if (style) style.textContent = themeCss();
    };

    const applySize = () => {
        let [, , width, height] = SIZES.find(s => s[0] === size) || SIZES[2];
        if (size === 'custom') {
            width = custom.w;
            height = custom.h;
        }
        const box = document.getElementById('tileFrame');
        box.classList.toggle('maximized', size === 'max');
        box.style.width = width ? width + 'px' : '';
        box.style.height = height ? height + 'px' : '';
        requestAnimationFrame(placeImageHandle);
        const badge = document.getElementById('sizeBadge');
        const rect = box.getBoundingClientRect();
        badge.textContent = Math.round(rect.width) + ' × ' + Math.round(rect.height);
    };

    const remember = () => {
        try {
            localStorage.setItem('udte-size', size);
            localStorage.setItem('udte-custom', JSON.stringify(custom));
        } catch (_) { /* ohne Speicher */ }
    };

    /** Greifer unten rechts: die Kachel steht mittig, deshalb wächst die Breite um das Doppelte der Bewegung. */
    const setupGrip = () => {
        const grip = document.getElementById('resizeGrip');
        const box = document.getElementById('tileFrame');
        const area = document.getElementById('stageArea');
        const limit = (w, h) => {
            const maxW = Math.max(180, area.clientWidth - 32);
            return { w: Math.round(Math.min(maxW, Math.max(180, w)) / 5) * 5, h: Math.round(Math.min(1600, Math.max(160, h)) / 5) * 5 };
        };
        const resizeTo = (w, h) => {
            custom = limit(w, h);
            size = 'custom';
            applySize();
            buildBar();
        };
        let start = null;
        grip.addEventListener('pointerdown', e => {
            if (e.button !== 0) return;
            e.preventDefault();
            const rect = box.getBoundingClientRect();
            start = { cx: rect.left + rect.width / 2, top: rect.top, pointer: e.pointerId };
            document.body.classList.add('resizing');
            window.addEventListener('pointermove', move);
            window.addEventListener('pointerup', up);
            window.addEventListener('pointercancel', up);
        });
        const move = e => {
            if (!start || e.pointerId !== start.pointer) return;
            resizeTo(2 * (e.clientX - start.cx), e.clientY - start.top);
        };
        const up = e => {
            if (!start || e.pointerId !== start.pointer) return;
            start = null;
            document.body.classList.remove('resizing');
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            window.removeEventListener('pointercancel', up);
            remember();
        };
        grip.addEventListener('keydown', e => {
            const step = e.shiftKey ? 50 : 10;
            const rect = box.getBoundingClientRect();
            const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
            if (!d) return;
            e.preventDefault();
            resizeTo(rect.width + d[0], rect.height + d[1]);
            remember();
        });
        grip.addEventListener('dblclick', () => { size = 'l'; remember(); buildBar(); applySize(); });
        window.addEventListener('resize', () => { if (size === 'custom') applySize(); });
    };

    /** Griff über dem Statusbild: liegt über #div1 der Kachel, solange das Bild sichtbar ist. */
    const placeImageHandle = () => {
        const handle = document.getElementById('imageHandle');
        const d = doc();
        const image = d && d.getElementById('div1');
        const f = frame();
        if (!image || image.classList.contains('hidden') || image.offsetWidth === 0) {
            handle.hidden = true;
            return;
        }
        const r = image.getBoundingClientRect();
        Object.assign(handle.style, { left: (f.offsetLeft + r.left) + 'px', top: (f.offsetTop + r.top) + 'px', width: r.width + 'px', height: r.height + 'px' });
        handle.hidden = false;
        E.emit('handlePlaced');
    };

    /** Statusbild an eine Kante ziehen: die nächste Kante der Kachel wird BildPosition. */
    const setupImageDrag = () => {
        const handle = document.getElementById('imageHandle');
        const zones = document.getElementById('dropZones');
        const labels = { top: 'top', bottom: 'bottom', left: 'left', right: 'right' };
        zones.querySelectorAll('[data-edge]').forEach(z => { z.replaceChildren(h('span', { text: E.t(labels[z.dataset.edge]) })); });
        let drag = null;
        const edgeAt = (x, y) => {
            const r = frame().getBoundingClientRect();
            const d = { left: (x - r.left) / r.width, right: (r.right - x) / r.width, top: (y - r.top) / r.height, bottom: (r.bottom - y) / r.height };
            return Object.keys(d).reduce((a, b) => (d[a] <= d[b] ? a : b));
        };
        const mark = edge => zones.querySelectorAll('[data-edge]').forEach(z => z.classList.toggle('active', z.dataset.edge === edge));
        handle.addEventListener('dblclick', e => { e.preventDefault(); E.pickStatusIcon(); });
        handle.addEventListener('pointerdown', e => {
            if (e.button !== 0) return;
            e.preventDefault();
            drag = { x: e.clientX, y: e.clientY, pointer: e.pointerId, moved: false, edge: null };
            window.addEventListener('pointermove', move);
            window.addEventListener('pointerup', up);
            window.addEventListener('pointercancel', up);
        });
        const move = e => {
            if (!drag || e.pointerId !== drag.pointer) return;
            if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
            if (!drag.moved) {
                drag.moved = true;
                const f = frame();
                Object.assign(zones.style, { left: f.offsetLeft + 'px', top: f.offsetTop + 'px', width: f.offsetWidth + 'px', height: f.offsetHeight + 'px' });
                zones.hidden = false;
                document.body.classList.add('dragging-image');
            }
            drag.edge = edgeAt(e.clientX, e.clientY);
            mark(drag.edge);
        };
        const up = e => {
            if (!drag || e.pointerId !== drag.pointer) return;
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            window.removeEventListener('pointercancel', up);
            const { moved, edge } = drag;
            drag = null;
            zones.hidden = true;
            document.body.classList.remove('dragging-image');
            if (!moved) {
                E.emit('tab', 'status'); // Klick: Statuseinstellungen
            } else if (edge && E.s.draft && E.s.draft.BildPosition !== edge) {
                E.change(d => { d.BildPosition = edge; });
                E.emit('reset');
                E.toast(E.tf('Image position: %s', E.t(edge)));
            }
        };
    };

    const highlight = () => {
        placeImageHandle();
        const d = doc();
        if (!d) return;
        d.querySelectorAll('.udte-selected').forEach(el => el.classList.remove('udte-selected'));
        const outline = d.getElementById('udte-group-outline');
        if (outline) outline.remove();
        if (E.s.selectedGroup) {
            // Gruppe: gestrichelter Rahmen um Name (oben) und Kasten, im Fluss der Kachel (scrollt mit)
            const member = E.rows().findIndex(r => E.groupNumber(r.Group) === E.s.selectedGroup);
            const item = member >= 0 && d.querySelector('.variable-item[data-row-key="' + member + '"]');
            const box = item && item.closest('.variable-group');
            if (box) {
                const above = box.previousElementSibling && box.previousElementSibling.classList.contains('group-name-above') ? box.previousElementSibling : null;
                const rects = [box, above].filter(Boolean).map(el => el.getBoundingClientRect());
                const win = d.defaultView;
                const top = Math.min(...rects.map(r => r.top)) + win.scrollY - 5;
                const left = Math.min(...rects.map(r => r.left)) + win.scrollX - 5;
                const frameEl = d.createElement('div');
                frameEl.id = 'udte-group-outline';
                Object.assign(frameEl.style, {
                    top: top + 'px', left: left + 'px',
                    width: (Math.max(...rects.map(r => r.right)) + win.scrollX + 5 - left) + 'px',
                    height: (Math.max(...rects.map(r => r.bottom)) + win.scrollY + 5 - top) + 'px'
                });
                d.body.appendChild(frameEl);
                box.scrollIntoView({ block: 'nearest' });
            }
        }
        if (E.s.selected !== null) {
            const el = d.querySelector('.variable-item[data-row-key="' + E.s.selected + '"]');
            if (el) {
                el.classList.add('udte-selected');
                el.scrollIntoView({ block: 'nearest' });
            }
        }
    };

    // Während in der Kachel gezogen wird, bleibt ihr Stand stehen (neu gezeichnete Zeilen brächen das Ziehen ab)
    let holding = false;
    let held = null;

    const push = payload => {
        if (holding) { held = payload; return; }
        const win = frame().contentWindow;
        if (!ready || !win || typeof win.handleMessage !== 'function') return;
        win.handleMessage(E.previewTransform ? E.previewTransform(E.clone(payload)) : E.clone(payload));
        setTimeout(() => { highlight(); E.emit('pushed', payload); }, 60); // inplace.js: Platzhalter
    };
    E.repaint = () => { if (E.s.payload) push(E.s.payload); };

    /** Vorschau-Stand holen; während einer Anfrage wird höchstens eine weitere vorgemerkt. */
    E.refreshPreview = async function () {
        if (!E.s.draft) return;
        if (pending) { E.refreshPreview.again = true; return; }
        pending = true;
        const body = { config: E.s.draft, simulate: E.s.simulate };
        const answer = await E.api('preview', body);
        pending = false;
        if (answer.status === 200) {
            E.s.payload = answer.data.payload;
            E.s.previewErrors = answer.data.errors || [];
            E.emit('preview', answer.data);
            const json = JSON.stringify(answer.data.payload);
            if (json !== lastSent) {
                lastSent = json;
                push(answer.data.payload);
            }
        }
        if (E.refreshPreview.again) {
            E.refreshPreview.again = false;
            E.refreshPreview();
        }
    };

    const schedule = () => { clearTimeout(timer); timer = setTimeout(E.refreshPreview, 250); };

    E.loadTile = async function () {
        const answer = await E.api('tile', {});
        if (answer.status !== 200) {
            E.toast(E.t('The preview could not be loaded.'), 'error');
            return;
        }
        ready = false;
        lastSent = '';
        const html = String(answer.data.html || '') + '<style id="udte-theme">' + themeCss() + '</style>' + bridge();
        const f = frame();
        f.onload = () => {
            ready = true;
            applyTheme();
            E.refreshPreview();
            try {
                f.contentWindow.addEventListener('scroll', () => { placeImageHandle(); closeAddMenu(); }, { passive: true });
                f.contentWindow.addEventListener('resize', placeImageHandle);
            } catch (_) { /* ohne Zugriff kein Griff */ }
        };
        f.srcdoc = html;
    };

    const buildBar = () => {
        const sizes = document.getElementById('sizes');
        sizes.replaceChildren(...SIZES.map(([id, caption]) => h('button', {
            type: 'button', class: id === size ? 'active' : '', title: E.t('Tile size'),
            onclick: () => { size = id; remember(); buildBar(); applySize(); }
        }, id === 'max' ? E.t(caption) : caption)),
            h('button', {
                type: 'button', class: size === 'custom' ? 'active' : '', title: E.t('Size drawn with the handle at the bottom right'),
                onclick: () => { size = 'custom'; remember(); buildBar(); applySize(); }
            }, E.icon('up-right-and-down-left-from-center'), ' ', custom.w + '×' + custom.h));
        const themes = document.getElementById('themes');
        themes.replaceChildren(...[['dark', 'moon', 'Dark'], ['light', 'sun', 'Light']].map(([id, icon, caption]) => h('button', {
            type: 'button', class: id === theme ? 'active' : '', title: E.t(caption),
            onclick: () => { theme = id; try { localStorage.setItem('udte-theme', id); } catch (_) {} buildBar(); applyTheme(); }
        }, E.icon(icon))));
    };

    /** Status simulieren: Auswahl aus den Status-Zuordnungen, „Echter Wert“ hebt die Simulation auf. */
    const buildSimulation = () => {
        const select = document.getElementById('simStatus');
        const statusId = E.s.draft ? (E.s.draft.Status | 0) : 0;
        const list = (E.s.draft && E.s.draft.ProfilAssoziazionen) || [];
        const current = statusId > 0 && Object.prototype.hasOwnProperty.call(E.s.simulate, statusId) ? JSON.stringify(E.s.simulate[statusId]) : '';
        select.replaceChildren(h('option', { value: '', text: E.t('Real value') }),
            ...list.map(a => h('option', { value: JSON.stringify(a.AssoziationValue), text: (a.AssoziationName || String(a.AssoziationValue)) })));
        select.value = current;
        select.disabled = statusId <= 0 || list.length === 0;
        select.closest('label').classList.toggle('active', current !== '');
    };

    E.setSimulated = function (variableId, value) {
        if (value === undefined) {
            delete E.s.simulate[variableId];
        } else {
            E.s.simulate[variableId] = value;
        }
        buildSimulation();
        schedule();
    };

    window.addEventListener('message', event => {
        if (event.source !== frame().contentWindow) return;
        const data = event.data || {};
        if (data.udte === 'add') {
            if (addMenu.hidden) openAddMenu(); else closeAddMenu();
            return;
        }
        closeAddMenu();
        if (data.udte === 'dragstart') {
            holding = true;
        } else if (data.udte === 'dragcancel') {
            // die Brücke hat die alte Reihenfolge selbst wiederhergestellt; nur einen inzwischen angekommenen Stand nachreichen
            holding = false;
            if (held) { const payload = held; held = null; push(payload); }
        } else if (data.udte === 'drop') {
            holding = false;
            held = null; // der neue Stand kommt mit der Änderung, ein angehaltener zeigte die alte Reihenfolge
            E.emit('bridge', data);
        } else if (['selectGroup', 'edit', 'editGroup', 'editGroupIcon', 'rowIcon', 'pick'].includes(data.udte)) {
            E.emit('bridge', data); // Bearbeiten in der Vorschau: inplace.js
        } else if (data.udte === 'select') {
            E.select(parseInt(data.key, 10));
            E.emit('tab', 'rows');
        } else if (data.udte === 'status') {
            E.emit('tab', 'status');
        } else if (data.ident !== undefined || data.type === 'openObject') {
            E.toast(E.t('Operation is switched off in the preview.'));
        }
    });

    setupGrip();
    setupImageDrag();

    E.on('loaded', () => {
        document.getElementById('tileTitle').textContent = E.s.instance.name;
        buildBar();
        applySize();
        applyTheme();
        buildSimulation();
    });
    E.on('draft', () => { buildSimulation(); schedule(); });
    E.on('select', highlight);

    document.getElementById('simStatus').addEventListener('change', e => {
        const statusId = E.s.draft.Status | 0;
        E.setSimulated(statusId, e.target.value === '' ? undefined : JSON.parse(e.target.value));
    });

    // Live-Werte: alle 5 s, nicht im Hintergrund
    const startPoll = () => { clearInterval(poll); poll = setInterval(() => { if (!document.hidden) E.refreshPreview(); }, 5000); };
    document.addEventListener('visibilitychange', () => { if (!document.hidden) E.refreshPreview(); });
    E.on('loaded', startPoll);
})(window.UDTE);
