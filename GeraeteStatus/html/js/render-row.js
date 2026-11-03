        // Hilfsfunktion zum Rendern einer einzelnen Variable
        function renderSingleVariable(variable, isGrouped = false) {
            // Ausgeblendete Zeile (Balken bei inaktivem Status): leeres Element, damit Zeilen-Updates sie wiederfinden
            if (variable.hidden) {
                return `<div class="variable-item" style="display: none;" data-variable-id="${esc(variable.id)}" data-row-key="${esc(variable.key)}"></div>`;
            }
            let content = '';
            
            // Bestimme Darstellungstyp für Gruppenlayout
            const isProgressBar = variable.displayType === 'progress' || variable.displayType === 'slider';
            
            // Wrapper-Stil je nach Kontext - Progress-Balken unterstützen jetzt auch Gruppen
            let wrapperStyle;
            // Alignment mapping for text/button
            const alignment = (variable.alignment || 'left');
            const justifyMap = alignment === 'center' ? 'center' : (alignment === 'right' ? 'flex-end' : 'flex-start');
            
            // Nur font-size setzen wenn nicht -1
            const fontSizeStyle = variable.fontSize !== -1 ? `font-size: ${variable.fontSize}px;` : '';
            
            if (isGrouped) {
                if (isProgressBar) {
                    // Progress-Balken in Gruppen: Inline-flex damit sie nebeneinander passen, aber mit voller verfügbarer Breite
                    wrapperStyle = `display: inline-flex; align-items: center; margin: 0; ${fontSizeStyle} color: ${getTextColor(variable)};`;
                } else {
                    // Text/Button-Variablen in Gruppen: eigene Breite, Ausrichtung übernimmt die Gruppe
                    // SPEZIAL: Für Image in Gruppen flex-direction: column, daher align-items für horizontale Ausrichtung
                    const alignForGroupItem = (variable.displayType === 'image') ? `align-items: ${justifyMap};` : '';
                    // Für Bilder in Gruppen: Keine Breite am Wrapper setzen; Breite wird am .variable-group-item gesetzt
                    const noWrapForImage = (variable.displayType === 'image') ? '' : 'white-space: nowrap;';
                    const justifyForGroupItem = (variable.displayType === 'image') ? '' : `justify-content: ${justifyMap};`;
                    const alignSelfForGroupItem = (alignment === 'center') ? 'align-self: center;' : '';
                    wrapperStyle = `display: inline-flex; align-items: center; ${justifyForGroupItem} ${alignForGroupItem} ${alignSelfForGroupItem} margin: 0; ${noWrapForImage} ${fontSizeStyle} color: ${getTextColor(variable)};`;
                }
            } else {
                // Ungrouped: Standard-Layout mit horizontaler Ausrichtung für Text/Button/Image
                if (variable.displayType === 'text' || variable.displayType === 'button' || variable.displayType === 'image' || variable.displayType === 'slider') {
                    wrapperStyle = `display: flex; align-items: center; justify-content: ${justifyMap}; width: 100%; ${fontSizeStyle} color: ${getTextColor(variable)};`;
                } else {
                    wrapperStyle = `${fontSizeStyle} color: ${getTextColor(variable)};`;
                }
            }
                
            // CSS-Klassen für Variable zusammenstellen
            let cssClasses = 'variable-item';
            if (variable.displayType === 'text') {
                cssClasses += ' text-variable';
            } else if (variable.displayType === 'progress') {
                cssClasses += ' progress-variable';
            } else if (variable.displayType === 'slider') {
                cssClasses += ' slider-variable';
            }
            // Füge border-line Klasse hinzu wenn konfiguriert UND NICHT gruppiert
            // Bei gruppierten Variablen zeigt nur die Gruppe die Linie, nicht die einzelnen Variablen
            if (variable.showBorderLine && variable.displayType === 'text' && !isGrouped) {
                cssClasses += ' with-border-line';
            }
                
            // Add data-variable-id to outer wrapper for minimal updates (text/button/image)
            content += `<div class="${cssClasses}" style="${wrapperStyle}" data-variable-id="${esc(variable.id)}" data-row-key="${esc(variable.key)}">`;

                // Wert je nach Darstellungstyp hinzufügen
                if (variable.displayType === 'progress') {
                    content += renderProgressContent(variable, {});
                } else if (variable.displayType === 'slider') {
                    content += renderSliderContent(variable, {});
                } else if (variable.displayType === 'image') {
                    content += renderImageContent(variable, { isGrouped, alignment });
                } else if (variable.displayType === 'button') {
                    content += renderButtonContent(variable, { isGrouped, justifyMap });
                } else {
                    // Bei Textdarstellung: Label und Wert basierend auf Konfiguration
                    let textParts = [];
                    
                    // Icon für Text-Variablen
                    if (variable.showIcon && variable.icon && variable.icon !== 'Transparent') {
                        const iconClass = prepareIconForDisplay(variable.icon);
                        if (iconClass) {
                            textParts.push(`<i class="${esc(iconClass)} variable-icon" style="color: var(--accent-color);"></i>`);
                        }
                    }
                    
                    if (variable.showLabel && variable.label) {
                        // Doppelpunkt nur hinzufügen wenn auch Value angezeigt wird
                        const labelText = variable.showValue ? `${esc(variable.label)}:&nbsp;` : esc(variable.label);
                        textParts.push(`<span class="variable-label" style="color: ${getTextColor(variable)};">${labelText}</span>`);
                    }
                    
                    if (variable.showValue) {
                        textParts.push(`<span class="variable-value variable-text" style="flex: 0 0 auto;">${esc(variable.formattedValue)}</span>`);
                    }
                    
                    // Falls nichts konfiguriert ist, zeige Wert als Fallback
                    if (!variable.showIcon && !variable.showLabel && !variable.showValue) {
                        textParts.push(`<span class="variable-value variable-text" style="flex: 0 0 auto;">${esc(variable.formattedValue)}</span>`);
                    }
                    
                    // Für ungruppierte Text-Variablen: Container richtet bereits aus
                    content += textParts.join('');
                }

                content += `</div>`; // Schließe variable-item div
                
            return content;
        }
        
        function animateProgressBars(root = document) {
            const progressBars = root.querySelectorAll('.progress-bar');
            
            // Initialisiere Storage für vorherige Breiten falls nicht vorhanden
            if (!state.previousProgressWidths) {
                state.previousProgressWidths = {};
            }
            
            progressBars.forEach((progressBar, index) => {
                // Finde die Variable ID über das Parent-Element
                const progressContainer = progressBar.closest('.progress-container');
                if (!progressContainer) {
                    return;
                }
                
                const item = progressContainer.closest('.variable-item');
                const barKey = item ? item.getAttribute('data-row-key') : progressContainer.getAttribute('data-variable-id');
                if (!barKey) {
                    return;
                }
                
                // NEUE Breite aus data-new-width Attribut lesen (nicht aus DOM Style!)
                const newWidthFromData = parseFloat(progressContainer.getAttribute('data-new-width')) || 0;
                
                // ALTE Breite ist die aktuelle DOM-Breite (wurde von Render-Fix gesetzt)
                const oldWidthStyle = progressBar.style.width;
                const oldWidth = parseFloat(oldWidthStyle) || 0;
                

                
                // Nur animieren wenn sich die Breite geändert hat
                if (Math.abs(oldWidth - newWidthFromData) > 0.1) {
                    
                    // DOM ist bereits auf alte Breite gesetzt - KEINE Änderung nötig!
                    // (Der Render-Fix hat das bereits gemacht)
                    
                    // Force Reflow
                    progressBar.offsetWidth;
                    
                    // Aktiviere die CSS transition wieder
                    progressBar.style.transition = 'width 0.5s ease';
                    
                    // Setze die neue Breite - das triggert die Animation
                    progressBar.style.width = newWidthFromData + '%';
                }
                
                // Speichere NEUE Breite für nächstes Mal
                state.previousProgressWidths[barKey] = newWidthFromData;
            });
            

        }

        // Calculate progress bar percentage based on min/max values
        function calculateProgressValue(rawValue, progressMin, progressMax) {
            const { min: minValue, max: maxValue } = effectiveRange(progressMin, progressMax);
            const currentValue = parseFloat(rawValue) || 0;
            
            const range = maxValue - minValue;
            if (range <= 0) {
                return 0;
            }
            
            const progressValue = Math.max(0, Math.min(100, ((currentValue - minValue) / range) * 100));
            return isNaN(progressValue) ? 0 : progressValue;
        }
        
        // Hilfsfunktion für Progress-Bar-Update

        // Buttons der Kachel: ein Listener für alle; Ziel (data-variable-id) und Wert (data-request-value, JSON) stehen am Button
        document.addEventListener('click', function (event) {
            const button = (event.target && event.target.closest) ? event.target.closest('.variable-button[data-request-value], .variable-multi-button[data-request-value]') : null;
            if (!button || !button.closest('#variables-container')) {
                return;
            }
            const item = button.closest('.variable-item');
            const key = item ? item.getAttribute('data-row-key') : null;
            let value;
            try {
                value = JSON.parse(button.dataset.requestValue);
            } catch (_) {
                return;
            }
            if (key !== null && key !== '') {
                handleButtonClick(button, key, value);
            }
        });

        // Tastatur: Enter und Leertaste auf einem fokussierten Button (role="button") wirken wie ein Klick
        document.addEventListener('keydown', function (event) {
            if ((event.key !== 'Enter' && event.key !== ' ') || event.repeat) {
                return;
            }
            const button = (event.target && event.target.closest) ? event.target.closest('.variable-button[data-request-value], .variable-multi-button[data-request-value]') : null;
            if (!button || !button.closest('#variables-container')) {
                return;
            }
            event.preventDefault(); // die Leertaste scrollt sonst die Seite
            button.click();
        });

        // Globaler Vertrag: handleMessage wird vom PHP-injizierten Initial-Skript aufgerufen.
        window.handleMessage = handleMessage;
