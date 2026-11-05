        function renderVariables(variables) {


            const container = document.getElementById('variables-container');
            if (!container) return;
            

            
            // Zeilen unter ihrem Schlüssel merken (Ersetzen einzelner Zeilen, Nacharbeit)
            state.rows = new Map(variables.map((v) => [String(v.key), v]));
            

            
            // PHASE 1: Berechne maximale Gruppenname-Breite für Alignment
            let maxGroupNameWidth = 0;
            if (state.groupNames) {
                const tempDiv = document.createElement('div');
                tempDiv.style.position = 'absolute';
                tempDiv.style.visibility = 'hidden';
                tempDiv.style.whiteSpace = 'nowrap';
                tempDiv.style.fontWeight = 'bold';
                document.body.appendChild(tempDiv);
                
                // Gruppiere Variablen und finde alle sichtbaren Gruppennamen
                const groupedVariables = variables.reduce((acc, variable) => {
                    if (variable.group && variable.group !== 'keine Gruppe') {
                        if (!acc[variable.group]) acc[variable.group] = [];
                        acc[variable.group].push(variable);
                    }
                    return acc;
                }, {});
                
                // Berechne Breite für jeden sichtbaren Gruppennamen
                Object.keys(groupedVariables).forEach(groupKey => {
                    const groupVariables = groupedVariables[groupKey];
                    
                    // Prüfe ShowGroupName und ShowAbove aus Gruppenkonfiguration
                    let shouldShowGroupName = false;
                    let showAbove = false;
                    const groupMatch = groupKey.match(/Gruppe (\d+)/);
                    if (groupMatch && state.groupNames) {
                        const groupNumber = parseInt(groupMatch[1]);
                        const groupConfig = state.groupNames[groupNumber];
                        shouldShowGroupName = groupConfig && groupConfig.showGroupName === true;
                        showAbove = groupConfig && groupConfig.showAbove === true;
                    }
                    
                    // Nur Gruppennamen berechnen, die LINKS angezeigt werden (nicht showAbove)
                    // Gruppennamen mit showAbove=true brauchen keinen horizontalen Platz
                    if (shouldShowGroupName && !showAbove) {
                        // Bestimme Anzeigenamen
                        let displayGroupName = groupKey;
                        const groupMatch = groupKey.match(/Gruppe (\d+)/);
                        if (groupMatch && state.groupNames) {
                            const groupNumber = parseInt(groupMatch[1]);
                            const groupConfig = state.groupNames[groupNumber];
                            displayGroupName = (groupConfig && groupConfig.name) ? groupConfig.name : groupKey;

                        } else {
                        }
                        
                        // Verwende die gleiche Schriftgröße wie die erste Variable
                        // Nur Fallback wenn fontSize undefined/null ist, nicht bei 0
                        const firstVariableFontSize = groupVariables[0]?.fontSize !== undefined ? groupVariables[0].fontSize : 14;
                        // Nur font-size setzen wenn nicht -1
                        if (firstVariableFontSize !== -1) {
                            tempDiv.style.fontSize = firstVariableFontSize + 'px';
                        }
                        tempDiv.textContent = displayGroupName + ':';
                        
                        let width = tempDiv.offsetWidth;
                        
                        // Prüfe ob diese Gruppe ein Icon hat und füge Icon-Breite hinzu
                        const iconGroupMatch = groupKey.match(/Gruppe (\d+)/);
                        if (iconGroupMatch && state.groupNames) {
                            const groupNumber = parseInt(iconGroupMatch[1]);
                            const groupConfig = state.groupNames[groupNumber];
                            if (groupConfig?.groupIcon && groupConfig.groupIcon !== '') {
                                // Icon-Breite: 16px Icon + 8px margin-right = 24px
                                width += 24;
                            }
                        }
                        
                        maxGroupNameWidth = Math.max(maxGroupNameWidth, width);
                        
                    }
                });
                
                document.body.removeChild(tempDiv);

            }
            
            // Track welche Gruppen bereits gerendert wurden
            const renderedGroups = new Set();
            let content = '';
            
            // Gehe durch Variablen in ORIGINALER REIHENFOLGE
            variables.forEach((variable, index) => {
                // Prüfe ob Variable gruppiert ist - alle Darstellungstypen unterstützen jetzt Gruppen
                if (variable.group && variable.group !== 'keine Gruppe' && variable.group.trim() !== '') {
                    // Nur rendern wenn Gruppe noch nicht gerendert wurde
                    if (!renderedGroups.has(variable.group)) {
                        renderedGroups.add(variable.group);
                        
                        // Sammle alle Variablen dieser Gruppe - alle Darstellungstypen unterstützt
                        const groupVariables = variables.filter(v => 
                            v.group === variable.group && v.group !== 'keine Gruppe' && v.group.trim() !== ''
                        );
                        
                        
                        
                        // Prüfe ShowGroupName aus Gruppenkonfiguration statt aus Variablen
                        let shouldShowGroupName = false;
                        const groupMatch = variable.group.match(/Gruppe (\d+)/);
                        if (groupMatch && state.groupNames) {
                            const groupNumber = parseInt(groupMatch[1]);
                            const groupConfig = state.groupNames[groupNumber];
                            shouldShowGroupName = groupConfig && groupConfig.showGroupName === true;
                        }
                        
                        // Bestimme den Gruppennamen basierend auf der Gruppenbezeichnung
                        // WICHTIG: Mapping erfolgt immer wenn state.groupNames verfügbar ist,
                        // shouldShowGroupName kontrolliert nur die Anzeige!
                        let displayGroupName = variable.group;
                        let showAbove = false;
                        let showLine = false;
                        let stretch = false;
                        if (state.groupNames) {
                            // Extrahiere Gruppennummer aus "Gruppe X" Format
                            const groupMatch = variable.group.match(/Gruppe (\d+)/);
                            if (groupMatch) {
                                const groupNumber = parseInt(groupMatch[1]);
                                const groupConfig = state.groupNames[groupNumber];
                                displayGroupName = (groupConfig && groupConfig.name) ? groupConfig.name : variable.group;
                                showAbove = groupConfig.showAbove || false;
                                showLine = groupConfig.showLine || false;
                                stretch = groupConfig.stretch || false;
                            }

                        } else {
                        }
                        
                        // Bestimme CSS-Klassen für die Gruppe
                        let groupCssClasses = 'variable-group';
                        
                        // Prüfe ob die Gruppe Button-Variablen enthält (Bool, Integer, String) und stretch aktiviert ist
                        const hasButtons = groupVariables.some(v => {
                            return v.displayType === 'button' && (v.variableType === 0 || v.variableType === 1 || v.variableType === 3);
                        });
                        
                        if (stretch && hasButtons) {
                            groupCssClasses += ' stretch-buttons';
                        }
                        
                        // Alternative Darstellung: Gruppenname über der Gruppe
                        if (shouldShowGroupName && showAbove) {
                            // Verwende konfigurierte Schriftgröße aus groupnamesize oder Fallback
                            const groupConfig = state.groupNames?.[parseInt(variable.group.match(/Gruppe (\d+)/)?.[1])];
                            // Nur Fallback wenn fontSize undefined/null ist, nicht bei 0
                            const groupNameFontSize = groupConfig?.fontSize !== undefined ? groupConfig.fontSize : 16;
                            
                            // Nur font-size setzen wenn nicht -1
                            const fontSizeStyle = groupNameFontSize !== -1 ? `font-size: ${groupNameFontSize}px;` : '';
                            
                            // Group Icon vorbereiten
                            let groupIconHtml = '';
                            if (groupConfig?.groupIcon && groupConfig.groupIcon !== '') {
                                const iconClass = prepareIconForDisplay(groupConfig.groupIcon);
                                if (iconClass) {
                                    groupIconHtml = `<i class="${esc(iconClass)}" style="margin-right: 8px; color: var(--accent-color);"></i>`;
                                }
                            }
                            
                            content += `
                                <div class="group-name-above" style="font-weight: bold; color: var(--content-color); ${fontSizeStyle} margin-bottom: 0px; margin-top: 10px; text-align: left; opacity: 0.5; display: flex; align-items: center;">
                                    ${groupIconHtml}${esc(displayGroupName)}:
                                </div>
                            `;
                            
                        }
                        
                        // Container für die Gruppe - flexDirection je nach showAbove
                        const containerStyle = showAbove && shouldShowGroupName 
                            ? "margin-bottom: var(--element-spacing, 8px); margin-top: var(--element-spacing, 8px); display: flex; flex-direction: column; align-items: stretch;"
                            : "margin-bottom: var(--element-spacing, 8px); margin-top: var(--element-spacing, 8px); display: flex; align-items: flex-start; gap: 16px;";
                        
                        content += `
                            <div class="${groupCssClasses}" style="${containerStyle}">
                        `;
                        
                        // Füge Gruppennamen links hinzu wenn gewünscht (nur wenn NICHT showAbove)
                        if (shouldShowGroupName && !showAbove) {
                            // Verwende die gleiche Schriftgröße wie die erste Variable der Gruppe
                            // Nur Fallback wenn fontSize undefined/null ist, nicht bei 0
                            const firstVariableFontSize = groupVariables[0]?.fontSize !== undefined ? groupVariables[0].fontSize : 14;
                            
                            // Nur font-size setzen wenn nicht -1
                            const labelFontSizeStyle = firstVariableFontSize !== -1 ? `font-size: ${firstVariableFontSize}px;` : '';
                            
                            // Verwende feste Breite für einheitliches Alignment aller Gruppen
                            const groupNameWidth = maxGroupNameWidth > 0 ? maxGroupNameWidth + 'px' : 'auto';
                            
                            // Group Icon vorbereiten
                            const groupConfig = state.groupNames?.[parseInt(variable.group.match(/Gruppe (\d+)/)?.[1])];
                            let groupIconHtml = '';
                            if (groupConfig?.groupIcon && groupConfig.groupIcon !== '') {
                                const iconClass = prepareIconForDisplay(groupConfig.groupIcon);
                                if (iconClass) {
                                    groupIconHtml = `<i class="${esc(iconClass)}" style="margin-right: 8px; color: var(--accent-color);"></i>`;
                                }
                            }
                            
                            content += `
                                <div class="group-name-label" style="font-weight: bold; color: var(--content-color); ${labelFontSizeStyle} white-space: nowrap; align-self: center; margin-right: 8px; width: ${groupNameWidth}; display: flex; align-items: center; text-align: left;">
                                    ${groupIconHtml}${esc(displayGroupName)}:
                                </div>
                            `;
                            
                        }
                        
                        // Bestimme gruppenweite Ausrichtung: nutze die erste Text/Button-Variable der Gruppe
                        let groupAlign = 'left';
                        // Verwende Text/Button/ODER Image als Quelle für die Gruppenausrichtung
                        const alignSource = groupVariables.find(v => v.displayType === 'text' || v.displayType === 'button' || v.displayType === 'image');
                        if (alignSource && alignSource.alignment) {
                            groupAlign = alignSource.alignment;
                        }
                        const groupJustify = groupAlign === 'center' ? 'center' : (groupAlign === 'right' ? 'flex-end' : 'flex-start');

                        content += `
                                <div class="variable-group-items" style="display: flex; flex-wrap: wrap; column-gap: 16px; row-gap: calc(var(--element-spacing, 8px)); align-items: center; flex: 1; justify-content: ${groupJustify}; width: 100%;">
                        `;

                        // Gleichmäßiges Wachstum für ALLE Progress/Slider in der Gruppe
                        groupVariables.forEach((groupVar) => {
                            const widthPercent = (groupVar.displayType === 'image' && Number.isFinite(Number(groupVar.imageWidth)))
                                ? Number(groupVar.imageWidth)
                                : null;
                            const isProgressLike = (groupVar.displayType === 'progress' || groupVar.displayType === 'slider');
                            // Regler starten mit ihrer Inhaltsbreite (auto): passt die nicht mehr in die Zeile, bricht er um, statt über
                            // die Nachbarn zu laufen; allein in einer Zeile darf er bis auf die Kachelbreite schrumpfen
                            const growStyle = isProgressLike ? ('flex: 1 1 ' + (groupVar.displayType === 'slider' ? 'auto' : '0') + '; min-width: 0;') : '';
                            const widthStyle = (widthPercent !== null)
                                ? ('flex: 0 0 ' + widthPercent + '%; max-width: ' + widthPercent + '%; min-width: ' + widthPercent + '%; box-sizing: border-box;')
                                : '';
                            const itemStyle = (widthPercent !== null || growStyle)
                                ? (' style="' + widthStyle + growStyle + '"')
                                : '';
                            content += `<div class="variable-group-item"${itemStyle}>`;
                            content += renderSingleVariable(groupVar, true); // true = isGrouped
                            content += `</div>`;
                        });
                        
                        content += `
                                </div>
                            </div>
                        `;
                        
                        // Füge Linie unter der Gruppe hinzu wenn showLine aktiviert ist
                        if (showLine) {
                            content += `
                                <div class="group-line"></div>
                            `;
                        }
                    }
                    // Andernfalls überspringen (Gruppe bereits gerendert)
                } else {
                    // Ungrouped variable - sofort rendern
                    content += renderSingleVariable(variable);
                }
            });
            
            
            // Rufe updateImageVisibility() nach dem initialen Rendering auf
            // um sicherzustellen, dass die Bildanzeige korrekt gesetzt wird
            updateImageVisibility();
            
            container.innerHTML = content;
            afterRowsInserted(container);

            // Keine Nachbearbeitung erforderlich – Bilder verwenden direkt WebHook-URLs
        }
        
