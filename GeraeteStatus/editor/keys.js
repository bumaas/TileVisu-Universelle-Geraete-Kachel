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
        return false;
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
