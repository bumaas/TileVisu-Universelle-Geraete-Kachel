/* Universal Device Tile – Editor: Brücke in der Vorschau-Kachel (läuft im iframe, nicht im Editor).
   Sie meldet dem Editor Klicks (Zeile oder Gruppe wählen, Status), Doppelklicks (Beschriftung,
   Gruppenname, Icons) und das „+“ unter der Zeilenliste. Beim Ziehen sortiert sie die Kachel live: das
   gezogene Objekt rückt an die Stelle, an der es landen wird, die anderen gleiten zur Seite. Beim
   Loslassen meldet sie die neue Reihenfolge samt Gruppen; der Editor zeichnet danach regulär neu. */
(function () {
    'use strict';
    var config = window.UDTE_BRIDGE || {};
    var post = function (message) { parent.postMessage(message, '*'); };
    var ROW = '.variable-item[data-row-key]';
    var GROUP_NAME = '.group-name-label, .group-name-above';
    // Hier beginnt kein Ziehen: Bedienelemente der Kachel behalten ihre Zeigerereignisse
    var CONTROLS = 'input,button,select,textarea,a,.slider-container,[role=slider]';
    var container = document.getElementById('variables-container');

    if (container && !document.getElementById('udte-add')) {
        var add = document.createElement('button');
        add.type = 'button';
        add.id = 'udte-add';
        add.title = config.add || '+';
        add.setAttribute('aria-label', add.title);
        add.textContent = '+';
        container.insertAdjacentElement('afterend', add);
    }

    var visible = function (el) { return el && el.offsetParent !== null; };
    var hasClass = function (el, name) { return !!(el && el.classList && el.classList.contains(name)); };

    /** Gruppe zu einem Gruppennamen, Kasten oder einer Zeile darin: Name oben, Kasten, Linie und eine Zeile als Schlüssel. */
    var groupOf = function (el) {
        var box = el.closest('.variable-group');
        if (!box) {
            var name = el.closest('.group-name-above');
            box = name && name.nextElementSibling;
        }
        if (!hasClass(box, 'variable-group')) return null;
        var before = box.previousElementSibling;
        var after = box.nextElementSibling;
        var first = box.querySelector(ROW);
        return first ? {
            box: box, above: hasClass(before, 'group-name-above') ? before : null,
            line: hasClass(after, 'group-line') ? after : null, key: first.getAttribute('data-row-key')
        } : null;
    };
    var nodesOf = function (g) { return [g.above, g.box, g.line].filter(Boolean); };
    var unionRect = function (nodes) {
        var r = null;
        nodes.forEach(function (n) {
            var b = n.getBoundingClientRect();
            r = r ? { left: Math.min(r.left, b.left), top: Math.min(r.top, b.top), right: Math.max(r.right, b.right), bottom: Math.max(r.bottom, b.bottom) } : { left: b.left, top: b.top, right: b.right, bottom: b.bottom };
        });
        r.width = r.right - r.left;
        r.height = r.bottom - r.top;
        return r;
    };
    var clearSelection = function () {
        var selection = window.getSelection && window.getSelection();
        if (selection) selection.removeAllRanges();
    };

    var suppressClick = false;
    document.addEventListener('click', function (e) {
        var t = e.target;
        if (!t.closest) return;
        if (suppressClick) {
            suppressClick = false;
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        if (t.closest('#udte-add')) { post({ udte: 'add' }); return; }
        var pick = t.closest('.udte-pick'); // Platzhalter des Editors: Variable, Bild oder Statusvariable wählen
        if (pick) { post({ udte: 'pick', kind: pick.getAttribute('data-kind'), key: pick.getAttribute('data-key') }); return; }
        var remove = t.closest('.udte-remove'); // Platzhalter entfernen: Zeile löschen bzw. Statusbereich ausblenden
        if (remove) { post({ udte: 'remove', kind: remove.getAttribute('data-kind'), key: remove.getAttribute('data-key') }); return; }
        var item = t.closest(ROW);
        if (item) { post({ udte: 'select', key: item.getAttribute('data-row-key') }); return; }
        // Gruppenname oder leerer Bereich einer Gruppe (Kasten, Abstand zwischen den Zeilen, Linie darunter)
        var line = t.closest('.group-line');
        var g = (t.closest(GROUP_NAME) || t.closest('.variable-group') || line) && groupOf(line ? line.previousElementSibling : t);
        if (g) { post({ udte: 'selectGroup', key: g.key }); return; }
        post({ udte: t.closest('#status-container,#image,#div1') ? 'status' : 'blank' });
    }, true);

    document.addEventListener('dblclick', function (e) {
        var t = e.target;
        if (!t.closest) return;
        var icon = t.closest('svg, i');
        if (t.closest(GROUP_NAME)) {
            var g = groupOf(t);
            if (!g) return;
            e.preventDefault();
            clearSelection();
            post({ udte: icon ? 'editGroupIcon' : 'editGroup', key: g.key, x: e.clientX, y: e.clientY });
            return;
        }
        var item = t.closest(ROW);
        if (!item || t.closest(CONTROLS)) return;
        e.preventDefault();
        clearSelection();
        post({ udte: t.closest('.variable-icon') ? 'rowIcon' : 'edit', key: item.getAttribute('data-row-key'), x: e.clientX, y: e.clientY });
    }, true);

    // Rechtsklick auf eine Zeile: Kontextmenü des Editors (Duplizieren, Löschen) statt des Browser-Menüs
    document.addEventListener('contextmenu', function (e) {
        e.preventDefault(); // in der Vorschau nie das Menü des Browsers, nur das des Editors
        var t = e.target;
        if (!t.closest) return;
        var item = t.closest(ROW);
        if (item) {
            post({ udte: 'context', key: item.getAttribute('data-row-key'), x: e.clientX, y: e.clientY });
            return;
        }
        // Gruppe: Name, leerer Bereich des Kastens oder Linie darunter
        var line = t.closest('.group-line');
        var g = (t.closest(GROUP_NAME) || t.closest('.variable-group') || line) && groupOf(line ? line.previousElementSibling : t);
        if (g) {
            post({ udte: 'contextGroup', key: g.key, x: e.clientX, y: e.clientY });
        }
    }, true);

    // ---------------------------------------------------------------- Live-Sortieren

    var drag = null;

    /** Stand der Reihenfolge: jede Zeile mit dem Schlüssel einer Zeile ihrer Gruppe (Gruppe zu Beginn des Ziehens). */
    var snapshot = function () {
        return Array.prototype.map.call(container.querySelectorAll(ROW), function (el) {
            var box = el.closest('.variable-group');
            return { key: parseInt(el.getAttribute('data-row-key'), 10), group: box ? drag.groupKeys.get(box) : null };
        });
    };

    /** Zeile als Einheit im Fluss: in einer Gruppe ihre Hülle, sonst die Zeile selbst. */
    var unitOf = function (item) { return hasClass(item.parentElement, 'variable-group-item') ? item.parentElement : item; };

    /** Steht die Einheit mit anderen in einer Zeile (nebeneinander)? Aus der Lage, nicht aus dem HTML. */
    var sideBySide = function (unit) {
        var r = unit.getBoundingClientRect();
        return Array.prototype.some.call(unit.parentElement.children, function (other) {
            if (other === unit || !visible(other)) return false;
            var o = other.getBoundingClientRect();
            return Math.abs(o.top - r.top) < Math.min(r.height, o.height) / 2;
        });
    };

    /** Elemente, die beim Verschieben gleiten (oberste Ebene und Zeilen in Gruppen). */
    var animated = function () {
        return Array.prototype.filter.call(container.querySelectorAll(':scope > *, .variable-group-item'), visible);
    };
    /** FLIP: alte Lage merken, verschieben, mit einer Verschiebung von der alten Lage aus hineingleiten. */
    var flip = function (change) {
        var before = new Map();
        animated().forEach(function (el) { before.set(el, el.getBoundingClientRect()); });
        change();
        var deltas = new Map();
        animated().forEach(function (el) {
            var old = before.get(el);
            if (!old) return;
            var now = el.getBoundingClientRect();
            deltas.set(el, [old.left - now.left, old.top - now.top]);
        });
        deltas.forEach(function (d, el) {
            var box = hasClass(el, 'variable-group-item') ? el.closest('.variable-group') : null;
            var outer = box && deltas.get(box);
            var dx = d[0] - (outer ? outer[0] : 0);
            var dy = d[1] - (outer ? outer[1] : 0);
            if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
            el.style.transition = 'none';
            el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
        });
        requestAnimationFrame(function () {
            deltas.forEach(function (d, el) {
                if (!el.style.transform) return;
                el.style.transition = 'transform 150ms ease';
                el.style.transform = '';
                setTimeout(function () { el.style.transition = ''; }, 170);
            });
        });
    };

    /** Gruppen, die beim Ziehen leer geworden sind, werden blass (sie verschwinden beim Loslassen). */
    var markGroups = function () {
        Array.prototype.forEach.call(container.querySelectorAll('.variable-group'), function (box) {
            var g = { box: box, above: hasClass(box.previousElementSibling, 'group-name-above') ? box.previousElementSibling : null, line: hasClass(box.nextElementSibling, 'group-line') ? box.nextElementSibling : null };
            var empty = !box.querySelector(ROW);
            nodesOf(g).forEach(function (n) { n.classList.toggle('udte-empty-group', empty); });
            box.classList.toggle('udte-drop-group', drag && drag.mode === 'row' && box.contains(drag.item));
        });
    };

    /** Davor (false) oder dahinter (true) nach der Lage im Ziel (0…1); um die Mitte eine Totzone (null = nichts
        ändern), sonst kippt die Entscheidung, sobald das Ziel nach einem Tausch ein Stück wandert. */
    var zone = function (fraction) {
        if (fraction < 0.38) return false;
        if (fraction > 0.62) return true;
        return null;
    };

    /** Ziel unter dem Zeiger: Einheit, Ort (Gruppe oder oberste Ebene) und ob davor oder dahinter. */
    var targetAt = function (x, y) {
        var el = document.elementFromPoint(x, y);
        if (!el || !el.closest) return null;
        if (el.closest('#udte-add')) return { kind: 'end' };
        var ownGroup = drag.mode === 'group' ? drag.group.box : null;
        if (drag.mode === 'row') {
            if (el.closest(GROUP_NAME)) {
                var named = groupOf(el);
                return named ? { kind: 'beforeGroup', group: named } : null;
            }
            var hit = el.closest('.variable-group-item') || el.closest(ROW);
            if (!hit) return null;
            var unit = hasClass(hit, 'variable-group-item') ? hit : unitOf(hit);
            if (unit === unitOf(drag.item) || unit.contains(drag.item)) return null;
            var r = unit.getBoundingClientRect();
            var side = sideBySide(unit);
            var after = zone(side ? (x - r.left) / r.width : (y - r.top) / r.height);
            return after === null ? null : { kind: 'unit', unit: unit, after: after };
        }
        // Gruppe: Ziele auf oberster Ebene (freie Zeilen und andere Gruppen als Ganzes)
        var g = (el.closest('.variable-group') || el.closest('.group-name-above') || el.closest('.group-line')) ? groupOf(el.closest('.group-line') ? el.closest('.group-line').previousElementSibling : el) : null;
        if (g && g.box === ownGroup) return null;
        var nodes = g ? nodesOf(g) : null;
        if (!nodes) {
            var free = el.closest(ROW);
            if (!free || free.parentElement !== container) return null;
            nodes = [free];
        }
        var u = unionRect(nodes);
        var below = zone((y - u.top) / u.height);
        return below === null ? null : { kind: 'top', nodes: nodes, after: below };
    };

    /** Liegt das Gezogene schon so, wie das Ziel es will? Dann nichts tun (verhindert Hin-und-her). */
    var placed = function (t) {
        if (drag.mode === 'row') {
            var unit = unitOf(drag.item);
            if (t.kind === 'end') return unit.parentElement === container && !unit.nextElementSibling;
            if (t.kind === 'beforeGroup') return unit.parentElement === container && unit.nextElementSibling === nodesOf(t.group)[0];
            var inGroup = hasClass(t.unit, 'variable-group-item');
            if (inGroup !== hasClass(unit, 'variable-group-item')) return false;
            return t.after ? t.unit.nextElementSibling === unit : t.unit.previousElementSibling === unit;
        }
        var own = nodesOf(drag.group);
        if (t.kind === 'end') return !own[own.length - 1].nextElementSibling;
        return t.after ? t.nodes[t.nodes.length - 1].nextElementSibling === own[0] : t.nodes[0].previousElementSibling === own[own.length - 1];
    };

    var moveTo = function (t) {
        flip(function () {
            if (drag.mode === 'group') {
                var own = nodesOf(drag.group);
                var anchor = t.kind === 'end' ? null : (t.after ? t.nodes[t.nodes.length - 1].nextElementSibling : t.nodes[0]);
                own.forEach(function (n) { container.insertBefore(n, anchor); });
                return;
            }
            var item = drag.item;
            var unit = unitOf(item);
            var wrapper = hasClass(unit, 'variable-group-item') ? unit : null;
            if (t.kind === 'unit' && hasClass(t.unit, 'variable-group-item')) {
                if (!wrapper) {
                    wrapper = drag.wrapper || document.createElement('div');
                    wrapper.className = 'variable-group-item';
                    wrapper.appendChild(item);
                }
                t.unit.parentElement.insertBefore(wrapper, t.after ? t.unit.nextElementSibling : t.unit);
                return;
            }
            // oberste Ebene: aus der Hülle heraus (die leere Hülle bleibt für den Rückweg gemerkt)
            if (wrapper) {
                drag.wrapper = wrapper;
                wrapper.remove();
            }
            var anchor2 = t.kind === 'end' ? null : (t.kind === 'beforeGroup' ? nodesOf(t.group)[0] : (t.after ? t.unit.nextElementSibling : t.unit));
            container.insertBefore(item, anchor2);
        });
        markGroups();
    };

    var sources = function () {
        return drag.mode === 'row' ? [drag.item] : nodesOf(drag.group);
    };

    /** Alte Plätze merken (Elternteil und Nachfolger) und beim Abbrechen wiederherstellen: die Kachel zeichnet
        bei unverändertem Stand nicht neu, die live verschobenen Elemente blieben sonst stehen. */
    var remember = function () {
        var nodes = drag.mode === 'row' ? [unitOf(drag.item), drag.item].filter(function (n, i, all) { return all.indexOf(n) === i; }) : nodesOf(drag.group);
        drag.origin = nodes.map(function (n) { return [n, n.parentNode, n.nextSibling]; });
    };
    var restore = function () {
        flip(function () {
            var created = drag.wrapper && !drag.origin.some(function (o) { return o[0] === drag.wrapper; }) ? drag.wrapper : null;
            if (!created && drag.mode === 'row' && hasClass(drag.item.parentElement, 'variable-group-item') && !drag.origin.some(function (o) { return o[0] === drag.item.parentElement; })) {
                created = drag.item.parentElement;
            }
            drag.origin.slice().reverse().forEach(function (o) { o[1].insertBefore(o[0], o[2]); });
            if (created && !created.contains(drag.item)) created.remove();
        });
    };
    /** Während die Elemente nach einem Tausch gleiten (FLIP, 150 ms), stimmen ihre Positionen nicht: erst danach
        neu entscheiden, dann mit der letzten Zeigerposition (auch wenn sich der Zeiger nicht mehr bewegt). */
    var SETTLE = 190;
    var evaluate = function () {
        if (!drag || !drag.active) return;
        var wait = (drag.settled || 0) - Date.now();
        if (wait > 0) {
            if (!drag.timer) drag.timer = setTimeout(function () { if (drag) { drag.timer = null; evaluate(); } }, wait + 10);
            return;
        }
        var t = targetAt(drag.px, drag.py);
        if (t && !placed(t)) {
            moveTo(t);
            drag.settled = Date.now() + SETTLE;
        }
    };

    var finish = function () {
        if (drag && drag.timer) clearTimeout(drag.timer);
        document.documentElement.classList.remove('udte-dragging');
        document.removeEventListener('keydown', keydown, true);
        window.removeEventListener('pointermove', move, true);
        window.removeEventListener('pointerup', up, true);
        window.removeEventListener('pointercancel', cancel, true);
        if (drag && drag.active) {
            sources().forEach(function (el) { el.classList.remove('udte-drag-source', 'udte-drag-part'); });
            Array.prototype.forEach.call(container.querySelectorAll('.udte-drop-group, .udte-empty-group'), function (el) { el.classList.remove('udte-drop-group', 'udte-empty-group'); });
        }
        drag = null;
    };
    var start = function (e) {
        drag.active = true;
        // Fangen erst jetzt: beim Drücken gefangen, ginge jeder einfache Klick an <html> statt an die Zeile
        try { document.documentElement.setPointerCapture(e.pointerId); } catch (_) { /* Loslassen außerhalb bricht ab */ }
        drag.groupKeys = new Map();
        Array.prototype.forEach.call(container.querySelectorAll('.variable-group'), function (box) {
            var first = box.querySelector(ROW);
            if (first) drag.groupKeys.set(box, parseInt(first.getAttribute('data-row-key'), 10));
        });
        drag.before = JSON.stringify(snapshot());
        remember();
        sources().forEach(function (el, i) { el.classList.add(drag.mode === 'row' || hasClass(el, 'variable-group') ? 'udte-drag-source' : 'udte-drag-part'); });
        document.documentElement.classList.add('udte-dragging');
        document.addEventListener('keydown', keydown, true);
        clearSelection();
        post({ udte: 'dragstart' });
    };
    var move = function (e) {
        if (!drag || e.pointerId !== drag.pointer) return;
        if (!drag.active) {
            if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) < 6) return;
            start(e);
        }
        e.preventDefault();
        drag.px = e.clientX;
        drag.py = e.clientY;
        evaluate();
    };
    var up = function (e) {
        if (!drag || e.pointerId !== drag.pointer) return;
        var d = drag;
        if (!d.active) { finish(); return; }
        if (d.timer) { clearTimeout(d.timer); d.timer = null; d.settled = 0; evaluate(); } // ausstehende Entscheidung nicht verlieren
        suppressClick = true;
        setTimeout(function () { suppressClick = false; }, 0);
        var after = snapshot();
        var changed = JSON.stringify(after) !== d.before;
        var focus = d.mode === 'row' ? parseInt(d.item.getAttribute('data-row-key'), 10) : parseInt(d.group.key, 10);
        if (!changed) restore();
        finish();
        post(changed ? { udte: 'drop', mode: d.mode, rows: after, focus: focus } : { udte: 'dragcancel' });
    };
    var cancel = function (e) {
        if (!drag || (e.pointerId !== undefined && e.pointerId !== drag.pointer)) return;
        var active = drag.active;
        if (active) restore();
        finish();
        if (active) post({ udte: 'dragcancel' });
    };
    var keydown = function (e) {
        if (e.key === 'Escape' && drag && drag.active) {
            e.preventDefault();
            try { document.documentElement.releasePointerCapture(drag.pointer); } catch (_) { /* schon frei */ }
            cancel({});
        }
    };
    // Tastenkürzel des Editors auch, wenn die Vorschau den Fokus hat (Rückgängig, Speichern, Zeile wählen, verschieben, löschen …)
    document.addEventListener('keydown', function (e) {
        if (drag && drag.active) return;
        var mod = e.metaKey || e.ctrlKey;
        var rowKey = /^(Delete|Backspace|ArrowUp|ArrowDown|Escape)$/.test(e.key) || (mod && /^d$/i.test(e.key));
        if (!(mod && /^[zys]$/i.test(e.key)) && !(rowKey && !(e.target.closest && e.target.closest(CONTROLS)))) return;
        e.preventDefault();
        post({ udte: 'key', key: e.key, mod: mod, shift: e.shiftKey, alt: e.altKey });
    });
    document.addEventListener('pointerdown', function (e) {
        if (e.button !== 0 || drag || e.pointerType === 'touch' || !e.target.closest || !container) return;
        var t = e.target;
        var item = t.closest(ROW);
        // Gruppe: am Namen, im leeren Bereich ihres Kastens (neben/zwischen den Zeilen), an der Linie oder mit Umschalt
        var line = !item && t.closest('.group-line');
        var group = (t.closest(GROUP_NAME) || (!item && t.closest('.variable-group')) || line || (item && e.shiftKey))
            ? groupOf(line ? line.previousElementSibling : t) : null;
        if (!group && (!item || t.closest(CONTROLS))) return;
        drag = { mode: group ? 'group' : 'row', item: item, group: group, x: e.clientX, y: e.clientY, pointer: e.pointerId, active: false };
        window.addEventListener('pointermove', move, true);
        window.addEventListener('pointerup', up, true);
        window.addEventListener('pointercancel', cancel, true);
    }, true);
})();
