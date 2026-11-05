/* Universal Device Tile – Editor: Brücke in der Vorschau-Kachel (läuft im iframe, nicht im Editor).
   Sie meldet dem Editor Klicks (Zeile wählen, Status), Doppelklicks (Beschriftung, Gruppenname, Icons),
   das „+“ unter der Zeilenliste und Zeilen oder Gruppen, die in der Kachel verschoben werden. Die Kachel
   selbst bleibt unverändert: ihre Bedienung geht wie immer an requestAction, das der Editor verwirft. */
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

    /** Gruppe zu einem Gruppennamen oder einer Zeile darin: Kasten, Name darüber (falls dort) und eine Zeile als Schlüssel. */
    var groupOf = function (el) {
        var name = el.closest(GROUP_NAME);
        var box = null;
        var above = null;
        if (name) {
            above = name.classList.contains('group-name-above') ? name : null;
            box = above ? name.nextElementSibling : name.parentElement;
        } else {
            var items = el.closest('.variable-group-items');
            box = items && items.parentElement;
            var before = box && box.previousElementSibling;
            above = before && before.classList.contains('group-name-above') ? before : null;
        }
        if (!box || !box.classList.contains('variable-group')) return null;
        var first = box.querySelector(ROW);
        return first ? { box: box, above: above, key: first.getAttribute('data-row-key') } : null;
    };
    var groupRect = function (g) {
        var r = g.box.getBoundingClientRect();
        if (!g.above) return r;
        var a = g.above.getBoundingClientRect();
        var left = Math.min(a.left, r.left);
        var right = Math.max(a.right, r.right);
        return { left: left, right: right, top: a.top, bottom: r.bottom, width: right - left, height: r.bottom - a.top };
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
        var item = t.closest(ROW);
        if (item) { post({ udte: 'select', key: item.getAttribute('data-row-key') }); return; }
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

    // Ziehen ab 6 px: eine Zeile (an der Zeile) oder eine ganze Gruppe (am Gruppennamen oder mit Umschalt)
    var drag = null;
    var line = null;
    var visibleRows = function () {
        return Array.prototype.filter.call(document.querySelectorAll(ROW), function (el) { return el.offsetParent !== null; });
    };
    var horizontal = function (el) {
        var near = [el.previousElementSibling, el.nextElementSibling].filter(function (n) { return n && n.matches && n.matches(ROW); });
        var top = el.getBoundingClientRect().top;
        return near.some(function (n) { return Math.abs(n.getBoundingClientRect().top - top) < 4; });
    };
    /** Ziele: beim Zeilenziehen jede andere Zeile, beim Gruppenziehen jede freie Zeile und jede andere Gruppe als Ganzes. */
    var candidates = function () {
        var list = [];
        var seen = [];
        visibleRows().forEach(function (el) {
            if (drag.mode === 'row') {
                if (el !== drag.item) list.push({ key: el.getAttribute('data-row-key'), r: el.getBoundingClientRect(), side: horizontal(el) });
                return;
            }
            var g = groupOf(el);
            if (!g) { list.push({ key: el.getAttribute('data-row-key'), r: el.getBoundingClientRect(), side: false }); return; }
            if (g.box === drag.group.box || seen.indexOf(g.box) >= 0) return;
            seen.push(g.box);
            list.push({ key: g.key, r: groupRect(g), side: false });
        });
        return list;
    };
    var target = function (x, y) {
        var best = null;
        candidates().forEach(function (c) {
            var r = c.r;
            var dx = x < r.left ? r.left - x : (x > r.right ? x - r.right : 0);
            var dy = y < r.top ? r.top - y : (y > r.bottom ? y - r.bottom : 0);
            c.d = dx * dx + dy * dy;
            if (!best || c.d < best.d) best = c;
        });
        if (!best) return null;
        best.after = best.side ? x > best.r.left + best.r.width / 2 : y > best.r.top + best.r.height / 2;
        return best;
    };
    var sources = function () {
        return drag.mode === 'row' ? [drag.item] : [drag.group.box, drag.group.above].filter(Boolean);
    };
    var finish = function () {
        document.documentElement.classList.remove('udte-dragging');
        if (drag) sources().forEach(function (el) { el.classList.remove('udte-drag-source'); });
        if (line) { line.remove(); line = null; }
        window.removeEventListener('pointermove', move, true);
        window.removeEventListener('pointerup', up, true);
        window.removeEventListener('pointercancel', cancel, true);
        drag = null;
    };
    var move = function (e) {
        if (!drag || e.pointerId !== drag.pointer) return;
        if (!drag.active) {
            if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) < 6) return;
            drag.active = true;
            // Fangen erst jetzt: beim Drücken gefangen, ginge jeder einfache Klick an <html> statt an die Zeile
            try { document.documentElement.setPointerCapture(e.pointerId); } catch (_) { /* Loslassen außerhalb bricht ab */ }
            sources().forEach(function (el) { el.classList.add('udte-drag-source'); });
            document.documentElement.classList.add('udte-dragging');
            clearSelection();
            line = document.createElement('div');
            line.id = 'udte-drop-line';
            document.body.appendChild(line);
            post({ udte: 'dragstart' });
        }
        e.preventDefault();
        var t = drag.target = target(e.clientX, e.clientY);
        if (!t) { line.style.display = 'none'; return; }
        if (t.side) {
            var x = t.after ? t.r.right : t.r.left;
            line.style.cssText = 'display:block;left:' + (x - 1.5) + 'px;top:' + t.r.top + 'px;width:3px;height:' + t.r.height + 'px';
        } else {
            var y = t.after ? t.r.bottom : t.r.top;
            line.style.cssText = 'display:block;left:' + t.r.left + 'px;top:' + (y - 1.5) + 'px;width:' + t.r.width + 'px;height:3px';
        }
    };
    var up = function (e) {
        if (!drag || e.pointerId !== drag.pointer) return;
        var d = drag;
        finish();
        if (!d.active) return;
        suppressClick = true;
        setTimeout(function () { suppressClick = false; }, 0);
        post({ udte: 'dragend' });
        if (!d.target) return;
        if (d.mode === 'row') post({ udte: 'move', from: d.item.getAttribute('data-row-key'), to: d.target.key, after: d.target.after });
        else post({ udte: 'moveGroup', key: d.group.key, to: d.target.key, after: d.target.after });
    };
    var cancel = function (e) {
        if (!drag || e.pointerId !== drag.pointer) return;
        var active = drag.active;
        finish();
        if (active) post({ udte: 'dragend' });
    };
    document.addEventListener('pointerdown', function (e) {
        if (e.button !== 0 || drag || e.pointerType === 'touch' || !e.target.closest) return;
        var t = e.target;
        var item = t.closest(ROW);
        var group = (t.closest(GROUP_NAME) || (item && e.shiftKey)) ? groupOf(t) : null;
        if (!group && (!item || t.closest(CONTROLS))) return;
        drag = { mode: group ? 'group' : 'row', item: item, group: group, x: e.clientX, y: e.clientY, pointer: e.pointerId, active: false, target: null };
        window.addEventListener('pointermove', move, true);
        window.addEventListener('pointerup', up, true);
        window.addEventListener('pointercancel', cancel, true);
    }, true);
})();
