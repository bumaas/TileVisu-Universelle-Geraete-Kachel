/* Universal Device Tile – Editor: Stil, den der Editor in die Vorschau-Kachel legt (Thema, Rahmen, Auswahl,
   Ziehen, Platzhalter). Ausgelagert aus preview.js; die Vorschau setzt ihn als <style id="udte-theme">. */
(function (E) {
    'use strict';

    E.PREVIEW_THEMES = {
        dark: { card: '#1c1c1e', content: '#f2f2f7', accent: '#00cdab', page: '#000000' },
        light: { card: '#ffffff', content: '#1c1c1e', accent: '#00b89c', page: '#e9e9ee' }
    };

    /** CSS für die Vorschau im Thema name (dark | light). */
    E.previewCss = function (name) {
        const t = E.PREVIEW_THEMES[name] || E.PREVIEW_THEMES.dark;
        return ':root{--accent-color:' + t.accent + ';--content-color:' + t.content + ';--card-color:' + t.card + '}'
            + 'html,body{background:var(--card-color)}body{font-size:14px!important;margin:12px 20px 15px 20px!important}'
            + 'html{-webkit-user-select:none;user-select:none}' // in der Vorschau nichts markieren (Klicks, Ziehen)
            + '.udte-selected{outline:1.5px solid var(--accent-color);outline-offset:3px;border-radius:6px}'
            + '.variable-item{cursor:pointer}'
            + '#udte-add{display:flex;align-items:center;justify-content:center;width:100%;height:30px;margin:6px 0 0;padding:0;'
            + 'border:1.5px dashed currentColor;border-radius:8px;background:transparent;color:var(--content-color);opacity:.35;'
            + 'font:300 22px/1 sans-serif;cursor:pointer}'
            + '#udte-add:hover,#udte-add:focus-visible{opacity:1;color:var(--accent-color);outline:none}'
            + '.udte-drag-source{opacity:.6;outline:1.5px solid var(--accent-color);outline-offset:3px;border-radius:6px;box-shadow:0 8px 22px rgba(0,0,0,.35)}'
            + '.udte-drag-part{opacity:.6}.udte-empty-group{opacity:.3}'
            + '.udte-drop-group{outline:1.5px solid var(--udte-group-color,var(--accent-color));outline-offset:1px;border-radius:10px}'
            + '.udte-group-frame{position:absolute;z-index:40;pointer-events:none;box-sizing:border-box;border:1.5px dashed var(--accent-color);border-radius:10px}.udte-group-frame.selected{border-style:solid}'
            + '.group-name-label,.group-name-above,.variable-group,.group-line{cursor:grab}'
            + 'html.udte-dragging .udte-selected{outline:none}html.udte-dragging .udte-group-frame{display:none}'
            + '.udte-placeholder{border:1.5px dashed rgba(127,127,127,.6);border-radius:8px;padding:4px 8px;box-sizing:border-box;max-width:100%}'
            // Rahmen der Zeilen als Umriss: er nimmt keinen Platz, die Zeilen stehen mit und ohne Rahmen wie in der Visualisierung
            + '.udte-framed:not(.udte-placeholder){outline:1.5px dashed rgba(127,127,127,.6);outline-offset:1px;border-radius:6px}'
            // gewählt: nur ein Rahmen (durchgehend, Akzentfarbe) statt Gruppenrahmen plus Auswahl; in gewählter Gruppe ohne eigenen Rahmen
            + 'html:not(.udte-dragging) .udte-placeholder.udte-selected{outline:none;border-style:solid;border-color:var(--accent-color)}'
            + 'html:not(.udte-dragging) .udte-framed:not(.udte-placeholder).udte-selected{outline-style:solid;outline-color:var(--accent-color)}'
            + '.udte-group-selected .udte-placeholder:not(.udte-selected){border-color:transparent}'
            + '.udte-group-selected .udte-framed:not(.udte-placeholder):not(.udte-selected){outline-color:transparent}'
            + 'html.udte-no-frames .udte-placeholder:not(.udte-selected){border-color:transparent}html.udte-no-frames .udte-group-frame:not(.selected){display:none}'
            + 'html.udte-no-frames .udte-framed:not(.udte-placeholder):not(.udte-selected):not(.udte-drag-source){outline-color:transparent}'
            // beim Ziehen: Zeile durchgehend grau, eine gezogene Gruppe durchgehend in ihrer Farbe am Rand ihres Kastens
            + '.udte-placeholder.udte-drag-source{outline:none;border-style:solid}'
            + '.udte-framed:not(.udte-placeholder).udte-drag-source{outline:1.5px solid rgba(127,127,127,.6);outline-offset:1px}'
            + '.variable-group.udte-drag-source{outline-color:var(--udte-group-color,var(--accent-color));outline-offset:1px;border-radius:10px}'
            + '.variable-group.udte-drag-source .udte-placeholder{border-color:transparent}'
            + '.variable-group.udte-drag-source .udte-framed:not(.udte-placeholder){outline-color:transparent}'
            + '#udte-status-placeholder>span:first-child{white-space:nowrap}'
            + '.udte-placeholder{min-width:0}.udte-placeholder .variable-label{display:block!important;flex:0 1 auto!important;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-right:8px!important}'
            + '#div2:has(.udte-placeholder){min-width:0}#udte-status-placeholder{max-width:100%}'
            + '.udte-placeholder .variable-value{display:block!important;opacity:.6;font-style:italic;flex:0 100 auto!important;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:.2em!important;margin-right:8px!important}'
            + '.variable-group-item:has(>.udte-placeholder){min-width:0;max-width:100%}'
            + '#udte-status-placeholder{display:flex;align-items:center;gap:8px;margin:4px 0 8px;font-weight:bold}'
            + '.udte-pick,.udte-remove{height:26px;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;line-height:1}'
            + '.udte-pick{margin-left:auto;padding:0 11px;border-radius:6px;border:0;background:var(--accent-color);'
            + 'color:var(--card-color);font:inherit;font-size:12px;font-weight:600;cursor:pointer;flex:none}'
            + '.udte-pick:hover{filter:brightness(1.12)}'
            + '.udte-remove{margin-left:6px;width:30px;padding:0;border:0;border-radius:6px;background:rgba(127,127,127,.25);color:inherit;'
            + 'cursor:pointer;flex:none}.udte-remove svg{width:13px;height:13px}'
            + '.udte-remove:hover{background:#d6453d;color:#fff}'
            + 'html.udte-dragging,html.udte-dragging *{user-select:none!important;cursor:grabbing!important}';
    };
})(window.UDTE);
