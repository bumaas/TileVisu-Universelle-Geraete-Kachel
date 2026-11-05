/* Universal Device Tile – Editor: Icon-Auswahl. Namen und Zeichnungen kommen aus Symcons /icons.js: die
   Symcon-eigenen Icons (Kit), Font Awesome Light und die Marken. Die Kachel löst einen einfachen Namen in
   derselben Reihenfolge auf (Kit vor Light vor Marken), deshalb zählt je Name nur der erste Satz.
   Deutsche Namen und Suchbegriffe stehen in iconterms.js (aus der Icon-Datenbank der Symcon-Konsole);
   sie wird erst mit der ersten Icon-Auswahl geladen. Gezeichnet wird als SVG aus den Pfaddaten, und nur
   so viel, wie im Raster gerade sichtbar wird. */
(function (E) {
    'use strict';
    const h = E.h;
    const NS = 'http://www.w3.org/2000/svg';
    const SETS = ['fak', 'fal', 'fab'];
    const CHUNK = 240;
    const SUGGESTED = [
        'lightbulb', 'lightbulb-on', 'lamp-floor', 'lamp-desk', 'light-ceiling', 'plug', 'outlet', 'power-off', 'bolt',
        'solar-panel', 'battery-full', 'battery-half', 'car-battery', 'charging-station', 'car', 'gauge', 'gauge-high',
        'washing-machine', 'dryer', 'dryer-heat', 'oven', 'microwave', 'refrigerator', 'coffee-pot', 'fire-burner', 'vacuum-robot',
        'fan', 'air-conditioner', 'temperature-half', 'temperature-high', 'heat', 'fire-flame-curved', 'snowflake', 'droplet',
        'water', 'faucet', 'shower', 'sprinkler', 'plant-wilt', 'leaf', 'window-frame', 'window-frame-open', 'door-open',
        'door-closed', 'garage', 'garage-open', 'lock', 'lock-open', 'blinds', 'blinds-open', 'blinds-raised', 'sun', 'moon',
        'cloud-sun', 'wind', 'house', 'couch', 'bed', 'tv', 'speaker', 'music', 'wifi', 'camera-cctv', 'bell', 'person', 'users',
        'robot', 'clock', 'calendar', 'trash-can'
    ];

    let index = null;

    /** Alle Icons einmal einlesen: {name, def, words}; leer, wenn /icons.js fehlt. */
    const getIndex = () => {
        if (index) return index;
        const styles = (window.___FONT_AWESOME___ || {}).styles || {};
        const seen = new Map();
        SETS.forEach(prefix => {
            Object.entries(styles[prefix] || {}).forEach(([name, def]) => {
                if (seen.has(name) || !Array.isArray(def)) return;
                const aliases = (Array.isArray(def[2]) ? def[2] : []).filter(a => typeof a === 'string');
                seen.set(name, { name, prefix, def, aliases, de: '', words: [] });
            });
        });
        index = { all: [...seen.values()], byName: seen };
        return index;
    };

    /** Deutsche Begriffe nachladen (einmal): gleiche Adresse wie dieser Teil, nur f=iconterms.js. */
    let termsLoaded = null;
    const loadTerms = () => termsLoaded || (termsLoaded = new Promise(resolve => {
        const own = document.querySelector('script[src*="f=iconpicker.js"]');
        if (!own) { resolve(false); return; }
        const script = document.createElement('script');
        script.src = own.getAttribute('src').replace('f=iconpicker.js', 'f=iconterms.js');
        script.onload = () => {
            const terms = E.iconTerms || {};
            getIndex().all.forEach(entry => {
                const list = terms[entry.name];
                if (Array.isArray(list) && list.length) {
                    entry.de = String(list[0]);
                    entry.words = list.map(w => String(w).toLowerCase());
                }
            });
            resolve(true);
        };
        script.onerror = () => resolve(false);
        document.head.appendChild(script);
    }));

    /** Icon als SVG, wie die Kachel es auflöst; ohne Daten das gewohnte <i> (Light). */
    E.iconSvg = function (name) {
        const entry = name ? getIndex().byName.get(name) : null;
        if (!entry) return E.icon(name || 'circle-dashed');
        const [width, height, , , paths] = entry.def;
        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
        svg.setAttribute('class', 'svg-icon');
        svg.setAttribute('aria-hidden', 'true');
        const list = [].concat(paths);
        list.forEach((d, i) => {
            const path = document.createElementNS(NS, 'path');
            path.setAttribute('fill', 'currentColor');
            path.setAttribute('d', String(d));
            if (list.length > 1 && i === 0) path.setAttribute('opacity', '.4');
            svg.appendChild(path);
        });
        return svg;
    };

    /** Treffer nach Güte: genau (Name, Alias, deutscher Name), Anfang (Name, dann Alias, deutscher Name oder
        deutscher Begriff genau), Wortanfang im Namen, im Namen, irgendwo in Alias oder deutschen Begriffen. */
    const search = q => {
        const text = q.toLowerCase().trim();
        const needle = text.replace(/^fa-/, '').replace(/\s+/g, '-');
        const parts = text.split(/[\s-]+/).filter(Boolean);
        const rank = entry => {
            const a = entry.aliases;
            const w = entry.words; // deutscher Name zuerst, klein geschrieben
            if (entry.name === needle) return 0;
            if (a.includes(needle) || w[0] === text) return 1;
            if (entry.name.startsWith(needle)) return 2;
            if (a.some(x => x.startsWith(needle)) || (w.length && w[0].startsWith(text)) || w.includes(text)) return 3;
            if (entry.name.includes('-' + needle)) return 4;
            if (entry.name.includes(needle)) return 5;
            if (a.some(x => x.includes(needle)) || w.some(x => x.includes(text))) return 6;
            // Mehrere Wörter („Fenster gekippt“): jedes Wort muss irgendwo vorkommen
            return parts.length > 1 && parts.every(p => entry.name.includes(p) || a.some(x => x.includes(p)) || w.some(x => x.includes(p))) ? 7 : -1;
        };
        return getIndex().all.map(e => [rank(e), e]).filter(([r]) => r >= 0)
            .sort((a, b) => a[0] - b[0] || a[1].name.localeCompare(b[1].name)).map(([, e]) => e);
    };

    /** Icon wählen; done(name) bekommt den Namen, '' für „Kein Icon“. */
    E.pickIcon = function (current, done) {
        const { all, byName } = getIndex();
        const dialog = h('dialog', { class: 'picker icon-picker' });
        const input = h('input', { type: 'search', placeholder: E.t('Search icons'), autocomplete: 'off', spellcheck: 'false' });
        const grid = h('div', { class: 'icon-results' });
        const count = h('span', { class: 'muted' });
        const close = () => { observer.disconnect(); dialog.close(); dialog.remove(); };
        const choose = name => { close(); done(name); };
        dialog.append(
            h('div', { class: 'dialog-head' }, h('h2', { text: E.t('Select icon') }),
                h('button', { type: 'button', class: 'btn icon', title: E.t('Close'), onclick: close }, E.icon('xmark'))),
            input, grid,
            h('div', { class: 'dialog-foot' }, count,
                h('button', { type: 'button', class: 'btn', onclick: () => choose('') }, E.t('No icon')),
                h('button', { type: 'button', class: 'btn', onclick: close }, E.t('Cancel'))));
        dialog.addEventListener('cancel', e => { e.preventDefault(); close(); });

        const cell = entry => h('button', {
            type: 'button', class: 'icon-cell' + (entry.name === current ? ' current' : ''), 'data-name': entry.name,
            title: entry.de && entry.de.toLowerCase() !== entry.name.replace(/-/g, ' ') ? entry.de + ' (' + entry.name + ')' : entry.name,
            onclick: () => choose(entry.name)
        }, E.iconSvg(entry.name), h('span', { text: entry.name }));

        // Große Listen in Stücken: ein Wächter am Ende lädt das nächste Stück, sobald er sichtbar wird
        const observer = new IntersectionObserver(entries => {
            entries.forEach(en => { if (en.isIntersecting && en.target.more) { observer.unobserve(en.target); en.target.more(); } });
        }, { root: grid, rootMargin: '200px' });
        const section = (title, entries) => {
            const body = h('div', { class: 'icon-grid' });
            let at = 0;
            const more = () => {
                body.append(...entries.slice(at, at + CHUNK).map(cell));
                at += CHUNK;
                if (at < entries.length) {
                    const sentinel = h('div', { class: 'icon-sentinel' });
                    sentinel.more = () => { sentinel.remove(); more(); };
                    body.appendChild(sentinel);
                    observer.observe(sentinel);
                }
            };
            more();
            return h('section', {}, title ? h('h3', { text: title }) : null, body);
        };

        const show = () => {
            observer.disconnect();
            const q = input.value.trim();
            if (all.length === 0) {
                grid.replaceChildren(h('p', { class: 'muted pad', text: E.t('The icon list is not available. Type the Font Awesome name and press Enter.') }));
                count.textContent = '';
                return;
            }
            if (q === '') {
                const kit = all.filter(e => e.prefix === 'fak');
                const suggested = SUGGESTED.map(n => byName.get(n)).filter(Boolean);
                const parts = [];
                if (current && byName.has(current)) parts.push(section(E.t('Current'), [byName.get(current)]));
                if (kit.length) parts.push(section(E.t('Symcon icons'), kit));
                parts.push(section(E.t('Suggestions'), suggested), section(E.t('All icons'), all));
                grid.replaceChildren(...parts);
                count.textContent = E.tf('%d icons', all.length);
            } else {
                const found = search(q);
                grid.replaceChildren(found.length ? section('', found) : h('p', { class: 'muted pad', text: E.t('No icons found.') }));
                count.textContent = E.tf('%d icons', found.length);
            }
            grid.scrollTop = 0;
        };

        let timer = null;
        input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(show, 120); });
        input.addEventListener('keydown', e => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const first = grid.querySelector('.icon-cell');
                if (first) first.focus();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const first = grid.querySelector('.icon-cell');
                const typed = input.value.trim().replace(/^fa-/, '');
                if (first && typed !== '') first.click();
                else if (all.length === 0 && /^[A-Za-z0-9_-]{1,64}$/.test(typed)) choose(typed); // ohne Liste: Name von Hand
            }
        });
        // Pfeiltasten im Raster: links/rechts je ein Icon, hoch/runter eine Reihe (gleiche Spalte)
        grid.addEventListener('keydown', e => {
            const cellEl = e.target.closest && e.target.closest('.icon-cell');
            if (!cellEl || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
            e.preventDefault();
            const cells = [...grid.querySelectorAll('.icon-cell')];
            const i = cells.indexOf(cellEl);
            let next = null;
            if (e.key === 'ArrowLeft') next = cells[i - 1];
            else if (e.key === 'ArrowRight') next = cells[i + 1];
            else {
                const r = cellEl.getBoundingClientRect();
                const step = e.key === 'ArrowDown' ? 1 : -1;
                for (let j = i + step; j >= 0 && j < cells.length; j += step) {
                    const c = cells[j].getBoundingClientRect();
                    if ((step > 0 ? c.top > r.top + 4 : c.top < r.top - 4) && Math.abs(c.left - r.left) < r.width / 2) { next = cells[j]; break; }
                }
                if (!next && step < 0) next = input;
            }
            if (next) next.focus();
        });

        document.body.appendChild(dialog);
        dialog.showModal();
        show();
        // Kommen die deutschen Begriffe erst jetzt, gilt eine schon getippte Suche neu
        loadTerms().then(ok => { if (ok && dialog.open && input.value.trim() !== '') show(); });
        input.focus();
        const mark = grid.querySelector('.icon-cell.current');
        if (mark) mark.scrollIntoView({ block: 'nearest' });
    };
})(window.UDTE);
