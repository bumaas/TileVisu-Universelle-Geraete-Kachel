/* Universal Device Tile – Editor: Tastenkürzel und Rückgängig/Wiederholen in der Kopfzeile. Die Kürzel
   gelten im Editor und in der Vorschau-Kachel (die Brücke reicht Tasten herüber); in Dialogen bleiben die
   Tasten bei diesen. */
(function (E) {
    'use strict';
    const MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');

    /** Kürzel für Tooltips: ⌘Z auf dem Mac, sonst Strg+Z. */
    E.shortcut = (key, shift) => (MAC ? (shift ? '⇧⌘' : '⌘') + key : E.t('Ctrl') + '+' + (shift ? E.t('Shift') + '+' : '') + key);

    /** Taste ausführen; k = {key, mod, shift, alt, target, fromPreview}. true, wenn sie verbraucht ist. */
    E.handleKey = function (k) {
        if (document.querySelector('dialog[open]')) return false;
        const key = String(k.key || '').toLowerCase();
        if (k.mod && !k.alt) {
            if (key === 'z') { if (k.shift) E.redo(); else E.undo(); return true; }
            if (key === 'y') { E.redo(); return true; }
            if (key === 's') { E.saveDraft(); return true; }
        }
        if (!rowContext(k)) return false;
        const selected = E.s.selected;
        const picked = E.isMulti() ? E.pickedRows() : null;
        if (k.mod && !k.alt && key === 'd' && picked) { E.duplicateRows(picked); return true; }
        if ((key === 'delete' || key === 'backspace') && !k.mod && picked) { E.deleteRows(picked); return true; }
        if (k.mod && !k.alt && key === 'd' && selected !== null) { E.duplicateRow(selected); return true; }
        if ((key === 'delete' || key === 'backspace') && !k.mod && selected !== null) { E.deleteRow(selected); return true; }
        if (key === 'arrowup' || key === 'arrowdown') {
            const delta = key === 'arrowup' ? -1 : 1;
            if (k.alt && !k.mod) { if (selected !== null) E.moveRow(selected, delta); return true; }
            if (!k.mod && !k.shift) { step(delta); return true; }
        }
        if (key === 'escape' && (selected !== null || E.s.selectedGroup || picked)) { E.select(null); return true; }
        return false;
    };

    /** Zeilentasten nur, wo keine Eingabe den Fokus hat: in der Vorschau, auf der Seite selbst, in der Zeilenliste. */
    const rowContext = k => {
        if (k.fromPreview) return true;
        const t = k.target;
        if (!t || t === document.body || t === document.documentElement) return true;
        return !!(t.closest && t.closest('.row-item') && !t.closest('input, textarea, select'));
    };

    /** Vorige/nächste Zeile in der Reihenfolge der Vorschau (Gruppen stehen dort, wo die Kachel sie zeichnet). */
    const step = delta => {
        const d = E.previewDoc && E.previewDoc();
        let order = d ? [...d.querySelectorAll('.variable-item[data-row-key]')].map(el => parseInt(el.getAttribute('data-row-key'), 10)) : [];
        if (!order.length) order = E.rows().map((_, i) => i);
        if (!order.length) return;
        const last = E.isMulti() ? E.pickedRows().slice(-1)[0] : null;
        let from = order.indexOf(last ? E.rows().indexOf(last) : E.s.selected);
        if (from < 0 && E.s.selectedGroup) from = order.findIndex(i => E.groupNumber(E.rows()[i].Group) === E.s.selectedGroup) - (delta > 0 ? 1 : 0);
        const at = from < 0 ? (delta > 0 ? 0 : order.length - 1) : Math.max(0, Math.min(order.length - 1, from + delta));
        E.select(order[at]);
    };

    document.addEventListener('keydown', e => {
        if (e.defaultPrevented) return;
        if (E.handleKey({ key: e.key, mod: e.metaKey || e.ctrlKey, shift: e.shiftKey, alt: e.altKey, target: e.target })) e.preventDefault();
    });

    const undoButton = document.getElementById('undo');
    const redoButton = document.getElementById('redo');
    undoButton.title = E.t('Undo') + ' (' + E.shortcut('Z') + ')';
    redoButton.title = E.t('Redo') + ' (' + E.shortcut('Z', true) + ')';
    undoButton.setAttribute('aria-label', E.t('Undo'));
    redoButton.setAttribute('aria-label', E.t('Redo'));
    undoButton.addEventListener('click', () => E.undo());
    redoButton.addEventListener('click', () => E.redo());
    E.on('history', () => {
        undoButton.disabled = !E.canUndo();
        redoButton.disabled = !E.canRedo();
    });
})(window.UDTE);
