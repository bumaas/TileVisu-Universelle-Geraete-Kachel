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

    /** Zuordnungen der Statusvariable neu einlesen; Einstellungen gleicher Werte bleiben erhalten. */
    E.reloadAssociations = async function (keep) {
        const statusId = E.s.draft.Status | 0;
        const answer = await E.api('associations', { status: statusId });
        if (answer.status !== 200) {
            E.toast(E.t('The associations could not be read.'), 'error');
            return;
        }
        const old = keep ? (E.s.draft.ProfilAssoziazionen || []) : [];
        const fresh = (answer.data.items || []).map(item => {
            const same = old.find(a => JSON.stringify(a.AssoziationValue) === JSON.stringify(item.AssoziationValue));
            return same ? Object.assign({}, item, same, { AssoziationName: item.AssoziationName }) : item;
        });
        E.change(d => { d.ProfilAssoziazionen = fresh; }, true);
        if (fresh.length === 0) {
            E.toast(E.t('The status variable has no associations in its presentation.'));
        }
    };

    function associationCard(a, i) {
        const f = E.f;
        const get = key => () => a[key];
        const set = (key, structural) => value => E.change(() => { a[key] = value; }, structural);
        const choice = a.Bildauswahl || 'none';
        const statusId = E.s.draft.Status | 0;
        const simulated = Object.prototype.hasOwnProperty.call(E.s.simulate, statusId) && JSON.stringify(E.s.simulate[statusId]) === JSON.stringify(a.AssoziationValue);
        const head = h('div', { class: 'assoc-head' },
            choice === 'symcon_icon' && a.SymconIcon ? E.iconSvg(a.SymconIcon) : E.icon('circle-small'),
            h('strong', { class: 'grow', text: a.AssoziationName || String(a.AssoziationValue) }),
            h('span', { class: 'muted', text: '= ' + JSON.stringify(a.AssoziationValue) }),
            h('button', { type: 'button', class: 'btn small' + (simulated ? ' on' : ''), title: E.t('Show this status in the preview'),
                onclick: () => { E.setSimulated(statusId, simulated ? undefined : a.AssoziationValue); renderStatus(); } }, E.icon('eye')));
        const parts = [
            head,
            f.row(f.select(E.t('Image Selection'), get('Bildauswahl'), set('Bildauswahl', true), IMAGE_CHOICES.map(([v, c]) => [v, E.t(c)])),
                f.color(E.t('Status Color'), get('StatusColor'), set('StatusColor')))
        ];
        if (choice === 'custom') parts.push(f.object(E.t('Custom Image'), get('EigenesBild'), set('EigenesBild', true), 'image'));
        if (choice === 'symcon_icon') {
            parts.push(f.icon(E.t('Icon'), get('SymconIcon'), value => { set('SymconIcon')(value); head.replaceChild(E.iconSvg(value), head.firstChild); }),
                f.color(E.t('Icon Color'), get('IconColor'), set('IconColor')));
        }
        parts.push(f.checkbox(E.t('Progressbar active'), get('ProgressbarActive'), set('ProgressbarActive')));
        return h('div', { class: 'assoc-card' + (simulated ? ' simulated' : ''), 'data-index': String(i) }, ...parts);
    }

    function renderStatus() {
        const tab = document.getElementById('tab-status');
        const f = E.f;
        const d = E.s.draft;
        const list = d.ProfilAssoziazionen || [];
        tab.replaceChildren(
            f.section(E.t('Status variable'),
                f.object(E.t('Status'), prop('Status'), async id => { E.change(dd => { dd.Status = id; }, true); if (id) await E.reloadAssociations(false); }, 'variable'),
                f.checkbox(E.t('Hide status variable'), prop('StatusHide'), setProp('StatusHide')),
                f.row(f.checkbox(E.t('Show Icon'), prop('StatusShowIcon'), setProp('StatusShowIcon')),
                    f.checkbox(E.t('Show Label'), prop('StatusShowLabel'), setProp('StatusShowLabel')),
                    f.checkbox(E.t('Show Value'), prop('StatusShowValue'), setProp('StatusShowValue'))),
                f.text(E.t('Custom Label (optional)'), prop('StatusLabel'), setProp('StatusLabel')),
                f.row(f.number(E.t('Font size (-1 = default)'), prop('StatusFontSize'), setProp('StatusFontSize'), { min: -1, max: 100, suffix: 'px' }),
                    f.select(E.t('Alignment'), prop('StatusAlignment'), setProp('StatusAlignment'), E.alignOptions()))),
            f.section(E.t('Default Image'),
                f.object(E.t('Default Image'), prop('DefaultImage'), setProp('DefaultImage', true), 'image'),
                h('p', { class: 'muted', text: E.t('Is always displayed as long as no other image is set, e.g., via associations.') }),
                f.icon(E.t('Default icon'), prop('DefaultIcon'), setProp('DefaultIcon', true)),
                f.color(E.t('Default icon color'), prop('DefaultIconColor'), setProp('DefaultIconColor')),
                h('p', { class: 'muted', text: E.t('The default icon is shown instead when there is no default image.') })),
            f.section(E.t('Profile associations'),
                h('div', { class: 'add-bar' }, h('button', { type: 'button', class: 'btn small', disabled: !(d.Status > 0),
                    onclick: () => E.reloadAssociations(true) }, E.icon('rotate'), ' ', E.t('Read again from the presentation'))),
                list.length ? h('div', { class: 'assoc-list' }, list.map(associationCard))
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
                f.row(f.number(E.t('Image transparency (values from 0 to 1)'), prop('Bildtransparenz'), setProp('Bildtransparenz'), { min: 0, max: 1, step: 0.1, float: true }),
                    f.color(E.t('Tile background color'), prop('Kachelhintergrundfarbe'), setProp('Kachelhintergrundfarbe')))),
            f.section(E.t('Spacing'),
                f.number(E.t('Vertical distance between items'), prop('ElementSpacing'), setProp('ElementSpacing'), { min: 0, max: 50, suffix: 'px' })),
            f.section(E.t('Progress bar'),
                f.row(f.number(E.t('Height'), prop('ProgressBarHeight'), setProp('ProgressBarHeight'), { min: 10, max: 40, suffix: 'px' }),
                    f.number(E.t('Border radius Progressbar and Button'), prop('ProgressBarBorderRadius'), setProp('ProgressBarBorderRadius'), { min: 0, max: 20, suffix: 'px' })),
                f.row(f.color(E.t('Background color'), prop('ProgressBarBackgroundColor'), setProp('ProgressBarBackgroundColor')),
                    f.number(E.t('Background opacity'), prop('ProgressBarBackgroundOpacity'), setProp('ProgressBarBackgroundOpacity'), { min: 0, max: 100, suffix: '%' }))),
            f.section(E.t('Buttons and groups'),
                f.row(f.number(E.t('Button height'), prop('ButtonHeight'), setProp('ButtonHeight'), { min: 10, max: 1000, suffix: 'px' }),
                    f.number(E.t('Group Name Size'), prop('GroupNameSize'), setProp('GroupNameSize'), { min: -1, max: 100, suffix: 'px' })))
        );
    }

    E.on('loaded', () => { renderStatus(); renderTile(); });
    E.on('structure', renderStatus);
    E.on('reset', () => { renderStatus(); renderTile(); });
})(window.UDTE);
