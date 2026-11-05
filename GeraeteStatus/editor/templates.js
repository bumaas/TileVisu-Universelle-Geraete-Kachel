/* Universal Device Tile – Editor: Vorlagen, Export und Import. Alles landet nur im Entwurf; geprüft wird
   es wie jede Eingabe beim Vorschau-Aufbau und beim Speichern. */
(function (E) {
    'use strict';
    const h = E.h;

    /** Einfacher Dialog: buttons = [[Beschriftung, Funktion, Klasse]]; die Funktion schließt ihn mit return true. */
    E.dialog = function (title, body, buttons) {
        const dialog = h('dialog', { class: 'modal' });
        const close = () => { dialog.close(); dialog.remove(); };
        dialog.append(
            h('div', { class: 'dialog-head' }, h('h2', { text: title }),
                h('button', { type: 'button', class: 'btn icon', title: E.t('Close'), onclick: close }, E.icon('xmark'))),
            h('div', { class: 'dialog-body' }, typeof body === 'string' ? h('p', { text: body }) : body),
            h('div', { class: 'dialog-foot' }, ...(buttons || [[E.t('Close'), () => true]]).map(([caption, fn, cls]) =>
                h('button', { type: 'button', class: 'btn ' + (cls || ''), onclick: async () => { if (await fn()) close(); } }, caption))));
        dialog.addEventListener('cancel', e => { e.preventDefault(); close(); });
        document.body.appendChild(dialog);
        dialog.showModal();
        return dialog;
    };

    /** Konfiguration in den Entwurf übernehmen (Vorlage oder Import) und alles neu zeichnen. */
    E.applyConfig = function (config, replaceAll) {
        E.change(d => {
            if (replaceAll) {
                Object.keys(d).forEach(key => { if (key in config) d[key] = E.clone(config[key]); });
            } else {
                Object.assign(d, E.clone(config));
            }
        }, true);
        E.s.extraGroups = [];
        E.select(null);
        E.emit('reset');
        const ids = [];
        JSON.stringify(config, (key, value) => { if (Number.isInteger(value) && value >= 10000 && value <= 59999) ids.push(value); return value; });
        E.ensureObjects(ids);
    };

    const applyTemplate = template => {
        E.dialog(E.tf('Use template “%s”?', template.caption),
            Array.isArray(template.config.ProfilAssoziazionen)
                ? E.t('Rows, groups and layout of the draft are replaced. The status variable stays; its associations get the images of the template. Then select the variables for the rows.')
                : E.t('Rows, groups and layout of the draft are replaced. The status variable stays; the template shows its icon instead of the images of the associations. Then select the variables for the rows.'),
            [[E.t('Cancel'), () => true], [E.t('Use template'), () => {
                const config = E.clone(template.config);
                // Bilder der Vorlage auf vorhandene Zuordnungen übertragen, statt diese zu ersetzen
                const current = E.s.draft.ProfilAssoziazionen || [];
                const hasStatus = (E.s.draft.Status | 0) > 0;
                if (Array.isArray(config.ProfilAssoziazionen)) {
                    if (hasStatus && current.length) config.ProfilAssoziazionen = E.mergeAssociations(current, config.ProfilAssoziazionen);
                } else {
                    // Vorlage ohne eigene Zuordnungen: ihr Icon zeigt das Gerät. Bilder einer früheren Vorlage (etwa
                    // Waschmaschine) gehen weg; ohne Statusvariable stammen die Zuordnungen nur aus Vorlagen.
                    config.ProfilAssoziazionen = hasStatus ? current.map(a => Object.assign({}, a, { Bildauswahl: 'none', SymconIcon: '', EigenesBild: 0 })) : [];
                }
                config.VariablesList = (config.VariablesList || []).map(row => Object.assign(E.clone(E.s.rowDefaults), row));
                E.applyConfig(config, false);
                if (E.fitPreviewSoon) E.fitPreviewSoon(); // Höhe der Vorschau an die Vorlage anpassen
                E.toast(E.t('Template applied. Nothing is saved yet.'));
                return true;
            }, 'primary']]);
    };

    const exportConfig = E.exportConfig = () => {
        const text = JSON.stringify({ udt: 1, config: E.s.draft }, null, 2);
        const area = h('textarea', { class: 'code', readonly: true, rows: '14' });
        area.value = text;
        E.dialog(E.t('Export'), h('div', {}, h('p', { class: 'muted', text: E.t('The configuration of this draft as JSON. Object IDs only fit this Symcon installation.') }), area), [
            [E.t('Download'), () => {
                const link = h('a', { href: URL.createObjectURL(new Blob([text], { type: 'application/json' })), download: 'udt-' + E.s.instance.id + '.json' });
                document.body.appendChild(link); link.click(); link.remove();
                return false;
            }],
            [E.t('Copy'), async () => {
                try { await navigator.clipboard.writeText(text); E.toast(E.t('Copied.')); } catch (_) { area.select(); document.execCommand('copy'); }
                return false;
            }, 'primary']
        ]);
    };

    const importConfig = () => {
        const area = h('textarea', { class: 'code', rows: '14', placeholder: '{ "udt": 1, "config": { … } }' });
        const file = h('input', { type: 'file', accept: 'application/json,.json' });
        file.addEventListener('change', async () => { if (file.files[0]) area.value = await file.files[0].text(); });
        E.dialog(E.t('Import'), h('div', {}, h('p', { class: 'muted', text: E.t('Paste an exported configuration or choose a file. It only goes into the draft; you can check it in the preview before saving.') }), file, area), [
            [E.t('Cancel'), () => true],
            [E.t('Import'), () => {
                let data;
                try { data = JSON.parse(area.value); } catch (_) { E.toast(E.t('That is not valid JSON.'), 'error'); return false; }
                const config = data && typeof data === 'object' && data.config && typeof data.config === 'object' ? data.config : data;
                if (!config || typeof config !== 'object' || Array.isArray(config)) { E.toast(E.t('No configuration found.'), 'error'); return false; }
                const known = Object.keys(config).filter(key => key in E.s.draft);
                if (known.length === 0) { E.toast(E.t('No configuration found.'), 'error'); return false; }
                E.applyConfig(config, true);
                E.toast(E.t('Imported into the draft. Nothing is saved yet.'));
                return true;
            }, 'primary']
        ]);
    };

    /** Eigene Vorlage aus dem Entwurf: Name und Icon; der Server entfernt Variablen, Skripte und Medien. */
    const saveTemplate = () => {
        let icon = 'star';
        const name = h('input', { type: 'text', maxlength: '60', value: E.s.instance.name || '' });
        const body = h('div', {},
            h('div', { class: 'field' }, h('label', { text: E.t('Name') }), name),
            E.f.icon(E.t('Icon'), () => icon, value => { icon = value || 'star'; }),
            h('p', { class: 'muted', text: E.t('Variables, scripts and media are not saved; the rows become placeholders. The template is available in all tiles.') }));
        E.dialog(E.t('Save as template'), body, [[E.t('Cancel'), () => true], [E.t('Save'), async () => {
            const answer = await E.api('saveTemplate', { caption: name.value, icon, config: E.s.draft });
            if (answer.status !== 200) {
                E.toast((answer.data.errors || [E.t('Saving failed.')]).join(' '), 'error');
                return false;
            }
            E.s.templates = answer.data.templates || E.s.templates;
            buildMenu();
            E.toast(E.tf('Template “%s” saved.', name.value.trim()), 'ok');
            return true;
        }, 'primary']]);
        setTimeout(() => { name.focus(); name.select(); }, 50);
    };

    const deleteTemplate = template => {
        E.dialog(E.tf('Delete template “%s”?', template.caption), E.t('The template is removed for all tiles.'), [[E.t('Cancel'), () => true], [E.t('Delete'), async () => {
            const answer = await E.api('deleteTemplate', { id: template.id });
            if (answer.status === 200) {
                E.s.templates = answer.data.templates || E.s.templates;
                buildMenu();
                E.toast(E.tf('Template “%s” deleted.', template.caption));
            }
            return true;
        }, 'primary danger']]);
    };

    const buildMenu = () => {
        const list = document.getElementById('templateList');
        const own = E.s.templates.filter(t => t.user);
        list.replaceChildren(
            h('div', { class: 'menu-title', text: E.t('Start with a template') }),
            ...E.s.templates.filter(t => !t.user).map(t => h('button', { type: 'button', onclick: () => { close(); applyTemplate(t); } }, E.icon(t.icon || 'shapes'), ' ', t.caption)),
            own.length ? h('div', { class: 'menu-title', text: E.t('Own templates') }) : null,
            ...own.map(t => h('div', { class: 'menu-row' },
                h('button', { type: 'button', class: 'grow', onclick: () => { close(); applyTemplate(t); } }, E.iconSvg(t.icon || 'star'), ' ', t.caption),
                h('button', { type: 'button', class: 'menu-delete', title: E.t('Delete template'), 'aria-label': E.t('Delete template'),
                    onclick: e => { e.stopPropagation(); close(); deleteTemplate(t); } }, E.icon('trash')))),
            h('hr'),
            h('button', { type: 'button', onclick: () => { close(); saveTemplate(); } }, E.icon('bookmark'), ' ', E.t('Save as template…')),
            h('button', { type: 'button', onclick: () => { close(); exportConfig(); } }, E.icon('file-export'), ' ', E.t('Export')),
            h('button', { type: 'button', onclick: () => { close(); importConfig(); } }, E.icon('file-import'), ' ', E.t('Import')));
    };
    const menu = document.getElementById('templateMenu');
    const close = () => menu.classList.remove('open');
    document.getElementById('templateButton').addEventListener('click', e => { e.stopPropagation(); menu.classList.toggle('open'); });
    document.addEventListener('click', e => { if (!menu.contains(e.target)) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

    E.on('loaded', buildMenu);
})(window.UDTE);
