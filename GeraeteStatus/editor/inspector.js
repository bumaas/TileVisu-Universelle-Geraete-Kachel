/* Universal Device Tile – Editor: Eigenschaften der gewählten Zeile. Sichtbar sind nur die Felder,
   die zum Anzeigetyp passen (dieselbe Matrix wie der Zeilendialog im Formular). */
(function (E) {
    'use strict';
    const h = E.h;

    E.TYPES = [
        ['text', 'font', 'Text'], ['progress', 'bars-progress', 'Progress Bar'], ['slider', 'sliders-simple', 'Slider'],
        ['button', 'hand-pointer', 'Button'], ['image', 'image', 'Image']
    ];
    E.typeIcon = type => (E.TYPES.find(t => t[0] === type) || E.TYPES[0])[1];

    const visible = (type, field) => {
        const m = E.s.matrix[type] || E.s.matrix.text || {};
        return m[field] !== undefined ? !!m[field] : true;
    };

    /** Anzeigename einer Zeile: Beschriftung, sonst Name des Ziels. */
    E.rowTitle = row => {
        if (row.Label) return row.Label;
        const type = E.rowValue(row, 'DisplayType');
        const id = type === 'image' ? row.ImageMedia : (row.Variable || row.ScriptID || row.OpenObjectId);
        if (!id) return type === 'image' ? E.t('Image without media') : E.t('No variable selected');
        const info = E.s.objects[String(id)];
        return info ? (info.name || '#' + id) : (info === null ? E.tf('Missing object #%d', id) : '#' + id);
    };

    /** Warum eine Zeile nicht erscheint oder nicht schaltet; '' wenn alles passt. */
    E.rowProblem = row => {
        const type = E.rowValue(row, 'DisplayType');
        const variable = row.Variable | 0;
        if (type === 'image') return row.ImageMedia ? '' : E.t('Select a media object, otherwise the row is not shown.');
        if (type === 'button' && !variable && !(row.ScriptID | 0) && !(row.OpenObjectId | 0)) return E.t('Select a variable, a script or an object.');
        if (type !== 'button' && !variable) return E.t('Select a variable, otherwise the row is not shown.');
        const info = E.s.objects[String(variable)];
        if (info === null) return E.t('The variable no longer exists.');
        if ((type === 'button' || type === 'slider') && info && info.action === false) return E.t('The variable has no action: the tile shows it, but cannot switch it.');
        return '';
    };

    const groupOptions = () => [['keine Gruppe', E.t('No group')]].concat(E.groups().map((g, i) =>
        ['Gruppe ' + (i + 1), (g.GroupName || ('Group ' + (i + 1))) + ' (' + E.tf('Group %d', i + 1) + ')']));

    E.renderInspector = function (container) {
        const index = E.s.selected;
        container.replaceChildren();
        if (index === null) {
            container.appendChild(h('p', { class: 'muted pad', text: E.t('Select a row in the list or in the preview.') }));
            return;
        }
        const row = E.rows()[index];
        const type = E.rowValue(row, 'DisplayType');
        const get = field => () => E.rowValue(row, field);
        const set = (field, structural) => value => E.change(() => { row[field] = value; }, structural);
        const show = field => visible(type, field);
        const f = E.f;

        const head = h('div', { class: 'inspector-head' },
            E.icon(E.typeIcon(type)), h('strong', { class: 'grow', text: E.rowTitle(row) }),
            h('button', { type: 'button', class: 'btn small', title: E.t('Duplicate'), onclick: () => E.duplicateRow(index) }, E.icon('copy')),
            h('button', { type: 'button', class: 'btn small danger', title: E.t('Delete'), onclick: () => E.deleteRow(index) }, E.icon('trash')));

        const typeSeg = h('div', { class: 'seg types' }, E.TYPES.map(([id, icon, caption]) => h('button', {
            type: 'button', class: id === type ? 'active' : '', title: E.t(caption),
            onclick: () => { if (id !== type) E.change(() => { row.DisplayType = id; }, true); }
        }, E.icon(icon), h('span', { text: E.t(caption) }))));

        const problem = E.rowProblem(row);
        const parts = [head, typeSeg, problem ? h('p', { class: 'warn', text: problem }) : null];

        const target = [];
        if (show('Variable')) target.push(f.object(E.t('Variable'), get('Variable'), set('Variable', true), 'variable'));
        if (show('ScriptID')) target.push(f.object(E.t('Script (instead of a variable)'), get('ScriptID'), set('ScriptID', true), 'script'));
        if (show('OpenObjectId') && E.s.openObject) target.push(f.object(E.t('Open object (instead of a variable)'), get('OpenObjectId'), set('OpenObjectId', true), 'object'));
        if (show('ImageMedia')) {
            target.push(f.object(E.t('Media object'), get('ImageMedia'), set('ImageMedia', true), 'image'));
            target.push(f.row(f.number(E.t('Width'), get('ImageWidth'), set('ImageWidth'), { min: 1, max: 100, suffix: '%' }),
                f.number(E.t('Border radius'), get('ImageBorderRadius'), set('ImageBorderRadius'), { min: 0, max: 100, suffix: 'px' })));
        }
        parts.push(f.section(E.t('Source'), ...target));

        const look = [];
        if (show('Label')) {
            const id = row.Variable || row.ScriptID || row.OpenObjectId;
            const info = id ? E.s.objects[String(id)] : null;
            look.push(f.text(E.t('Label'), get('Label'), value => { E.change(() => { row.Label = value; }); head.querySelector('strong').textContent = E.rowTitle(row); },
                { placeholder: info ? info.name : E.t('Name of the variable') }));
        }
        const toggles = ['ShowIcon', 'ShowLabel', 'ShowValue'].filter(show)
            .map(field => f.checkbox(E.t({ ShowIcon: 'Show Icon', ShowLabel: 'Show Label', ShowValue: 'Show Value' }[field]), get(field), set(field)));
        if (toggles.length) look.push(f.row(...toggles));
        const sizes = [];
        if (show('FontSize')) sizes.push(f.number(E.t('Font size (-1 = default)'), get('FontSize'), set('FontSize'), { min: -1, max: 100, suffix: 'px' }));
        if (show('TextColor')) sizes.push(f.color(E.t('Text color'), get('TextColor'), set('TextColor')));
        if (sizes.length) look.push(f.row(...sizes));
        if (show('ProgressColor1')) look.push(f.row(f.color(E.t('Bar color 1'), get('ProgressColor1'), set('ProgressColor1')),
            f.color(E.t('Bar color 2'), get('ProgressColor2'), set('ProgressColor2'))));
        if (show('SliderColor1')) look.push(f.row(f.color(E.t('Slider color 1'), get('SliderColor1'), set('SliderColor1')),
            f.color(E.t('Slider color 2'), get('SliderColor2'), set('SliderColor2'))));
        if (show('boolButtonColor')) look.push(f.row(f.color(E.t('Button color'), get('boolButtonColor'), set('boolButtonColor')),
            f.number(E.t('Button width'), get('ButtonWidth'), set('ButtonWidth'), { min: 20, max: 500, suffix: 'px' })));
        const layout = [];
        if (show('VerticalAlignment')) layout.push(f.select(E.t('Alignment'), get('VerticalAlignment'), set('VerticalAlignment'), E.alignOptions()));
        if (show('ShowBorderLine')) layout.push(f.checkbox(E.t('Line below the row'), get('ShowBorderLine'), set('ShowBorderLine')));
        if (layout.length) look.push(f.row(...layout));
        look.push(f.select(E.t('Group'), get('Group'), set('Group', true), groupOptions()));
        parts.push(f.section(E.t('Appearance'), ...look));

        if (show('InactiveDisplay') || show('SecondVariable')) {
            const bar = [];
            if (show('InactiveDisplay')) bar.push(f.select(E.t('When the progress bar is inactive'), get('InactiveDisplay'), set('InactiveDisplay'),
                [['dash', E.t('Show “-”')], ['value', E.t('Show current value')], ['hide', E.t('Hide row')]]));
            if (show('SecondVariable')) {
                bar.push(f.object(E.t('Second variable'), get('SecondVariable'), set('SecondVariable', true), 'variable'));
                bar.push(f.checkbox(E.t('Use 2nd variable as marker (e.g. target value)'), get('UseSecondVariableAsTarget'), set('UseSecondVariableAsTarget')));
                bar.push(f.text(E.t('Label of the second variable'), get('SecondVariableLabel'), set('SecondVariableLabel')));
                bar.push(f.row(f.checkbox(E.t('Show Icon'), get('SecondVariableShowIcon'), set('SecondVariableShowIcon')),
                    f.checkbox(E.t('Show Label'), get('SecondVariableShowLabel'), set('SecondVariableShowLabel')),
                    f.checkbox(E.t('Show Value'), get('SecondVariableShowValue'), set('SecondVariableShowValue'))));
            }
            parts.push(f.section(E.t('Progress bar'), ...bar));
        }

        const sim = simulationBox(row, type);
        if (sim) parts.push(sim);
        container.replaceChildren(...parts.filter(Boolean));
    };

    /** Testwert nur für die Vorschau (Balken, Regler): schickt nie etwas an die Variable. */
    function simulationBox(row, type) {
        const id = row.Variable | 0;
        if (!id || (type !== 'progress' && type !== 'slider')) return null;
        const live = (E.s.payload && (E.s.payload.variables || []).find(v => v.key === E.s.selected)) || {};
        const min = Number(live.progressMin ?? 0);
        const max = Number(live.progressMax ?? 100);
        const active = Object.prototype.hasOwnProperty.call(E.s.simulate, id);
        const range = h('input', { type: 'range', min, max, step: (max - min) / 100 || 1 });
        range.value = active ? E.s.simulate[id] : Number(live.rawValue ?? min);
        const out = h('output', { text: active ? String(E.s.simulate[id]) : E.t('Real value') });
        range.addEventListener('input', () => { out.textContent = range.value; E.setSimulated(id, Number(range.value)); });
        const reset = h('button', { type: 'button', class: 'btn small', onclick: () => { E.setSimulated(id, undefined); out.textContent = E.t('Real value'); } }, E.t('Real value'));
        return E.f.section(E.t('Test value in the preview'), h('div', { class: 'sim-row' }, range, out, reset),
            h('p', { class: 'muted', text: E.t('Only the preview shows the test value; the variable is not changed.') }));
    }
})(window.UDTE);
