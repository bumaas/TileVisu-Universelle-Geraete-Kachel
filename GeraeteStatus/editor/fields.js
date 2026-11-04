/* Universal Device Tile – Editor: Eingabefelder. Jedes Feld liest über get() und schreibt über set(v),
   set läuft über E.change. Felder rendern sich nicht neu, solange man tippt (kein Fokusverlust). */
(function (E) {
    'use strict';
    const h = E.h;
    let uid = 0;

    const wrap = (label, control, extra) => {
        const id = control.id || (control.id = 'f' + (++uid));
        return h('div', { class: 'field' + (extra ? ' ' + extra : '') }, h('label', { for: id, text: label }), control);
    };

    E.f = {
        checkbox(label, get, set) {
            const input = h('input', { type: 'checkbox' });
            input.checked = !!get();
            input.addEventListener('change', () => set(input.checked));
            const id = input.id = 'f' + (++uid);
            return h('div', { class: 'field check' }, input, h('label', { for: id, text: label }));
        },

        number(label, get, set, opts = {}) {
            const input = h('input', { type: 'number', min: opts.min, max: opts.max, step: opts.step || 1, inputmode: 'decimal' });
            const shown = () => (opts.float ? String(+Number(get()).toFixed(4)) : String(get()));
            input.value = shown();
            const apply = () => {
                if (input.value === '') {
                    return;
                }
                let value = Number(input.value);
                if (!Number.isFinite(value)) {
                    return;
                }
                if (opts.min !== undefined) value = Math.max(opts.min, value);
                if (opts.max !== undefined) value = Math.min(opts.max, value);
                set(opts.float ? value : Math.round(value));
            };
            input.addEventListener('input', apply);
            input.addEventListener('change', () => { apply(); input.value = shown(); });
            const control = opts.suffix ? h('span', { class: 'with-suffix' }, input, h('span', { class: 'suffix', text: opts.suffix })) : input;
            if (opts.suffix) control.id = input.id = 'f' + (++uid);
            return wrap(label, control, 'num');
        },

        text(label, get, set, opts = {}) {
            const input = h('input', { type: 'text', maxlength: opts.max || 200, placeholder: opts.placeholder || '' });
            input.value = get() || '';
            input.addEventListener('input', () => set(input.value));
            return wrap(label, input);
        },

        select(label, get, set, options) {
            const select = h('select', {}, options.map(([value, caption]) => h('option', { value: String(value), text: caption })));
            select.value = String(get());
            select.addEventListener('change', () => {
                const option = options.find(([value]) => String(value) === select.value);
                set(option ? option[0] : select.value);
            });
            return wrap(label, select);
        },

        /** Farbe als Symcon-Zahl; -1 = transparent (die Kachel nimmt dann ihre Standardfarbe). */
        color(label, get, set, opts = {}) {
            const value = get();
            const input = h('input', { type: 'color' });
            const transparent = h('input', { type: 'checkbox', title: E.t('Transparent') });
            const toHex = v => '#' + (Math.max(0, v | 0) & 0xFFFFFF).toString(16).padStart(6, '0');
            input.value = value >= 0 ? toHex(value) : (opts.fallback || '#00cdab');
            transparent.checked = value < 0;
            input.disabled = transparent.checked;
            input.addEventListener('input', () => set(parseInt(input.value.slice(1), 16)));
            transparent.addEventListener('change', () => {
                input.disabled = transparent.checked;
                set(transparent.checked ? -1 : parseInt(input.value.slice(1), 16));
            });
            const tid = transparent.id = 'f' + (++uid);
            const control = h('span', { class: 'color' }, input, transparent, h('label', { for: tid, text: E.t('Transparent') }));
            control.id = input.id = 'f' + (++uid);
            return wrap(label, control, 'color-field');
        },

        /** Objektfeld: Name und Pfad, Knöpfe „Auswählen“ und „Entfernen“; kind = variable|script|image|object. */
        object(label, get, set, kind) {
            const name = h('span', { class: 'obj-name' });
            const show = () => {
                const id = get();
                name.textContent = id ? E.objectLabel(id) : E.t('Nothing selected');
                name.classList.toggle('missing', !!id && E.s.objects[String(id)] === null);
                clear.hidden = !id;
            };
            const choose = h('button', { type: 'button', class: 'btn small', onclick: () => E.pick(kind, get(), id => { set(id); show(); }) },
                E.icon('magnifying-glass'), ' ', E.t('Select'));
            const clear = h('button', { type: 'button', class: 'btn small icon', title: E.t('Remove'), onclick: () => { set(0); show(); } }, E.icon('xmark'));
            const control = h('span', { class: 'obj' }, name, choose, clear);
            control.id = choose.id = 'f' + (++uid);
            E.on('objects', () => { if (control.isConnected) show(); });
            show();
            return wrap(label, control, 'obj-field');
        },

        section(title, ...children) {
            return h('section', { class: 'group-box' }, h('h3', { text: title }), ...children);
        },

        row(...children) {
            return h('div', { class: 'field-row' }, ...children);
        }
    };

    E.alignOptions = () => [['left', E.t('left')], ['center', E.t('center')], ['right', E.t('right')]];
})(window.UDTE);
