/* Universal Device Tile – Editor: Brücke in der Vorschau-Kachel (läuft im iframe, nicht im Editor).
   Sie meldet dem Editor Klicks (Zeile wählen, Status), Doppelklicks (Beschriftung ändern), das „+“ unter
   der Zeilenliste und Zeilen, die in der Kachel verschoben werden. Die Kachel selbst bleibt unverändert:
   ihre Bedienung geht wie immer an requestAction, das der Editor verwirft. */
(function () {
    'use strict';
    var config = window.UDTE_BRIDGE || {};
    var post = function (message) { parent.postMessage(message, '*'); };
    var ROW = '.variable-item[data-row-key]';
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
        var item = e.target.closest && e.target.closest(ROW);
        if (!item || e.target.closest(CONTROLS)) return;
        e.preventDefault();
        var selection = window.getSelection && window.getSelection();
        if (selection) selection.removeAllRanges();
        post({ udte: 'edit', key: item.getAttribute('data-row-key'), x: e.clientX, y: e.clientY });
    }, true);

    // Zeilen in der Kachel ziehen: ab 6 px Bewegung; die Linie zeigt, wohin die Zeile kommt
    var drag = null;
    var line = null;
    var rows = function () {
        return Array.prototype.filter.call(document.querySelectorAll(ROW), function (el) { return el.offsetParent !== null; });
    };
    var horizontal = function (el) {
        var near = [el.previousElementSibling, el.nextElementSibling].filter(function (n) { return n && n.matches && n.matches(ROW); });
        var top = el.getBoundingClientRect().top;
        return near.some(function (n) { return Math.abs(n.getBoundingClientRect().top - top) < 4; });
    };
    var target = function (x, y) {
        var best = null;
        rows().forEach(function (el) {
            if (el === drag.item) return;
            var r = el.getBoundingClientRect();
            var dx = x < r.left ? r.left - x : (x > r.right ? x - r.right : 0);
            var dy = y < r.top ? r.top - y : (y > r.bottom ? y - r.bottom : 0);
            var d = dx * dx + dy * dy;
            if (!best || d < best.d) best = { el: el, r: r, d: d };
        });
        if (!best) return null;
        var side = horizontal(best.el);
        var after = side ? x > best.r.left + best.r.width / 2 : y > best.r.top + best.r.height / 2;
        return { el: best.el, r: best.r, after: after, side: side };
    };
    var finish = function () {
        document.documentElement.classList.remove('udte-dragging');
        if (drag && drag.item) drag.item.classList.remove('udte-drag-source');
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
            drag.item.classList.add('udte-drag-source');
            document.documentElement.classList.add('udte-dragging');
            var selection = window.getSelection && window.getSelection();
            if (selection) selection.removeAllRanges();
            line = document.createElement('div');
            line.id = 'udte-drop-line';
            document.body.appendChild(line);
            post({ udte: 'dragstart' });
        }
        e.preventDefault();
        drag.target = target(e.clientX, e.clientY);
        var t = drag.target;
        if (!t) { line.style.display = 'none'; return; }
        line.style.display = 'block';
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
        var active = drag.active;
        var t = drag.target;
        var from = drag.item.getAttribute('data-row-key');
        finish();
        if (!active) return;
        suppressClick = true;
        setTimeout(function () { suppressClick = false; }, 0);
        post({ udte: 'dragend' });
        if (t) post({ udte: 'move', from: from, to: t.el.getAttribute('data-row-key'), after: t.after });
    };
    var cancel = function (e) {
        if (!drag || e.pointerId !== drag.pointer) return;
        var active = drag.active;
        finish();
        if (active) post({ udte: 'dragend' });
    };
    document.addEventListener('pointerdown', function (e) {
        if (e.button !== 0 || drag || e.pointerType === 'touch') return;
        var item = e.target.closest && e.target.closest(ROW);
        if (!item || e.target.closest(CONTROLS)) return;
        drag = { item: item, x: e.clientX, y: e.clientY, pointer: e.pointerId, active: false, target: null };
        window.addEventListener('pointermove', move, true);
        window.addEventListener('pointerup', up, true);
        window.addEventListener('pointercancel', cancel, true);
    }, true);
})();
