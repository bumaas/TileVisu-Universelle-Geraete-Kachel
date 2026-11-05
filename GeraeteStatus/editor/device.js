/* Universal Device Tile – Editor: Vorschlag des Anzeigetyps zur gewählten Variable und Zeilen aus einem Gerät
   (alle Variablen einer Instanz auf einmal, Typ je Variable vorgeschlagen, auf Wunsch als Gruppe). */
(function (E) {
    'use strict';
    const h = E.h;
    const caption = type => E.t((E.TYPES.find(t => t[0] === type) || E.TYPES[0])[2]);

    /** Nach der Wahl einer Variable: passt ein anderer Anzeigetyp besser, bietet die Meldung ihn an. */
    E.suggestType = function (row) {
        const info = E.s.objects[String(row.Variable | 0)];
        const type = E.rowValue(row, 'DisplayType');
        if (!info || !info.suggest || info.suggest === type || type === 'image') return;
        E.toast(E.tf('This variable fits the display type “%s”.', caption(info.suggest)), '',
            [E.t('Change'), () => { if (E.rows().includes(row)) E.change(() => { row.DisplayType = info.suggest; }, true); }]);
    };

    const freeGroup = () => {
        const used = new Set(E.s.extraGroups || []);
        E.rows().forEach(r => { const n = E.groupNumber(r.Group); if (n) used.add(n); });
        for (let n = 1; n <= 10; n++) if (!used.has(n)) return n;
        return 0;
    };

    /** „Aus Gerät …“: Instanz wählen, Variablen ankreuzen, Zeilen anlegen. */
    E.addRowsFromDevice = function () {
        E.pick('instance', 0, async id => {
            const answer = await E.api('tree', { parent: id });
            const variables = answer.status === 200 ? (answer.data.items || []).filter(i => i.type === 2) : [];
            const device = E.s.objects[String(id)] || {};
            if (!variables.length) {
                E.toast(E.t('This device has no variables.'));
                return;
            }
            variables.forEach(v => { E.s.objects[String(v.id)] = Object.assign({}, v, { parent: id }); });
            const checks = variables.map(v => {
                const box = h('input', { type: 'checkbox' });
                box.checked = !v.hidden;
                const label = h('label', { class: 'device-var' }, box, E.icon(E.typeIcon(v.suggest || 'text'), 'type'),
                    h('span', { class: 'grow', text: v.name || ('#' + v.id) }), h('span', { class: 'muted', text: v.value || '' }),
                    h('span', { class: 'chip-type', text: caption(v.suggest || 'text') }));
                return [v, box, label];
            });
            const group = freeGroup();
            const asGroup = h('input', { type: 'checkbox', id: 'deviceGroup' });
            asGroup.checked = group > 0 && variables.length > 1;
            asGroup.disabled = group === 0;
            const body = h('div', { class: 'device-rows' },
                h('p', { class: 'muted', text: E.t('The display type is suggested per variable and can be changed later. Hidden variables are not ticked.') }),
                h('div', { class: 'device-list' }, checks.map(c => c[2])),
                h('div', { class: 'field check' }, asGroup, h('label', { for: 'deviceGroup', text: group ? E.tf('As group “%s”', device.name || '') : E.t('No free group left') })));
            E.dialog(E.tf('Rows from “%s”', device.name || ('#' + id)), body, [
                [E.t('Cancel'), () => true],
                [E.t('Add rows'), () => {
                    const chosen = checks.filter(c => c[1].checked).map(c => c[0]);
                    if (!chosen.length) return true;
                    const n = asGroup.checked ? group : 0;
                    const first = E.rows().length;
                    E.change(d => {
                        if (n) Object.assign(E.groups()[n - 1], { GroupName: device.name || E.tf('Group %d', n), ShowGroupName: true, ShowAbove: true });
                        chosen.forEach(v => d.VariablesList.push(Object.assign(E.clone(E.s.rowDefaults),
                            { DisplayType: v.suggest || 'text', Variable: v.id, Group: n ? 'Gruppe ' + n : 'keine Gruppe' })));
                    }, true);
                    if (n) E.selectGroup(n); else E.select(first);
                    E.toast(E.tf('%d rows added.', chosen.length), '', [E.t('Undo'), () => E.undo()]);
                    return true;
                }, 'primary']
            ]);
        });
    };
})(window.UDTE);
