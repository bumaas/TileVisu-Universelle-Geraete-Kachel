
        // Zentraler Laufzeit-Zustand der Kachel (früher verstreute window.*-Globals).
        // window.assets bleibt bewusst global: es wird vom PHP-injizierten Asset-Skript gesetzt.
        const state = {
            // Zeilen-Protokoll: Zeilen-Schlüssel → zuletzt empfangene Zeile; Regler: Schlüssel der gezogenen
            // Zeile und eigene Werte, deren Bestätigung aussteht
            rows: new Map(),
            dragRowKey: null,
            sliderPending: new Map(),
            // Lokalisierbare Frontend-Texte (werden aus GetFullUpdateMessage() überschrieben)
            uiTexts: {
                on: 'On',
                off: 'Off',
                targetSoc: 'Target SOC',
                deviceImage: 'Device Image',
                image: 'Image'
            }
        };

        // Werte, Beschriftungen, Zuordnungen und Namen aus Symcon kommen nur als Text ins HTML, nie als Markup
        const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
        function esc(value) {
            return String(value ?? '').replace(/[&<>"']/g, c => HTML_ESCAPES[c]);
        }

        function getUiText(key, fallback) {
            if (state.uiTexts && typeof state.uiTexts[key] === 'string' && state.uiTexts[key] !== '') {
                return state.uiTexts[key];
            }
            return fallback;
        }

        
        // Icons werden direkt vom Server gemappt, wir müssen nur noch die richtigen CSS-Klassen hinzufügen
        
        // Bereite ein Icon für die Verwendung im Frontend vor
        function prepareIconForDisplay(iconName) {
            // Wenn kein Icon oder leerer String, nichts zurückgeben
            if (!iconName || iconName === 'Transparent' || iconName === '') {
                return '';
            }
            
            // Das Icon wurde bereits auf dem Server gemappt, wir müssen nur sicherstellen
            // dass das richtige Präfix vorhanden ist
            let iconClass = iconName;
            
            // Respektiere vorhandene Prefixe (inkl. fa-kit/fak) und ergänze nur fa-fw
            const hasPrefix =
                iconClass.startsWith('fa-light ') ||
                iconClass.startsWith('fa-solid ') ||
                iconClass.startsWith('fa-regular ') ||
                iconClass.startsWith('fa-brands ') ||
                iconClass.startsWith('fas ') ||
                iconClass.startsWith('far ') ||
                iconClass.startsWith('fal ') ||
                iconClass.startsWith('fab ') ||
                iconClass.startsWith('fa-kit ') ||
                iconClass.startsWith('fak ');

            if (hasPrefix) {
                if (!iconClass.includes('fa-fw')) {
                    iconClass = 'fa-fw ' + iconClass;
                }
                return iconClass;
            }

            // Kein Prefix angegeben: Versuche dynamisch das verfügbare Set zu finden (Kit → Solid → Regular → Light → Brands)
            const styles = [
                { classes: 'fa-kit fak', find: 'fak' },
                { classes: 'fa-solid',  find: 'fas' },
                { classes: 'fas',       find: 'fas' },
                { classes: 'fa-regular',find: 'far' },
                { classes: 'far',       find: 'far' },
                { classes: 'fa-light',  find: 'fal' },
                { classes: 'fal',       find: 'fal' },
                { classes: 'fa-brands', find: 'fab' },
                { classes: 'fab',       find: 'fab' },
            ];

            const baseName = iconClass.startsWith('fa-') ? iconClass.substring(3) : iconClass;

            if (window.FontAwesome && typeof window.FontAwesome.findIconDefinition === 'function') {
                for (const s of styles) {
                    try {
                        const def = window.FontAwesome.findIconDefinition({ prefix: s.find, iconName: baseName });
                        if (def) {
                            return `fa-fw ${s.classes} fa-${baseName}`;
                        }
                    } catch (e) {
                        // continue
                    }
                }
            }

            // Rueckfall ohne FontAwesome: Symcons icons.js liefert nur den Light-Schnitt, jeder andere bliebe leer
            return `fa-fw fa-light fa-${baseName}`;
        }
        
        // Script-Buttons drehen ihr Icon 5 s lang. Der Zustand hängt am Zeilen-Schlüssel und übersteht das
        // Ersetzen der Zeile (renderButtonContent liest ihn); danach wird die Zeile neu gerendert.
        state._scriptButtonSpinUntil = {};

        function startRowSpin(key) {
            state._scriptButtonSpinUntil[key] = Date.now() + 5000;
            replaceRow(key);
            setTimeout(() => {
                if ((state._scriptButtonSpinUntil[key] || 0) <= Date.now()) {
                    delete state._scriptButtonSpinUntil[key];
                    replaceRow(key);
                }
            }, 5200);
        }

        // Klick auf einen Button der Zeile $key: Objekt öffnen oder requestAction mit Zeilen-Schlüssel und Wunschwert
        function handleButtonClick(buttonEl, key, value) {
            const openObjectId = parseInt(buttonEl.dataset.openObjectId || '0', 10);
            if (openObjectId > 1 && typeof openObject === 'function') {
                openObject(openObjectId);
                return;
            }
            if (buttonEl.dataset.scriptButton === '1') {
                startRowSpin(key);
            }
            if (typeof requestAction === 'function') {
                requestAction('row_' + key, value);
            }
        }
        
        // Hilfsfunktion zur Bestimmung der Textfarbe
        // 'left'|'center'|'right' → justify-content-Wert (Default: center)
        function alignmentToFlex(alignment) {
            switch (alignment) {
                case 'left': return 'flex-start';
                case 'right': return 'flex-end';
                default: return 'center';
            }
        }

        // 'left'|'center'|'right' → Auto-Margin (Default: zentriert)
        function alignmentToMargin(alignment) {
            switch (alignment) {
                case 'left': return '0 auto 0 0';
                case 'right': return '0 0 0 auto';
                default: return '0 auto';
            }
        }

        // Wendet die Bild-/Icon-Ausrichtung auf die Bildspalte an (Bild ODER Icon)
        function applyImageAlignment(alignment) {
            const div1 = document.querySelector('.main_container .div1');
            const imgElement = document.querySelector('.main_container .div1 img');
            const iconContainer = document.querySelector('.main_container .div1 .fontawesome-icon-container');
            if (!div1) {
                return;
            }
            // Stelle sicher, dass flex-Kontext vorhanden ist (für alle Positionen)
            div1.style.display = 'flex';
            div1.style.justifyContent = alignmentToFlex(alignment);
            // Für IMG zusätzlich Margin setzen (visuelle Sicherheit)
            if (imgElement) {
                imgElement.style.margin = alignmentToMargin(alignment);
            }
            // Icon-Container: Margin und justify-content entsprechend setzen
            if (iconContainer) {
                iconContainer.style.margin = alignmentToMargin(alignment);
                iconContainer.style.justifyContent = alignmentToFlex(alignment);
            }
        }

        // Erkennt Symcon-Sentinels für "transparent/-1" und fällt auf die Accent-Color zurück
        function normalizeColor(c) {
            if (c === -1 || c === '-1' || c === null || c === undefined) return 'var(--accent-color)';
            if (typeof c !== 'string') return c;
            const s = c.trim().toLowerCase();
            // Symcon sentinel for -1 as 64-bit hex
            if (s === '#ffffffffffffffff' || s === '0xffffffffffffffff' || s === 'ffffffffffffffff') return 'var(--accent-color)';
            if (!s || s === 'transparent' || s === '#0000' || s === '#00000000') return 'var(--accent-color)';
            if (/^rgba\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0\s*\)$/.test(s)) return 'var(--accent-color)';
            if (/^rgb\s*\(\s*\d+\s+\d+\s+\d+\s*\/\s*0\s*\)$/.test(s)) return 'var(--accent-color)';
            if (/^hsla\s*\(.*?,\s*0\s*\)$/.test(s)) return 'var(--accent-color)';
            if (/^#[0-9a-f]{8}$/.test(s) && s.endsWith('00')) return 'var(--accent-color)';
            return c;
        }

        function getTextColor(variable) {
            // Verwende --content-color wenn TextColor transparent ist, ansonsten die konfigurierte Farbe
            if (variable.isTextColorTransparent) {
                return 'var(--content-color)';
            }
            return variable.textColor;
        }

        // Schrift auf Schaltern: Inaktive Schalter liegen unter einem dunklen Overlay. Ohne eigene
        // Textfarbe wäre die Schrift im hellen Design dunkel auf dunkel, deshalb dort Weiß.
        function getButtonTextColor(variable, isActive) {
            if (!isActive && variable.isTextColorTransparent) {
                return '#ffffff';
            }
            return getTextColor(variable);
        }

        // Hilfsfunktion zur Anwendung der Bildposition
        function applyImagePosition(position) {
            const mainContainer = document.querySelector('.main_container');
            if (!mainContainer) {
                return;
            }
            
            // Entferne alle bisherigen Bildpositions-Klassen
            mainContainer.classList.remove('image-left', 'image-right', 'image-top', 'image-bottom');
            
            // Füge die entsprechende Klasse hinzu
            switch (position) {
                case 'left':
                    mainContainer.classList.add('image-left');
                    break;
                case 'right':
                    mainContainer.classList.add('image-right');
                    break;
                case 'top':
                    mainContainer.classList.add('image-top');
                    break;
                case 'bottom':
                    mainContainer.classList.add('image-bottom');
                    break;
                default:
                    // Fallback auf links
                    mainContainer.classList.add('image-left');
                    break;
            }
        }

        // Hilfsfunktion zur Bildanzeige-Steuerung basierend auf Bildauswahl und Bildbreite
        function updateImageVisibility() {
            const div1 = document.getElementById('div1');
            const div2 = document.getElementById('div2');
            const mainContainer = document.querySelector('.main_container');
            const bildauswahl = state.currentBildauswahl;
            const bildbreite = state.currentBildbreite;
            
            // Only handle COLUMN hiding vs showing - let renderStatus() handle individual image content
            const hideImageColumn = state.hideImageColumn || false;
            
            if (hideImageColumn) {
                // Hide ENTIRE COLUMN when backend determines no images should be shown
                if (div1) {
                    div1.style.display = 'none';
                    div1.className = 'hidden';
                }
                if (div2) {
                    div2.style.padding = '0px';
                    div2.style.width = '100%'; // div2 nimmt gesamte Breite ein
                }
            } else {
                // Show COLUMN - renderStatus() will handle individual image/icon content exclusively
                if (div1) {
                    div1.style.display = 'block';
                    div1.className = 'div1';
                    // WICHTIG: Hier NICHT das #image sichtbar schalten.
                    // Sonst kann kurzzeitig ein leeres Bild (blaues Quadrat) sichtbar werden,
                    // bevor renderStatus() das tatsächliche Icon/Bild setzt.
                }
                if (div2) {
                    div2.style.width = '100%'; // div2 bleibt flexibel
                }
            }
        }

        function updateProgressBarStyles(config) {
            const root = document.documentElement;
            
            // Setze CSS-Variablen für die zentrale Konfiguration
            root.style.setProperty('--progress-bar-height', config.height + 'px');
            root.style.setProperty('--progress-bar-border-radius', config.borderRadius + 'px');
            
            // Konvertiere Hintergrundfarbe zu rgba mit Transparenz; „transparent“ (-1 im Formular) bleibt durchsichtig
            const bgColor = String(config.backgroundColor || '');
            const opacity = config.backgroundOpacity;
            let rgbaColor = 'transparent';
            if (/^#[0-9A-Fa-f]{6}$/.test(bgColor)) {
                const r = parseInt(bgColor.substr(1, 2), 16);
                const g = parseInt(bgColor.substr(3, 2), 16);
                const b = parseInt(bgColor.substr(5, 2), 16);
                rgbaColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
            }
            
            root.style.setProperty('--progress-bar-bg-color', rgbaColor);
            root.style.setProperty('--progress-bar-bg-opacity', '1'); // Opacity bereits in rgba enthalten
            // Dynamisches Padding basierend auf Textgröße: Padding = fontSize / 2
            const fontSize = parseInt(getComputedStyle(document.documentElement).fontSize) || 12;
            const dynamicPadding = Math.max(4, Math.round(fontSize / 1)); // Minimum 4px
            root.style.setProperty('--progress-bar-text-padding', dynamicPadding + 'px');
            root.style.setProperty('--progress-bar-show-text', config.showText ? 'flex' : 'none');
        }

        function updateButtonStyles(config) {
            const root = document.documentElement;
            
            // Setze CSS-Variable für die zentrale Button-Konfiguration
            root.style.setProperty('--button-height', config.height + 'px');
        }

