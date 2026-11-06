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
        if (index === null || !E.rows()[index]) return;
        const row = E.rows()[index];
        const type = E.rowValue(row, 'DisplayType');
        const get = field => () => E.rowValue(row, field);
        const set = (field, structural) => value => E.change(() => { row[field] = value; }, structural);
        const show = field => visible(type, field);
        const f = E.f;

        // Kopf: zurück zur Liste, Name, Duplizieren, Löschen (bleibt beim Scrollen oben)
        const title = h('strong', { class: 'grow', text: E.rowTitle(row) });
        const head = h('div', { class: 'detail-head' },
            h('button', { type: 'button', class: 'btn small back', title: E.t('All rows'), onclick: () => E.select(null) }, E.icon('chevron-left'), ' ', E.t('All rows')),
            title,
            h('button', { type: 'button', class: 'btn small icon', title: E.t('Duplicate'), onclick: () => E.duplicateRow(index) }, E.icon('copy')),
            h('button', { type: 'button', class: 'btn small icon danger', title: E.t('Delete'), onclick: () => E.deleteRow(index) }, E.icon('trash')));

        // Anzeigetyp: nur Icons (Tooltip), der gewählte Typ als Text daneben
        const typeName = (E.TYPES.find(t => t[0] === type) || E.TYPES[0])[2];
        const typeRow = h('div', { class: 'type-picker' },
            f.segments(() => type, id => E.change(() => { row.DisplayType = id; }, true), E.TYPES.map(([id, icon, caption]) => [id, E.t(caption), icon]), true),
            h('span', { class: 'type-name', text: E.t(typeName) }));

        const problem = E.rowProblem(row);
        const parts = [head, typeRow, problem ? h('p', { class: 'warn', text: problem }) : null];

        const target = [];
        if (show('Variable')) target.push(f.object(E.t('Variable'), get('Variable'), id => { set('Variable', true)(id); if (id) E.suggestType(row); }, 'variable'));
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
            look.push(f.text(E.t('Label'), get('Label'), value => { E.change(() => { row.Label = value; }); title.textContent = E.rowTitle(row); },
                { placeholder: info ? info.name : E.t('Name of the variable') }));
        }
        const chips = [['ShowIcon', 'Icon'], ['ShowLabel', 'Label'], ['ShowValue', 'Value']].filter(([field]) => show(field))
            .map(([field, caption]) => [E.t(caption), get(field), set(field)]);
        if (chips.length) look.push(h('div', { class: 'field' }, h('label', { text: E.t('Show') }), f.chips(...chips)));
        const sizes = [];
        if (show('FontSize')) sizes.push(f.number(E.t('Font size'), get('FontSize'), set('FontSize'), { min: -1, max: 100, suffix: 'px', empty: -1 }));
        if (show('TextColor')) sizes.push(f.color(E.t('Text color'), get('TextColor'), set('TextColor')));
        if (sizes.length) look.push(f.row(...sizes));
        parts.push(f.section(E.t('Appearance'), ...look));

        const colors = [];
        if (show('ProgressColor1')) colors.push(f.row(f.color(E.t('Bar color 1'), get('ProgressColor1'), set('ProgressColor1')),
            f.color(E.t('Bar color 2'), get('ProgressColor2'), set('ProgressColor2'))));
        if (show('SliderColor1')) colors.push(f.row(f.color(E.t('Slider color 1'), get('SliderColor1'), set('SliderColor1')),
            f.color(E.t('Slider color 2'), get('SliderColor2'), set('SliderColor2'))));
        if (show('boolButtonColor')) colors.push(f.row(f.color(E.t('Button color'), get('boolButtonColor'), set('boolButtonColor')),
            f.number(E.t('Button width'), get('ButtonWidth'), set('ButtonWidth'), { min: 20, max: 500, suffix: 'px' })));
        if (colors.length) parts.push(f.section(E.t('Colors'), ...colors));

        const layout = [f.select(E.t('Group'), get('Group'), set('Group', true), groupOptions())];
        const align = [];
        if (show('VerticalAlignment')) align.push(f.select(E.t('Alignment'), get('VerticalAlignment'), set('VerticalAlignment'), E.alignOptions()));
        if (show('ShowBorderLine')) align.push(f.checkbox(E.t('Line below the row'), get('ShowBorderLine'), set('ShowBorderLine')));
        if (align.length) layout.push(f.row(...align));
        parts.push(f.section(E.t('Arrangement'), ...layout));

        if (show('InactiveDisplay') || show('SecondVariable')) {
            const bar = [];
            if (show('InactiveDisplay')) bar.push(f.select(E.t('When the progress bar is inactive'), get('InactiveDisplay'), set('InactiveDisplay'),
                [['dash', E.t('Show “-”')], ['value', E.t('Show current value')], ['hide', E.t('Hide row')]]));
            if (show('SecondVariable')) {
                bar.push(f.object(E.t('Second variable'), get('SecondVariable'), set('SecondVariable', true), 'variable'));
                bar.push(f.checkbox(E.t('Use 2nd variable as marker (e.g. target value)'), get('UseSecondVariableAsTarget'), set('UseSecondVariableAsTarget')));
                bar.push(f.text(E.t('Label of the second variable'), get('SecondVariableLabel'), set('SecondVariableLabel')));
                bar.push(h('div', { class: 'field' }, h('label', { text: E.t('Show') }), f.chips(
                    [E.t('Icon'), get('SecondVariableShowIcon'), set('SecondVariableShowIcon')],
                    [E.t('Label'), get('SecondVariableShowLabel'), set('SecondVariableShowLabel')],
                    [E.t('Value'), get('SecondVariableShowValue'), set('SecondVariableShowValue')])));
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
        let min = Number(live.progressMin ?? 0);
        let max = Number(live.progressMax ?? 100);
        if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
            min = 0; // wie die Kachel (effectiveRange): ohne gültigen Bereich (Profil 0–0) gilt 0–100
            max = 100;
        }
        const active = Object.prototype.hasOwnProperty.call(E.s.simulate, id);
        const range = h('input', { type: 'range', min, max, step: (max - min) / 100 || 1 });
        range.value = active ? E.s.simulate[id] : Number(live.rawValue ?? min);
        const out = h('output', { text: active ? String(E.s.simulate[id]) : E.t('Real value') });
        range.addEventListener('input', () => { out.textContent = range.value; E.setSimulated(id, Number(range.value)); });
        const reset = h('button', { type: 'button', class: 'btn small', onclick: () => { E.setSimulated(id, undefined); out.textContent = E.t('Real value'); } }, E.t('Real value'));
        return E.f.section([E.t('Test value in the preview'), E.t('Only the preview shows the test value; the variable is not changed.')],
            h('div', { class: 'sim-row' }, range, out, reset));
    }
})(window.UDTE);
