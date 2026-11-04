        function renderButtonContent(variable, ctx) {
            const { isGrouped, justifyMap } = ctx;
            let content = '';
                    // Button für Bool-Variablen (VARIABLETYPE_BOOLEAN = 0) und Integer-Variablen (VARIABLETYPE_INTEGER = 1)
                    if (variable.variableType === 0) {
                        // Boolean-Variable: Einzelner Button
                        
                        // Erweiterte Bool-Wert-Erkennung
                        const isScriptButton = (typeof variable.id === 'string' && variable.id.indexOf('script_') === 0);
                        const spinUntil = state._scriptButtonSpinUntil[String(variable.key)] || 0;
                        const spinActive = isScriptButton && Date.now() < spinUntil;
                        // Script-Buttons sollen optisch immer aktiv sein
                        const isActive = isScriptButton ? true : (variable.rawValue === true || variable.rawValue === 1 || variable.rawValue === '1' || variable.rawValue === 'true');
                        // Verwende den tatsächlichen Boolean-Wert für Association-Matching (nicht Integer-Konvertierung!)
                        const currentBoolValue = variable.rawValue; // Direkt verwenden, da Associations auch Boolean-Werte haben
                        
                        
                        // Bool-Buttons: Farbe (initial rendering)
                        // Transparent im Formular => versuche Presentation-Farbe; sonst Accent-Color
                        let buttonColor = 'var(--accent-color)';
                        let associationIcon = null;
                        let associationName = null;
                        
                        if (variable.isBoolButtonColorTransparent) {
                            const arr = variable.variableAssociations;
                            if (arr && Array.isArray(arr)) {
                                const currentAssociation = arr.find(assoc => assoc.value === currentBoolValue);
                                buttonColor = (currentAssociation && currentAssociation.color) ? currentAssociation.color : 'var(--accent-color)';
                            } else {
                                buttonColor = 'var(--accent-color)';
                            }
                        } else {
                            buttonColor = variable.boolButtonColor || 'var(--accent-color)';
                        }
                        

                        
                        // Association-Icon und Name für Bool Buttons (nur für Icon/Name, nicht für Farbe)
                        const associations = variable.variableAssociations;
                        if (associations && Array.isArray(associations)) {
                            const currentAssociation = associations.find(assoc => assoc.value === currentBoolValue);
                            if (currentAssociation) {
                                associationIcon = currentAssociation.icon;
                                associationName = currentAssociation.name;

                            }
                        }                
                        const opacity = isActive ? '1' : '0.5'; // Script-Buttons gelten immer als aktiv → oben isActive=true
                        const buttonWidth = variable.buttonWidth || 120;
                        
                        // Prüfe ob die aktuelle Gruppe im stretch-Modus ist
                        let isGroupStretched = false;
                        if (isGrouped && variable.group && state.groupNames) {
                            const groupMatch = variable.group.match(/Gruppe (\d+)/);
                            if (groupMatch) {
                                const groupNumber = parseInt(groupMatch[1]);
                                const groupConfig = state.groupNames[groupNumber];
                                if (groupConfig && groupConfig.stretch) {
                                    isGroupStretched = true;
                                }
                            }
                        }
                        
                        let buttonText = '';
                        let iconHtml = '';
                        
                        // Icon-Verarbeitung für Button - Verwende Association-Icon falls vorhanden
                        let finalIcon = associationIcon || variable.icon; // Association-Icon hat Priorität
                        if (variable.showIcon && finalIcon && finalIcon !== 'Transparent') {
                            const baseClass = prepareIconForDisplay(finalIcon);
                            if (baseClass) {
                                const iconClass = spinActive ? `${baseClass} fa-spin` : baseClass; // nur fa-spin hinzufügen
                                iconHtml = `<i class="${esc(iconClass)}" style="margin-right: 6px;"></i>`;
                            }
                        } else if (spinActive) {
                            // Kein Icon konfiguriert, aber Spin aktiv → temporären Spinner darstellen
                            const spinBase = prepareIconForDisplay('rotate') || 'fa-fw fa-light fa-rotate';
                            iconHtml = `<i class="${spinBase} fa-spin" style="margin-right: 6px;"></i>`;
                        }
                        let textParts = [];
                        
                        if (variable.showIcon && iconHtml) {
                            textParts.push(iconHtml);
                        }
                        
                        if (variable.showLabel) {
                            // Verwende Variablenname als Label (höchste Priorität), dann Association-Name als Fallback
                            const displayLabel = variable.label || associationName || (isActive ? getUiText('on', 'On') : getUiText('off', 'Off'));
                            if (variable.showValue) {
                                // Doppelpunkt nur wenn auch Value angezeigt wird - Label fett
                                textParts.push(`<span style="font-weight: 700;">${esc(displayLabel)}:&nbsp;</span>`);
                            } else {
                                // Kein Doppelpunkt wenn nur Label - Label fett
                                textParts.push(`<span style="font-weight: 400;">${esc(displayLabel)}</span>`);
                            }
                        }
                        
                        if (variable.showValue) {
                            textParts.push(`<span style="font-weight: normal;">${esc(variable.formattedValue)}</span>`);
                        }
                        
                        // Falls keine Checkbox aktiviert ist, zeige Label als Fallback (ohne Doppelpunkt) - fett
                        if (!variable.showIcon && !variable.showLabel && !variable.showValue) {
                            textParts.push(`<span style="font-weight: 400;">${esc(variable.label || (isActive ? getUiText('on', 'On') : getUiText('off', 'Off')))}</span>`);
                        }
                        
                        buttonText = textParts.join(' ');
                        
                        // Spezielle Behandlung für nur Icon (ohne Abstand)
                        const isIconOnly = variable.showIcon && !variable.showLabel && !variable.showValue && iconHtml;
                        if (isIconOnly) {
                            buttonText = iconHtml.replace('margin-right: 6px;', '');
                        }
                        
                        // Button-Styles: Bool-Button soll IMMER seine buttonWidth verwenden
                        let buttonStyleExtras = `width: ${buttonWidth}px; min-width: ${buttonWidth}px;`;
                        
                        // Für ungruppierte Buttons: horizontale Ausrichtung des Containers entsprechend Einstellung
                        const buttonContainerJustify = (!isGrouped) ? `justify-content: ${justifyMap};` : '';
                        content += `
                            <div class="variable-button-container" style="${buttonContainerJustify}">
                                <div class="variable-button ${isActive ? '' : 'inactive'} ${isIconOnly ? 'icon-only' : ''}" role="button" tabindex="0"
                                        data-request-value="${esc(JSON.stringify(isScriptButton ? 1 : !isActive))}" 
                                        data-variable-id="${esc(variable.id)}"
                                        data-script-button="${isScriptButton ? '1' : '0'}"
                                        data-open-object-id="${(variable.openObjectId && variable.openObjectId > 1) ? variable.openObjectId : 0}"
                                        style="background-color: ${esc(buttonColor)} !important; color: ${getButtonTextColor(variable, isActive)} !important; ${buttonStyleExtras}">
                                    ${buttonText}
                                </div>
                            </div>
                        `;
                        
                    } else if ((variable.variableType === 1 || variable.variableType === 3) && (variable.variableAssociations || variable.integerAssociations)) {
                        // Integer/String-Variable: Multi-Button für jede Association
                        const associations = variable.variableAssociations || variable.integerAssociations;
                        const variableTypeLabel = variable.variableType === 1 ? 'Integer' : 'String';
                        
                        // ButtonWidth aus Variablenkonfiguration verwenden (wie bei Boolean-Buttons)
                        const buttonWidth = variable.buttonWidth || 80; // Etwas schmaler für Multi-Buttons
                        
                        // Prüfe ob die aktuelle Gruppe im stretch-Modus ist (dann keine feste Breite setzen)
                        let isGroupStretched = false;
                        if (isGrouped && variable.group && state.groupNames) {
                            const groupMatch = variable.group.match(/Gruppe (\d+)/);
                            if (groupMatch) {
                                const groupNumber = parseInt(groupMatch[1]);
                                const groupConfig = state.groupNames[groupNumber];
                                if (groupConfig && groupConfig.stretch) {
                                    isGroupStretched = true;
                                }
                            }
                        }
                        
                        let buttonsHtml = '';
                        const currentValue = variable.variableType === 1 ? parseInt(variable.rawValue) : variable.rawValue;
                        
                        associations.forEach((association, index) => {
                            const isActive = currentValue === association.value;
                            const buttonColor = association.color || 'var(--accent-color)';
                            const opacity = isActive ? '1' : '0.5';
                            
                            // Button-Gruppierung: Bestimme CSS-Klasse basierend auf Position
                            let positionClass = '';
                            const totalButtons = associations.length;
                            
                            if (totalButtons === 1) {
                                positionClass = 'single-button'; // Nur ein Button: alle Ecken rund
                            } else if (index === 0) {
                                positionClass = 'first-button'; // Erster Button: nur links rund
                            } else if (index === totalButtons - 1) {
                                positionClass = 'last-button'; // Letzter Button: nur rechts rund
                            } else {
                                positionClass = 'middle-button'; // Mittlere Buttons: keine runden Ecken
                            }
                            
                            // Button-Text basierend auf Display-Konfiguration generieren
                            let buttonContentParts = [];
                            
                            // Icon hinzufügen falls konfiguriert und vorhanden
                            let hasIconInt = false;
                            if (variable.showIcon) {
                                let iconToUse = association.icon;
                                if (!iconToUse || iconToUse === 'Transparent' || iconToUse === null) {
                                    iconToUse = variable.icon; // Fallback auf Standard-Icon der Variable
                                }
                                
                                if (iconToUse && iconToUse !== 'Transparent') {
                                    const iconClass = prepareIconForDisplay(iconToUse);
                                    if (iconClass) {
                                        const iconMargin = (!variable.showLabel && !variable.showValue) ? '' : 'margin-right: 4px;';
                                        buttonContentParts.push(`<i class="${esc(iconClass)}" style="${iconMargin}"></i>`);
                                        hasIconInt = true;
                                    }
                                }
                            }
                            
                            // Label hinzufügen falls konfiguriert
                            if (variable.showLabel) {
                                // Beschriftung (variable.label) hat Vorrang, wenn gesetzt, sonst Association-Name
                                const lbl = (typeof variable.label === 'string' && variable.label.trim() !== '') ? variable.label : association.name;
                                if (lbl) {
                                    if (variable.showValue) {
                                        // Label mit Doppelpunkt wenn auch Value gezeigt wird
                                        buttonContentParts.push(`<span style="font-weight: 700;">${esc(lbl)}:&nbsp;</span>`);
                                    } else {
                                        // Nur Label ohne Doppelpunkt
                                        buttonContentParts.push(`<span style="font-weight: 400;">${esc(lbl)}</span>`);
                                    }
                                }
                            }
                            
                            // Value hinzufügen falls konfiguriert
                            if (variable.showValue) {
                                // Bei aktiven Buttons: aktueller Wert, bei inaktiven: Association-Name als Value
                                const displayValue = isActive ? variable.formattedValue : association.name;
                                buttonContentParts.push(`<span style="font-weight: normal;">${esc(displayValue)}</span>`);
                            }
                            
                            // Falls keine Checkbox aktiviert ist, zeige Association-Name als Fallback
                            if (!variable.showIcon && !variable.showLabel && !variable.showValue) {
                                buttonContentParts.push(`<span style="font-weight: 400;">${esc(association.name || 'Wert ' + association.value)}</span>`);
                            }
                            
                            const isMultiIconOnly = variable.showIcon && !variable.showLabel && !variable.showValue && hasIconInt;
                            const buttonText = buttonContentParts.join(' ');
                            
                            buttonsHtml += `
                                <div class="variable-multi-button ${positionClass} ${isActive ? 'active' : ''} ${isActive ? '' : 'inactive'} ${isMultiIconOnly ? 'icon-only' : ''}" role="button" tabindex="0"
                                        data-request-value="${esc(JSON.stringify(variable.variableType === 1 ? Number(association.value) : String(association.value)))}" 
                                        data-variable-id="${esc(variable.id)}"
                                        data-association-value="${esc(association.value)}"
                                        style="background-color: ${esc(buttonColor)} !important; color: ${getButtonTextColor(variable, isActive)} !important; ${isGroupStretched ? '' : `width: ${buttonWidth}px; min-width: ${buttonWidth}px;`}">
                                    ${buttonText}
                                </div>`;
                        });
                        
                        // Für ungruppierte Multi-Buttons: horizontale Ausrichtung des Containers entsprechend Einstellung
                        const multiButtonContainerJustify = (!isGrouped) ? `display: flex; justify-content: ${justifyMap}; width: 100%;` : '';
                        content += `
                            <div class="variable-button-container" style="${multiButtonContainerJustify}">
                                <div class="variable-multi-button-container" style="${multiButtonContainerJustify}">
                                    ${buttonsHtml}
                                </div>
                            </div>
                        `;
                        
                    } else {
                        // Fallback für Nicht-Bool/Integer/String-Variablen oder Variablen ohne Associations: Zeige als Text
                        let textParts = [];
                        
                        if (variable.showLabel && variable.label) {
                            // Doppelpunkt nur hinzufügen wenn auch Value angezeigt wird
                            const labelText = variable.showValue ? `${esc(variable.label)}:&nbsp;` : esc(variable.label);
                            textParts.push(`<span class="variable-label" style="color: ${getTextColor(variable)};">${labelText}</span>`);
                        }
                        
                        if (variable.showValue) {
                            textParts.push(`<span class="variable-value variable-text" style="flex: 0 0 auto;">${esc(variable.formattedValue)}</span>`);
                        }
                        
                        // Falls nichts konfiguriert ist, zeige Wert als Fallback
                        if (!variable.showLabel && !variable.showValue) {
                            textParts.push(`<span class="variable-value variable-text" style="flex: 0 0 auto;">${esc(variable.formattedValue)}</span>`);
                        }
                        
                        content += `<div class="variable-item">
                            ${textParts.join(' ')}
                        </div>`;
                    }
            return content;
        }
        
