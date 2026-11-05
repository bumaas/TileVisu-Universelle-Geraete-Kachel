/* Universal Device Tile – Editor: Entwurf, Ereignisse und kleine Helfer.
   Der Entwurf ist eine Kopie der gespeicherten Konfiguration (Listen als Arrays); jede Änderung läuft
   über E.change(), das „draft“ meldet. Zeilen-Schlüssel ist der Index in VariablesList. */
(function (E) {
    'use strict';

    const listeners = {};
    E.on = (name, fn) => { (listeners[name] = listeners[name] || []).push(fn); };
    E.emit = (name, ...args) => { (listeners[name] || []).forEach(fn => { try { fn(...args); } catch (e) { console.error(e); } }); };

    E.clone = value => JSON.parse(JSON.stringify(value));

    E.s = {
        saved: null,        // Konfiguration wie gespeichert
        base: '',           // Fingerabdruck des gespeicherten Stands
        draft: null,        // Entwurf
        objects: {},        // Objekt-ID => Kurzinfo
        matrix: {},         // Felder je Anzeigetyp
        rowDefaults: {},
        openObject: true,
        templates: [],
        instance: { id: 0, name: '' },
        selected: null,     // Index der gewählten Zeile
        selectedGroup: null, // Nummer der gewählten Gruppe (1–10)
        simulate: {},       // Variablen-ID => Vorschauwert
        extraGroups: [],    // angelegte Gruppen ohne Zeilen (nur im Editor)
        payload: null       // letzter Vorschau-Stand
    };

    E.load = function (data) {
        E.s.saved = data.config;
        padGroups(E.s.saved); // fehlende Gruppen gleich ergänzen, sonst gälte der Entwurf als geändert
        E.s.base = data.base;
        E.s.draft = E.clone(data.config);
        Object.assign(E.s.objects, data.objects || {});
        E.s.matrix = data.matrix || {};
        E.s.rowDefaults = data.rowDefaults || {};
        E.s.openObject = !!data.openObject;
        E.s.templates = data.templates || [];
        E.s.instance = data.instance || E.s.instance;
        E.s.selected = null;
        E.s.selectedGroup = null;
        E.s.extraGroups = [];
        E.emit('loaded', data);
        E.emit('draft');
    };

    /** Entwurf ändern; structural = Zeilen hinzugefügt, entfernt, verschoben oder umgruppiert, Anzeigetyp oder Ziel geändert. */
    E.change = function (mutate, structural) {
        mutate(E.s.draft);
        E.emit('draft');
        if (structural) {
            E.emit('structure');
        }
    };

    E.isDirty = () => E.s.draft !== null && JSON.stringify(E.s.draft) !== JSON.stringify(E.s.saved);

    E.rows = () => E.s.draft.VariablesList || (E.s.draft.VariablesList = []);

    /** Wert eines Zeilenfelds mit der Vorgabe des Zeilendialogs. */
    E.rowValue = (row, field) => (row[field] !== undefined ? row[field] : E.s.rowDefaults[field]);

    E.select = function (index) {
        E.s.selected = (index === null || index === undefined || index < 0 || index >= E.rows().length) ? null : index;
        E.s.selectedGroup = null;
        E.emit('select', E.s.selected);
    };

    /** Gruppe auswählen (1–10): Rahmen in der Vorschau, Karte in der Liste; hebt die Zeilenauswahl auf. */
    E.selectGroup = function (number) {
        E.s.selected = null;
        E.s.selectedGroup = number > 0 ? number : null;
        E.emit('select', null);
    };

    /** Gruppen 1–10 (GroupNamesList, Index 0 = Gruppe 1), fehlende mit Vorgaben ergänzt. */
    function padGroups(config) {
        const list = config.GroupNamesList || (config.GroupNamesList = []);
        for (let i = list.length; i < 10; i++) {
            list.push({ Group: i + 1, GroupName: 'Group ' + (i + 1), ShowGroupName: false, ShowAbove: false, line: false, stretch: false, Groupicon: '' });
        }
        return list;
    }
    E.groups = () => padGroups(E.s.draft);

    /** Erkennungsfarbe einer Gruppe (1–10) im Editor: Liste rechts und Platzhalter in der Vorschau. */
    const GROUP_COLORS = ['#4f9dff', '#f5a524', '#b37feb', '#34d399', '#f472b6', '#22d3ee', '#fb7185', '#a3e635', '#fbbf24', '#94a3b8'];
    E.groupColor = n => GROUP_COLORS[(Math.max(1, n | 0) - 1) % GROUP_COLORS.length];

    E.groupNumber = value => {
        const m = /^Gruppe (\d+)$/.exec(String(value || ''));
        return m ? parseInt(m[1], 10) : 0;
    };

    /** Objekte nachladen, die noch keine Kurzinfo haben (nach Auswahl, Import, Vorlage). */
    E.ensureObjects = async function (ids) {
        const missing = [...new Set(ids.filter(id => id > 0 && !(String(id) in E.s.objects)))];
        if (missing.length === 0) {
            return;
        }
        const answer = await E.api('objects', { ids: missing });
        if (answer.status === 200) {
            Object.assign(E.s.objects, answer.data.objects || {});
            E.emit('objects');
        }
    };

    E.objectLabel = function (id) {
        if (!id) {
            return '';
        }
        const info = E.s.objects[String(id)];
        if (info === undefined) {
            return '#' + id;
        }
        if (info === null) {
            return E.tf('Missing object #%d', id);
        }
        return (info.name || ('#' + id)) + (info.path ? ' · ' + info.path : '');
    };

    E.toast = function (text, kind) {
        const el = document.getElementById('toast');
        el.textContent = text;
        el.className = 'toast' + (kind ? ' ' + kind : '');
        el.hidden = false;
        clearTimeout(E.toast.timer);
        E.toast.timer = setTimeout(() => { el.hidden = true; }, kind === 'error' ? 6000 : 3000);
    };

    /** Element bauen: E.h('div', {class: 'x', onclick: fn}, kind1, 'Text', …). */
    E.h = function (tag, attrs, ...children) {
        const el = document.createElement(tag);
        for (const [key, value] of Object.entries(attrs || {})) {
            if (value === undefined || value === null || value === false) {
                continue;
            }
            if (key.startsWith('on') && typeof value === 'function') {
                el.addEventListener(key.slice(2), value);
            } else if (key === 'class') {
                el.className = value;
            } else if (key === 'text') {
                el.textContent = value;
            } else {
                el.setAttribute(key, value === true ? '' : value);
            }
        }
        for (const child of children.flat()) {
            if (child === null || child === undefined || child === false) {
                continue;
            }
            el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
        }
        return el;
    };

    E.icon = (name, extra) => E.h('i', { class: 'fa-light fa-' + name + (extra ? ' ' + extra : '') });
})(window.UDTE);
