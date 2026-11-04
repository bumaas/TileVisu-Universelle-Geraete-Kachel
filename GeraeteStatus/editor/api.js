/* Universal Device Tile – Editor: Übersetzung und Verbindung zum Hook.
   Der Zugangscode steht nur im Fragment (#c=…): er wird beim Laden gelesen, aus der Adressleiste
   entfernt und bei jeder Anfrage im Kopf X-UDT-Editor mitgeschickt, nie in der Adresse. */
(function (E) {
    'use strict';

    E.t = function (text) {
        const value = E.texts && Object.prototype.hasOwnProperty.call(E.texts, text) ? E.texts[text] : '';
        return value || text;
    };

    E.tf = function (text, ...args) {
        let i = 0;
        return E.t(text).replace(/%[sd]/g, () => String(args[i++] ?? ''));
    };

    const match = /(?:^|[#&])c=([0-9a-f]{20})/.exec(location.hash);
    let code = match ? match[1] : '';
    try {
        if (code) {
            sessionStorage.setItem('udte-code-' + location.pathname, code);
        } else {
            code = sessionStorage.getItem('udte-code-' + location.pathname) || '';
        }
    } catch (_) { /* ohne Speicher: Code nur bis zum Neuladen */ }
    if (location.hash) {
        history.replaceState(null, '', location.pathname + location.search);
    }

    E.hasCode = () => code !== '';

    /** POST ?api=<name>; liefert {status, data}. Netzfehler werden als status 0 gemeldet. */
    E.api = async function (name, body) {
        let response;
        try {
            response = await fetch('?api=' + encodeURIComponent(name), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-UDT-Editor': code },
                body: JSON.stringify(body || {}),
                cache: 'no-store',
                credentials: 'same-origin'
            });
        } catch (e) {
            return { status: 0, data: { error: 'network' } };
        }
        let data = {};
        try {
            data = await response.json();
        } catch (_) { /* leere oder kaputte Antwort */ }
        if (response.status === 401 || response.status === 429) {
            E.emit && E.emit('access', response.status);
        }
        return { status: response.status, data };
    };
})(window.UDTE);
