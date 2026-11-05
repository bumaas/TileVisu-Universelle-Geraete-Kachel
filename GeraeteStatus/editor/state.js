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
        picked: [],         // Mehrfachauswahl: die Zeilen selbst (multi.js)
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
        E.s.picked = [];
        E.s.extraGroups = [];
        past.length = 0;
        future.length = 0;
        E.emit('history');
        E.emit('loaded', data);
        E.emit('draft');
    };

    /** Entwurf ändern; structural = Zeilen hinzugefügt, entfernt, verschoben oder umgruppiert, Anzeigetyp oder Ziel geändert. */
    E.change = function (mutate, structural) {
        const before = snapshot();
        mutate(E.s.draft);
        remember(before, structural);
        E.emit('draft');
        if (structural) {
            E.emit('structure');
        }
    };

    // Rückgängig/Wiederholen: Schnappschüsse des Entwurfs (samt angelegter leerer Gruppen), höchstens 50.
    // Tippen in einem Feld zählt als ein Schritt, solange zwischen zwei Änderungen weniger als 1,5 s liegen.
    const past = [];
    const future = [];
    let lastField = null;
    let lastTime = 0;
    const snapshot = () => JSON.stringify({ draft: E.s.draft, groups: E.s.extraGroups });
    const push = state => {
        past.push(state);
        if (past.length > 50) past.shift();
        future.length = 0;
        E.emit('history');
    };
    function remember(before, structural) {
        if (snapshot() === before) return; // nichts geändert
        const el = document.activeElement;
        const field = !structural && el && el.matches && el.matches('input, textarea, select') ? el : null;
        const now = Date.now();
        const typing = field !== null && field === lastField && now - lastTime < 1500;
        lastField = field;
        lastTime = now;
        if (!typing) push(before);
    }
    /** Stand vor einer Änderung außerhalb von E.change merken (z. B. vor „Verwerfen“). */
    E.checkpoint = () => { lastField = null; push(snapshot()); };
    const restore = (from, to) => {
        if (!from.length) return false;
        to.push(snapshot());
        const state = JSON.parse(from.pop());
        E.s.draft = state.draft;
        E.s.extraGroups = state.groups || [];
        E.s.picked = [];
        lastField = null;
        const selected = E.s.selected;
        const group = E.s.selectedGroup;
        E.emit('reset');
        E.emit('structure');
        if (group) E.selectGroup(group); else E.select(selected);
        E.emit('draft');
        E.emit('history');
        return true;
    };
    E.undo = () => restore(past, future);
    E.redo = () => restore(future, past);
    E.canUndo = () => past.length > 0;
    E.canRedo = () => future.length > 0;

    E.isDirty = () => E.s.draft !== null && JSON.stringify(E.s.draft) !== JSON.stringify(E.s.saved);

    E.rows = () => E.s.draft.VariablesList || (E.s.draft.VariablesList = []);

    /** Wert eines Zeilenfelds mit der Vorgabe des Zeilendialogs. */
    E.rowValue = (row, field) => (row[field] !== undefined ? row[field] : E.s.rowDefaults[field]);

    E.select = function (index) {
        E.s.selected = (index === null || index === undefined || index < 0 || index >= E.rows().length) ? null : index;
        E.s.selectedGroup = null;
        E.s.picked = [];
        E.emit('select', E.s.selected);
    };

    /** Gruppe auswählen (1–10): Rahmen in der Vorschau, Karte in der Liste; hebt die Zeilenauswahl auf. */
    E.selectGroup = function (number) {
        E.s.selected = null;
        E.s.selectedGroup = number > 0 ? number : null;
        E.s.picked = [];
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

    /** Kurze Meldung unten; action = [Beschriftung, Funktion] als Knopf in der Meldung (z. B. „Rückgängig“). */
    E.toast = function (text, kind, action) {
        const el = document.getElementById('toast');
        el.replaceChildren(document.createTextNode(text));
        if (action) {
            el.appendChild(E.h('button', { type: 'button', class: 'toast-action', onclick: () => { el.hidden = true; action[1](); } }, action[0]));
        }
        el.className = 'toast' + (kind ? ' ' + kind : '');
        el.hidden = false;
        clearTimeout(E.toast.timer);
        E.toast.timer = setTimeout(() => { el.hidden = true; }, kind === 'error' || action ? 6000 : 3000);
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

    /** Icon-Satz wie in der Kachel (prepareIconForDisplay): Symcons eigene Icons (z. B. heatpump) liegen in
        /icons.js nur im Kit-Satz, Marken im Brands-Satz, alle übrigen im Light-Satz. */
    const iconSets = new Map();
    const iconSet = name => {
        if (iconSets.has(name)) return iconSets.get(name);
        const fa = window.FontAwesome;
        let set = 'fa-light';
        try {
            if (fa && typeof fa.findIconDefinition === 'function' && !fa.findIconDefinition({ prefix: 'fal', iconName: name })) {
                if (fa.findIconDefinition({ prefix: 'fak', iconName: name })) set = 'fa-kit';
                else if (fa.findIconDefinition({ prefix: 'fab', iconName: name })) set = 'fa-brands';
            }
        } catch (_) { /* unbekannt: Light */ }
        if (fa) iconSets.set(name, set);
        return set;
    };
    E.icon = (name, extra) => E.h('i', { class: iconSet(name) + ' fa-' + name + (extra ? ' ' + extra : '') });
})(window.UDTE);
