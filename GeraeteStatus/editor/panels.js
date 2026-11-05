/* Universal Device Tile – Editor: Reiter „Status“ (Statusvariable, Zuordnungen, Standardbild) und
   „Kachel“ (Bild, Hintergrund, Abstände, Balken, Schalter, Gruppen). */
(function (E) {
    'use strict';
    const h = E.h;

    const IMAGE_CHOICES = [
        ['none', 'None'], ['symcon_icon', 'Icon'], ['custom', 'Custom Image'],
        ['wm_aus', 'Washing Machine - Off'], ['wm_an', 'Washing Machine - On'], ['dryer_off', 'Dryer - Off'], ['dryer_on', 'Dryer - On']
    ];

    const prop = name => () => E.s.draft[name];
    const setProp = (name, structural) => value => E.change(d => { d[name] = value; }, structural);

    // Werte vergleichen wie die Kachel: false = 0, true = 1, "2" = 2
    const asNumber = v => (typeof v === 'boolean' ? Number(v) : (v === '' || v === null || v === undefined || isNaN(Number(v)) ? null : Number(v)));
    const sameValue = (a, b) => JSON.stringify(a) === JSON.stringify(b) || (asNumber(a) !== null && asNumber(a) === asNumber(b));
    const LOOK = ['Bildauswahl', 'EigenesBild', 'SymconIcon', 'IconColor', 'StatusColor', 'ProgressbarActive'];

    /**
     * Einstellungen (Bild, Icon, Farben, Balken) aus presets auf items übertragen: vom gleichen Wert, sonst von der
     * nächstkleineren Zuordnung – so wählt auch die Kachel aus. Name und Wert bleiben die von items.
     */
    E.mergeAssociations = function (items, presets) {
        return items.map(item => {
            let source = presets.find(p => sameValue(p.AssoziationValue, item.AssoziationValue));
            const n = asNumber(item.AssoziationValue);
            if (!source && n !== null) {
                source = presets.filter(p => asNumber(p.AssoziationValue) !== null && asNumber(p.AssoziationValue) <= n)
                    .sort((a, b) => asNumber(b.AssoziationValue) - asNumber(a.AssoziationValue))[0];
            }
            const merged = Object.assign({}, item);
            if (source) LOOK.forEach(key => { if (key in source) merged[key] = source[key]; });
            return merged;
        });
    };

    /** Zuordnungen der Statusvariable neu einlesen; mit keep übernehmen sie Bilder und Farben der bisherigen. */
    E.reloadAssociations = async function (keep) {
        const statusId = E.s.draft.Status | 0;
        const answer = await E.api('associations', { status: statusId });
        if (answer.status !== 200) {
            E.toast(E.t('The associations could not be read.'), 'error');
            return;
        }
        const old = keep ? (E.s.draft.ProfilAssoziazionen || []) : [];
        const fresh = E.mergeAssociations(answer.data.items || [], old);
        E.s.assocDetail = null;
        E.change(d => { d.ProfilAssoziazionen = fresh; }, true);
        if (fresh.length === 0) {
            E.toast(E.t('The status variable has no associations in its presentation.'));
        }
    };

    const hex = v => '#' + (Math.max(0, v | 0) & 0xFFFFFF).toString(16).padStart(6, '0');
    const statusId = () => E.s.draft.Status | 0;
    const isSimulated = a => Object.prototype.hasOwnProperty.call(E.s.simulate, statusId()) && JSON.stringify(E.s.simulate[statusId()]) === JSON.stringify(a.AssoziationValue);
    const simButton = a => h('button', { type: 'button', class: 'btn small icon' + (isSimulated(a) ? ' on' : ''), title: E.t('Show this status in the preview'),
        onclick: e => { e.stopPropagation(); E.setSimulated(statusId(), isSimulated(a) ? undefined : a.AssoziationValue); renderStatus(); } }, E.icon('eye'));
    const thumb = a => {
        const choice = a.Bildauswahl || 'none';
        const el = h('span', { class: 'thumb' }, choice === 'symcon_icon' && a.SymconIcon ? E.iconSvg(a.SymconIcon) : E.icon(choice === 'none' ? 'circle-small' : 'image'));
        if (choice === 'symcon_icon' && a.IconColor >= 0 && a.IconColor !== 16777215) el.style.color = hex(a.IconColor);
        return el;
    };

    /** Zuordnung in der Liste: Bild/Icon, Name, Wert, Statusfarbe, Vorschau; Klick öffnet die Details. */
    function assocItem(a, i) {
        const item = h('div', { class: 'row-item assoc-item' + (isSimulated(a) ? ' simulated' : ''), tabindex: '0', role: 'button' },
            thumb(a), h('span', { class: 'row-title', text: a.AssoziationName || String(a.AssoziationValue) }),
            h('span', { class: 'muted small', text: '= ' + JSON.stringify(a.AssoziationValue) }),
            a.StatusColor >= 0 && a.StatusColor !== 16777215 ? h('span', { class: 'color-dot', style: 'background:' + hex(a.StatusColor) }) : null,
            simButton(a), E.icon('chevron-right', 'chevron'));
        const open = () => { E.s.assocDetail = i; renderStatus(); document.getElementById('tab-status').scrollTop = 0; };
        item.addEventListener('click', open);
        item.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); open(); } });
        return item;
    }

    /** Details einer Zuordnung an Stelle der Liste, mit „← Alle Zuordnungen“. */
    function assocDetail(a) {
        const f = E.f;
        const get = key => () => a[key];
        const set = (key, structural) => value => E.change(() => { a[key] = value; }, structural);
        const choice = a.Bildauswahl || 'none';
        const back = () => { E.s.assocDetail = null; renderStatus(); };
        const parts = [
            h('div', { class: 'detail-head' },
                h('button', { type: 'button', class: 'btn small back', onclick: back }, E.icon('chevron-left'), ' ', E.t('All associations')),
                thumb(a), h('strong', { class: 'grow', text: a.AssoziationName || String(a.AssoziationValue) }),
                h('span', { class: 'muted small', text: '= ' + JSON.stringify(a.AssoziationValue) }), simButton(a)),
            f.row(f.select(E.t('Image Selection'), get('Bildauswahl'), set('Bildauswahl', true), IMAGE_CHOICES.map(([v, c]) => [v, E.t(c)])),
                f.color(E.t('Status Color'), get('StatusColor'), set('StatusColor')))
        ];
        if (choice === 'custom') parts.push(f.object(E.t('Custom Image'), get('EigenesBild'), set('EigenesBild', true), 'image'));
        if (choice === 'symcon_icon') parts.push(f.icon(E.t('Icon'), get('SymconIcon'), set('SymconIcon', true)), f.color(E.t('Icon Color'), get('IconColor'), set('IconColor')));
        parts.push(f.checkbox(E.t('Progressbar active'), get('ProgressbarActive'), set('ProgressbarActive')));
        const box = h('div', { class: 'assoc-detail' }, ...parts);
        box.addEventListener('keydown', e => { if (e.key === 'Escape' && !e.target.closest('input, select, textarea')) back(); });
        return box;
    }

    /** Standardbild: Bild (Medium), Icon (Font Awesome, mit Farbe) oder keins. */
    function defaultImageSection() {
        const f = E.f;
        const d = E.s.draft;
        const mode = E.s.defaultMode || (d.DefaultImage > 0 ? 'image' : (d.DefaultIcon ? 'icon' : 'none'));
        const choose = value => {
            E.s.defaultMode = value;
            if (value === 'image') {
                E.change(dd => { dd.DefaultIcon = ''; }, true);
                if (!(d.DefaultImage > 0)) E.pick('image', 0, id => E.change(dd => { dd.DefaultImage = id; }, true));
            } else if (value === 'icon') {
                E.change(dd => { dd.DefaultImage = 0; }, true);
                if (!d.DefaultIcon) E.pickIcon('', v => E.change(dd => { dd.DefaultIcon = v; }, true));
            } else {
                E.change(dd => { dd.DefaultImage = 0; dd.DefaultIcon = ''; }, true);
            }
        };
        const parts = [f.segments(() => mode, choose, [['image', E.t('Image'), 'image'], ['icon', E.t('Icon'), 'icons'], ['none', E.t('None'), 'ban']])];
        if (mode === 'image') parts.push(f.object(E.t('Default Image'), prop('DefaultImage'), setProp('DefaultImage', true), 'image'));
        if (mode === 'icon') parts.push(f.icon(E.t('Default icon'), prop('DefaultIcon'), setProp('DefaultIcon', true)),
            f.color(E.t('Default icon color'), prop('DefaultIconColor'), setProp('DefaultIconColor')));
        return f.section([E.t('Default Image'), E.t('Is always displayed as long as no other image is set, e.g., via associations.')], ...parts);
    }

    function renderStatus() {
        const tab = document.getElementById('tab-status');
        const f = E.f;
        const d = E.s.draft;
        const list = d.ProfilAssoziazionen || [];
        if (E.s.assocDetail !== null && E.s.assocDetail !== undefined && list[E.s.assocDetail]) {
            tab.replaceChildren(assocDetail(list[E.s.assocDetail]));
            return;
        }
        E.s.assocDetail = null;
        tab.replaceChildren(
            f.section(E.t('Status variable'),
                f.object(E.t('Status'), prop('Status'), async id => { E.s.assocDetail = null; E.change(dd => { dd.Status = id; }, true); if (id) await E.reloadAssociations(true); }, 'variable'),
                h('div', { class: 'field' }, h('label', { text: E.t('Show') }), f.chips(
                    [E.t('Icon'), prop('StatusShowIcon'), setProp('StatusShowIcon')],
                    [E.t('Label'), prop('StatusShowLabel'), setProp('StatusShowLabel')],
                    [E.t('Value'), prop('StatusShowValue'), setProp('StatusShowValue')])),
                f.checkbox(E.t('Hide status variable'), prop('StatusHide'), setProp('StatusHide')),
                f.text(E.t('Custom Label (optional)'), prop('StatusLabel'), setProp('StatusLabel')),
                f.row(f.number(E.t('Font size'), prop('StatusFontSize'), setProp('StatusFontSize'), { min: -1, max: 100, suffix: 'px', empty: -1 }),
                    f.select(E.t('Alignment'), prop('StatusAlignment'), setProp('StatusAlignment'), E.alignOptions()))),
            defaultImageSection(),
            f.section(E.t('Profile associations'),
                h('div', { class: 'list-bar' }, h('button', { type: 'button', class: 'btn small', disabled: !(d.Status > 0),
                    onclick: () => E.reloadAssociations(true) }, E.icon('rotate'), ' ', E.t('Read again from the presentation'))),
                list.length ? h('div', { class: 'rows-list' }, list.map(assocItem))
                    : h('p', { class: 'muted', text: E.t('Select a status variable with a presentation that has values (e.g. Off, Running, Done).') }))
        );
    }

    function renderTile() {
        const tab = document.getElementById('tab-tile');
        const f = E.f;
        tab.replaceChildren(
            f.section(E.t('Device Image'),
                f.row(f.select(E.t('Image position'), prop('BildPosition'), setProp('BildPosition'),
                    [['left', E.t('left')], ['top', E.t('top')], ['bottom', E.t('bottom')], ['right', E.t('right')]]),
                    f.number(E.t('Image width'), prop('BildBreite'), setProp('BildBreite'), { min: 0, max: 2000, suffix: 'px', float: true })),
                f.row(f.select(E.t('Alignment'), prop('ImageAlignment'), setProp('ImageAlignment'), E.alignOptions()),
                    f.checkbox(E.t('Show border line'), prop('ShowBorderLine'), setProp('ShowBorderLine')))),
            f.section(E.t('Background'),
                f.checkbox(E.t('Standard background image'), prop('BG_Off'), setProp('BG_Off')),
                f.object(E.t('Background image'), prop('bgImage'), setProp('bgImage', true), 'image'),
                f.row(f.number([E.t('Image transparency'), E.t('Values from 0 to 1')], prop('Bildtransparenz'), setProp('Bildtransparenz'), { min: 0, max: 1, step: 0.1, float: true }),
                    f.color(E.t('Tile background color'), prop('Kachelhintergrundfarbe'), setProp('Kachelhintergrundfarbe')))),
            f.section(E.t('Spacing'),
                f.number(E.t('Vertical distance between items'), prop('ElementSpacing'), setProp('ElementSpacing'), { min: 0, max: 50, suffix: 'px' })),
            f.section(E.t('Progress bar'),
                f.row(f.number(E.t('Height'), prop('ProgressBarHeight'), setProp('ProgressBarHeight'), { min: 10, max: 40, suffix: 'px' }),
                    f.number([E.t('Corner radius'), E.t('For progress bars and buttons')], prop('ProgressBarBorderRadius'), setProp('ProgressBarBorderRadius'), { min: 0, max: 20, suffix: 'px' })),
                f.row(f.color(E.t('Background color'), prop('ProgressBarBackgroundColor'), setProp('ProgressBarBackgroundColor')),
                    f.number(E.t('Background opacity'), prop('ProgressBarBackgroundOpacity'), setProp('ProgressBarBackgroundOpacity'), { min: 0, max: 100, suffix: '%' }))),
            f.section(E.t('Buttons and groups'),
                f.row(f.number(E.t('Button height'), prop('ButtonHeight'), setProp('ButtonHeight'), { min: 10, max: 1000, suffix: 'px' }),
                    f.number(E.t('Group Name Size'), prop('GroupNameSize'), setProp('GroupNameSize'), { min: -1, max: 100, suffix: 'px', empty: -1 })))
        );
    }

    E.on('loaded', () => { E.s.assocDetail = null; E.s.defaultMode = null; renderStatus(); renderTile(); });
    E.on('structure', renderStatus);
    E.on('reset', () => { E.s.defaultMode = null; renderStatus(); renderTile(); });
})(window.UDTE);
