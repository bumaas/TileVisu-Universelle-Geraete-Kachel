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

    const themeCss = () => {
        const t = THEMES[theme] || THEMES.dark;
        return ':root{--accent-color:' + t.accent + ';--content-color:' + t.content + ';--card-color:' + t.card + '}'
            + 'html,body{background:var(--card-color)}body{font-size:14px!important;margin:12px 20px 15px 20px!important}'
            + '.udte-selected{outline:2px dashed var(--accent-color);outline-offset:3px;border-radius:6px}'
            + '.variable-item{cursor:pointer}';
    };

    /** Klicks in der Kachel wählen die Zeile im Editor; die Kachel selbst reagiert weiter wie gewohnt. */
    const bridge = '<script>document.addEventListener("click",function(e){var t=e.target;var i=t.closest&&t.closest(".variable-item");'
        + 'if(i){parent.postMessage({udte:"select",key:i.getAttribute("data-row-key")},"*");return;}'
        + 'if(t.closest&&t.closest("#status-container,#image,#div1")){parent.postMessage({udte:"status"},"*");}},true);<\/script>';

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

    const highlight = () => {
        const d = doc();
        if (!d) return;
        d.querySelectorAll('.udte-selected').forEach(el => el.classList.remove('udte-selected'));
        if (E.s.selected !== null) {
            const el = d.querySelector('.variable-item[data-row-key="' + E.s.selected + '"]');
            if (el) {
                el.classList.add('udte-selected');
                el.scrollIntoView({ block: 'nearest' });
            }
        }
    };

    const push = payload => {
        const win = frame().contentWindow;
        if (!ready || !win || typeof win.handleMessage !== 'function') return;
        win.handleMessage(E.clone(payload));
        setTimeout(highlight, 60);
    };

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
        const html = String(answer.data.html || '') + '<style id="udte-theme">' + themeCss() + '</style>' + bridge;
        const f = frame();
        f.onload = () => { ready = true; applyTheme(); E.refreshPreview(); };
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
        if (data.udte === 'select') {
            E.select(parseInt(data.key, 10));
            E.emit('tab', 'rows');
        } else if (data.udte === 'status') {
            E.emit('tab', 'status');
        } else if (data.ident !== undefined || data.type === 'openObject') {
            E.toast(E.t('Operation is switched off in the preview.'));
        }
    });

    setupGrip();

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
