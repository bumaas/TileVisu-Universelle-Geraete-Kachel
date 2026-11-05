/* Universal Device Tile – Editor: Bearbeiten direkt in der Vorschau. Die Brücke in der Kachel (bridge.js)
   meldet Doppelklicks auf Beschriftungen und Gruppennamen und gezogene Zeilen; preview.js reicht sie als
   Ereignis „bridge“ weiter. Das Eingabefeld liegt im Editor über der Kachel, nicht in ihr: die Kachel
   zeichnet ihre Zeilen bei jedem neuen Stand neu. */
(function (E) {
    'use strict';
    const h = E.h;

    /** Beschriftung direkt in der Vorschau ändern: Eingabefeld über dem Text der Zeile (Doppelklick). */
    const editLabel = (key, x, y) => {
        const d = E.previewDoc();
        const row = E.rows()[key];
        const item = d && d.querySelector('.variable-item[data-row-key="' + key + '"]');
        if (!row || !item) return;
        const live = ((E.s.payload && E.s.payload.variables) || []).find(v => String(v.key) === String(key)) || {};
        const clean = text => text.replace(/[\s ]+$/, '').replace(/:$/, '').trim();
        const spans = [...item.querySelectorAll('span')];
        const main = spans.find(s => live.label && clean(s.textContent) === live.label) || null;
        const second = live.secondVariable && live.secondVariable.label;
        const hit = d.elementFromPoint(x, y);
        const hitSpan = hit && hit.closest && hit.closest('span');
        let field = 'Label';
        let anchor = main;
        if (hitSpan && hitSpan !== main && second && clean(hitSpan.textContent) === second) {
            field = 'SecondVariableLabel';
            anchor = hitSpan;
        }
        inlineEdit((anchor || item).getBoundingClientRect(), {
            value: row[field] || '', max: 200,
            placeholder: (field === 'Label' ? live.label : second) || E.t('Label'),
            label: field === 'Label' ? E.t('Label') : E.t('Label of the second variable')
        }, value => {
            E.change(() => { row[field] = value; }, true);
            E.toast(value === '' ? E.t('Label removed: the tile shows the name of the variable.') : E.tf('Label: %s', value));
        });
    };

    /** Gruppenname direkt in der Vorschau ändern (Doppelklick auf den Namen; key = eine Zeile der Gruppe). */
    const editGroupName = (key, x, y) => {
        const d = E.previewDoc();
        const row = E.rows()[key];
        const number = row ? E.groupNumber(row.Group) : 0;
        const hit = d && d.elementFromPoint(x, y);
        let anchor = hit && hit.closest && hit.closest('.group-name-label, .group-name-above');
        if (!anchor && d) {
            // Rechtsklick in einen leeren Bereich: der Name der Gruppe, sonst ihr Kasten (Name ausgeblendet)
            const item = d.querySelector('.variable-item[data-row-key="' + key + '"]');
            const box = item && item.closest('.variable-group');
            const above = box && box.previousElementSibling;
            anchor = box && (box.querySelector('.group-name-label') || (above && above.classList.contains('group-name-above') ? above : box));
        }
        if (!number || !anchor) return;
        const group = E.groups()[number - 1];
        inlineEdit(anchor.getBoundingClientRect(), {
            value: group.GroupName || '', max: 100, placeholder: E.t('Group name'), label: E.t('Group name')
        }, value => {
            E.change(() => { group.GroupName = value; }, true);
            E.toast(E.tf('Group name: %s', value || '–'));
        });
    };

    /** Eingabefeld über einer Stelle der Kachel (rect im iframe); Enter oder Klick daneben übernimmt, Escape verwirft. */
    const inlineEdit = (r, opts, apply) => {
        const f = E.previewFrame().getBoundingClientRect();
        const input = h('input', { type: 'text', class: 'label-edit', maxlength: String(opts.max), spellcheck: 'false', placeholder: opts.placeholder, 'aria-label': opts.label });
        input.value = opts.value;
        Object.assign(input.style, {
            left: Math.max(4, f.left + r.left - 4) + 'px', top: (f.top + r.top + r.height / 2 - 16) + 'px',
            width: Math.max(160, Math.min(f.width - 16, r.width + 60)) + 'px'
        });
        let done = false;
        const close = commit => {
            if (done) return;
            done = true;
            const value = input.value.trim();
            input.remove();
            if (commit && value !== opts.value) apply(value);
        };
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); close(true); }
            if (e.key === 'Escape') { e.preventDefault(); close(false); }
        });
        input.addEventListener('blur', () => close(true));
        document.body.appendChild(input);
        input.focus();
        input.select();
    };

    /** Reihenfolge aus der live sortierten Kachel übernehmen: rows = [{key, group}] in Kachel-Reihenfolge, group =
        Schlüssel einer Zeile der Gruppe zu Beginn des Ziehens (null = ohne Gruppe). Zeilen, die die Kachel nicht
        zeigt, bleiben hinter ihrem bisherigen Vorgänger. */
    const applyOrder = (entries, focus, mode) => {
        const rows = E.rows();
        const orig = rows.slice();
        if (!Array.isArray(entries) || entries.some(e => !orig[e.key] || (e.group !== null && !orig[e.group]))) return;
        const plan = entries.map(e => ({ row: orig[e.key], group: e.group === null ? 'keine Gruppe' : orig[e.group].Group }));
        const result = plan.map(p => p.row);
        orig.forEach((row, i) => {
            if (result.includes(row)) return;
            const prev = orig.slice(0, i).reverse().find(r => result.includes(r));
            result.splice(prev ? result.indexOf(prev) + 1 : 0, 0, row);
        });
        const focused = orig[focus];
        E.change(() => {
            plan.forEach(p => { p.row.Group = p.group; });
            rows.splice(0, rows.length, ...result);
        }, true);
        if (mode === 'group' && focused) E.selectGroup(E.groupNumber(focused.Group));
        else E.select(rows.indexOf(focused));
    };

    const pickGroupIcon = key => {
        const row = E.rows()[key];
        const number = row ? E.groupNumber(row.Group) : 0;
        if (!number) return;
        const group = E.groups()[number - 1];
        E.pickIcon(group.Groupicon || '', value => E.change(() => { group.Groupicon = value; }, true));
    };

    /** Doppelklick aufs Statusbild: Icon der Zuordnung, die die Vorschau gerade zeigt (ein Bild wird dabei zum Icon). */
    E.pickStatusIcon = function () {
        const index = E.s.payload ? E.s.payload.editorAssociation : null;
        const assoc = Number.isInteger(index) ? (E.s.draft.ProfilAssoziazionen || [])[index] : null;
        E.emit('tab', 'status');
        if (!assoc) {
            // ohne Zuordnung (z. B. noch keine Statusvariable): das Standard-Icon
            E.pickIcon(E.s.draft.DefaultIcon || '', value => E.change(d => { d.DefaultIcon = value; }, true));
            return;
        }
        const current = assoc.Bildauswahl === 'symcon_icon' ? (assoc.SymconIcon || '') : '';
        E.pickIcon(current, value => {
            E.change(() => {
                assoc.Bildauswahl = value === '' ? 'none' : 'symcon_icon';
                assoc.SymconIcon = value;
            }, true);
            E.toast(E.tf('Status “%s”: %s', assoc.AssoziationName || String(assoc.AssoziationValue), value || E.t('No icon')));
        });
    };

    /** Platzhalter der Vorschau: Zeilen ohne Ziel (der Server liefert sie in der Vorschau als Textzeile mit
        editorPlaceholder) und eine fehlende Statusvariable bekommen einen Knopf „Auswählen“. */
    const decorate = payload => {
        const d = E.previewDoc();
        if (!d || !payload) return;
        const button = (kind, key) => {
            const b = d.createElement('button');
            b.type = 'button';
            b.className = 'udte-pick';
            b.setAttribute('data-kind', kind);
            b.setAttribute('data-key', String(key));
            b.textContent = E.t('Select');
            return b;
        };
        // Mülleimer rechts daneben: Zeile entfernen, beim Status den Statusbereich ausblenden
        const trash = (kind, key) => {
            const b = d.createElement('button');
            b.type = 'button';
            b.className = 'udte-remove';
            b.setAttribute('data-kind', kind);
            b.setAttribute('data-key', String(key));
            b.title = kind === 'status' ? E.t('Hide status variable') : E.t('Remove');
            b.setAttribute('aria-label', b.title);
            b.appendChild(E.iconSvg('trash-can'));
            return b;
        };
        // Kasten jeder Gruppe trägt ihre Farbe; Platzhalter darin erben sie (auch beim Ziehen in eine andere Gruppe)
        (payload.variables || []).forEach(v => {
            const item = E.groupNumber(v.group) && d.querySelector('.variable-item[data-row-key="' + v.key + '"]');
            const group = item && item.closest('.variable-group');
            if (group) group.style.setProperty('--udte-group-color', E.groupColor(E.groupNumber(v.group)));
        });
        (payload.variables || []).filter(v => v.editorPlaceholder).forEach(v => {
            const el = d.querySelector('.variable-item[data-row-key="' + v.key + '"]');
            if (!el || el.querySelector('.udte-pick')) return;
            el.classList.add('udte-placeholder');
            el.append(button(v.editorPlaceholder, v.key), trash(v.editorPlaceholder, v.key));
        });
        const list = d.getElementById('variables-container');
        let status = d.getElementById('udte-status-placeholder');
        const needed = !('status' in payload) && !payload.statusHidden;
        if (needed && !status && list) {
            status = d.createElement('div');
            status.id = 'udte-status-placeholder';
            status.className = 'udte-placeholder';
            const text = d.createElement('span');
            text.className = 'variable-label';
            text.textContent = E.t('Status variable');
            status.append(text, button('status', -1), trash('status', -1));
            list.parentElement.insertBefore(status, list);
        } else if (!needed && status) {
            status.remove();
        }
    };
    E.on('pushed', decorate);

    /** Statusbild-Platzhalter: blendet die Kachel die Bildspalte aus (kein Bild, kein Standardbild), zeigt die
        Vorschau dort ein Foto-Icon. „Auswählen“ setzt das Standardbild, „Ohne Bild“ lässt die Spalte weg. */
    let noImagePlaceholder = false;
    const handle = document.getElementById('imageHandle');
    const actions = h('div', { class: 'image-placeholder-actions' },
        h('button', { type: 'button', class: 'btn small primary', onclick: () => {
            E.emit('tab', 'status');
            E.pick('image', E.s.draft.DefaultImage | 0, id => E.change(d => { d.DefaultImage = id; }, true));
        } }, E.t('Select')),
        h('button', { type: 'button', class: 'btn small icon', title: E.t('Without image'), 'aria-label': E.t('Without image'),
            onclick: () => { noImagePlaceholder = true; E.repaint(); } }, E.icon('trash-can')));
    actions.addEventListener('pointerdown', e => e.stopPropagation()); // kein Ziehen des Bildes
    actions.addEventListener('dblclick', e => e.stopPropagation());
    handle.appendChild(actions);
    // Knöpfe mittig über das Foto-Icon (die Bildspalte kann über den sichtbaren Teil der Kachel hinausreichen)
    const placeActions = () => {
        const d = E.previewDoc();
        const column = d && d.getElementById('div1');
        const icon = d && d.querySelector('#div1 .fontawesome-icon-container');
        if (!handle.classList.contains('placeholder') || !column || !icon) return;
        const r = icon.getBoundingClientRect();
        const c = column.getBoundingClientRect();
        actions.style.top = Math.max(0, r.top + r.height / 2 - c.top - actions.offsetHeight / 2) + 'px';
        actions.style.left = (r.left - c.left) + 'px';
        actions.style.width = r.width + 'px';
    };
    E.on('handlePlaced', placeActions);
    E.on('pushed', placeActions);
    E.previewTransform = payload => {
        const placeholder = !!payload.hideImageColumn && !noImagePlaceholder;
        handle.classList.toggle('placeholder', placeholder);
        handle.title = placeholder ? E.t('The tile has no image yet: select a default image, or keep it without image.') : E.t(handle.getAttribute('data-t-title'));
        if (placeholder) {
            Object.assign(payload, { hideImageColumn: false, statusBildauswahl: 'symcon_icon_image', statusIconColor: 'rgba(127,127,127,.55)', isStatusIconColorTransparent: false });
        }
        return payload;
    };

    /** Höhe der Vorschau an den Inhalt anpassen (Breite bleibt): unterster Punkt von Status, Zeilen, „+“ und Bild,
        dazu der Rand der Kachel und ihre Titelzeile. Nach einer Vorlage einmal, sobald sie gezeichnet ist. */
    let fitPending = false;
    E.fitPreview = function () {
        const d = E.previewDoc();
        const box = document.getElementById('tileFrame');
        if (!d || !d.body || box.classList.contains('maximized') || !E.setPreviewSize) return;
        const win = d.defaultView;
        let bottom = 0;
        d.querySelectorAll('#status-container, #udte-status-placeholder, #variables-container, #udte-add, #div1 img, #div1 .fontawesome-icon-container').forEach(el => {
            if (el.offsetParent !== null) bottom = Math.max(bottom, el.getBoundingClientRect().bottom + win.scrollY);
        });
        if (!bottom) return;
        const title = box.querySelector('.tile-title');
        const margin = parseFloat(win.getComputedStyle(d.body).marginBottom) || 0;
        E.setPreviewSize(box.getBoundingClientRect().width, Math.ceil(bottom + margin + (title ? title.offsetHeight : 0) + 4));
    };
    E.fitPreviewSoon = () => { fitPending = true; };
    E.on('pushed', () => {
        if (!fitPending) return;
        fitPending = false;
        requestAnimationFrame(E.fitPreview); // nach den Platzhaltern (gleiches Ereignis, früher angemeldet)
    });

    /** „Auswählen“ am Platzhalter: Objektauswahl für die Zeile (Variable oder Bild) oder die Statusvariable. */
    const pickTarget = (kind, key) => {
        if (kind === 'status') {
            E.emit('tab', 'status');
            E.pick('variable', E.s.draft.Status | 0, async id => {
                E.change(d => { d.Status = id; }, true);
                if (id) await E.reloadAssociations(true); // Bilder der Vorlage auf die Werte der Variable übertragen
            });
            return;
        }
        const row = E.rows()[key];
        if (!row) return;
        E.select(key);
        const field = kind === 'image' ? 'ImageMedia' : 'Variable';
        E.pick(kind === 'image' ? 'image' : 'variable', row[field] | 0, id => E.change(() => { row[field] = id; }, true));
    };

    /** Rahmen der gewählten Gruppe in der Vorschau (gestrichelt, in ihrer Farbe), um Name oben und Kasten; zieht mit,
        wenn sich die Kachel danach noch verschiebt. preview.js ruft das nach jedem Stand und jeder Auswahl. */
    let groupOutlineObserver = null;
    E.drawGroupOutline = function (d) {
        const outline = d.getElementById('udte-group-outline');
        if (outline) outline.remove();
        d.querySelectorAll('.udte-group-selected').forEach(el => el.classList.remove('udte-group-selected'));
        if (groupOutlineObserver) { groupOutlineObserver.disconnect(); groupOutlineObserver = null; }
        if (E.s.selectedGroup) {
            // Gruppe: gestrichelter Rahmen um Name (oben) und Kasten, im Fluss der Kachel (scrollt mit)
            const member = E.rows().findIndex(r => E.groupNumber(r.Group) === E.s.selectedGroup);
            const item = member >= 0 && d.querySelector('.variable-item[data-row-key="' + member + '"]');
            const box = item && item.closest('.variable-group');
            if (box) {
                const above = box.previousElementSibling && box.previousElementSibling.classList.contains('group-name-above') ? box.previousElementSibling : null;
                const frameEl = d.createElement('div');
                box.classList.add('udte-group-selected'); // Zeilen darin ohne eigenen Platzhalter-Rahmen
                frameEl.id = 'udte-group-outline';
                frameEl.style.borderColor = E.groupColor(E.s.selectedGroup); // Farbe der Gruppe wie in der Liste
                // Abstand wie die Zeilenrahmen: Platzhalter tragen ihren Rahmen am Rand (0), echte Zeilen 3 px außen
                // (wie die Auswahl); weiter außen läge der Rahmen auf denen der Nachbarzeilen
                const gap = box.querySelector('.variable-item:not(.udte-placeholder)') ? 3 : 0;
                const place = () => {
                    const rects = [box, above].filter(Boolean).map(el => el.getBoundingClientRect());
                    const win = d.defaultView;
                    const top = Math.min(...rects.map(r => r.top)) + win.scrollY - gap;
                    const left = Math.min(...rects.map(r => r.left)) + win.scrollX - gap;
                    Object.assign(frameEl.style, {
                        top: top + 'px', left: left + 'px',
                        width: (Math.max(...rects.map(r => r.right)) + win.scrollX + gap - left) + 'px',
                        height: (Math.max(...rects.map(r => r.bottom)) + win.scrollY + gap - top) + 'px'
                    });
                };
                place();
                d.body.appendChild(frameEl);
                // Rahmen zieht mit, wenn sich die Kachel danach noch verschiebt (Platzhalter, Bilder, Schrift)
                groupOutlineObserver = new ResizeObserver(() => { if (frameEl.isConnected) place(); });
                groupOutlineObserver.observe(d.body);
                groupOutlineObserver.observe(box);
                E.previewReveal(box);
            }
        }
    };

    E.inplace = { editLabel, editGroupName, pickGroupIcon }; // für das Kontextmenü (contextmenu.js)

    E.on('bridge', data => {
        const key = parseInt(data.key, 10);
        E.emit('tab', 'rows');
        if (data.udte === 'drop') {
            applyOrder(data.rows, parseInt(data.focus, 10), data.mode);
        } else if (data.udte === 'selectGroup') {
            const row = E.rows()[key];
            if (row && E.groupNumber(row.Group)) E.selectGroup(E.groupNumber(row.Group));
        } else if (data.udte === 'edit') {
            E.select(key);
            editLabel(key, Number(data.x), Number(data.y));
        } else if (data.udte === 'editGroup') {
            editGroupName(key, Number(data.x), Number(data.y));
        } else if (data.udte === 'editGroupIcon') {
            pickGroupIcon(key);
        } else if (data.udte === 'pick') {
            pickTarget(data.kind, key);
        } else if (data.udte === 'remove') {
            if (data.kind === 'status') {
                E.change(d => { d.StatusHide = true; }, true);
                E.toast(E.t('Status area hidden. “Discard” brings it back until you save.'));
            } else if (E.rows()[key]) {
                E.deleteRow(key);
            }
        } else if (data.udte === 'rowIcon') {
            E.select(key);
            E.toast(E.t('The icon of a row comes from the presentation of its variable.'));
        }
    });
})(window.UDTE);
