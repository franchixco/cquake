document.addEventListener('DOMContentLoaded', () => {
    // --- INICIALIZACIÓN DE MAPLIBRE CON PROTOMAPS ---
    let protocol = new pmtiles.Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);

    // Crear la instancia del mapa con MapLibre GL
    const map = new maplibregl.Map({
        container: 'map-container',
        style: CONFIG.MAP_STYLE_URL,
        center: CONFIG.MAP_CENTER,
        zoom: CONFIG.MAP_ZOOM,
        minZoom: CONFIG.MAP_MIN_ZOOM,
        maxZoom: CONFIG.MAP_MAX_ZOOM
    });

    // Añadir controles de navegación
    map.addControl(new maplibregl.NavigationControl());

    // --- VARIABLES GLOBALES ---
    let apiData = null;
    let selectedEarthquakeId = null;
    
    // Variables para sistema de notificaciones
    let websocket = null;
    const notificationsContainer = document.getElementById('notifications-container');
    let currentPopup = null;

    // --- CARGA DE DATOS DESDE LA API ---
    async function fetchEarthquakeData() {
        try {
            const response = await fetch(CONFIG.EARTHQUAKE_API_URL);
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            apiData = await response.json();
            
            // Una vez que tenemos los datos, actualizamos la interfaz
            updateEarthquakeList();
            updateEarthquakeLayer();
        } catch (error) {
            console.error('Error al cargar datos de sismos:', error);
            document.querySelector('.earthquake-list').innerHTML = 
                '<div class="error-message">Error al cargar datos de sismos. Intente nuevamente más tarde.</div>';
        }
    }

    // Cargar datos al iniciar
    fetchEarthquakeData();
    
    // Actualizar datos cada intervalo configurado
    setInterval(fetchEarthquakeData, CONFIG.DATA_UPDATE_INTERVAL);

    // --- LÓGICA PARA POBLAR LA LISTA DE SISMOS ---
    const listContainer = document.querySelector('.earthquake-list');

    /**
     * Determina la intensidad basada en la magnitud del sismo
     * @param {number} magnitude - Magnitud del sismo
     * @returns {Object} - Objeto con número y clase CSS de intensidad
     */
    function getIntensityFromMagnitude(magnitude) {
        const mag = parseFloat(magnitude);
        
        // El número mostrado corresponde a la magnitud redondeada
        const displayNumber = Math.trunc(mag);
        
        // Determinar la clase CSS basada en los rangos de magnitud
        if (mag >= 9.0) return { number: displayNumber, className: 'intensity-7', color: '#8e24aa' };
        if (mag >= 8.0) return { number: displayNumber, className: 'intensity-6', color: '#e53935' };
        if (mag >= 7.0) return { number: displayNumber, className: 'intensity-5', color: '#ff7043' };
        if (mag >= 6.0) return { number: displayNumber, className: 'intensity-4', color: '#fbc02d' };
        if (mag >= 5.0) return { number: displayNumber, className: 'intensity-3', color: '#26a69a' };
        if (mag >= 4.0) return { number: displayNumber, className: 'intensity-2', color: '#2a73cc' };
        return { number: displayNumber, className: 'intensity-1', color: '#5a5a5a' };
    }

    /**
     * Formatea la fecha y hora para mostrar en la interfaz
     * @param {string} dateStr - Fecha en formato "YYYY-MM-DD HH:MM:SS"
     * @returns {string} - Fecha formateada como "DD-MM-YYYY HH:MM"
     */
    function formatLocalDate(dateStr) {
        const [date, time] = dateStr.split(' ');
        const [year, month, day] = date.split('-');
        const formattedTime = time.substring(0, 5);
        return `${day}-${month}-${year} ${formattedTime}`;
    }

    function showEarthquakePopup(event) {
        if (currentPopup) {
            currentPopup.remove();
        }
        currentPopup = new maplibregl.Popup({
            offset: 25,
            closeButton: true,
            closeOnClick: true
        })
        .setLngLat([event.longitude, event.latitude])
        .setHTML(`
            <div class="popup-location">${event.geo_reference}</div>
            <div class="popup-magnitude">Magnitud ${event.magnitude.value} ${event.magnitude.measure_unit}</div>
            <div class="popup-details">
                <div>Fecha: ${formatLocalDate(event.local_date)}</div>
                <div>Profundidad: ${event.depth} km</div>
                <div>Coordenadas: ${event.latitude.toFixed(3)}, ${event.longitude.toFixed(3)}</div>
                ${event.url ? `<div class="popup-link"><a href="${event.url}" target="_blank" rel="noopener">Más información →</a></div>` : ''}
            </div>
        `)
        .addTo(map);

        currentPopup.on('close', () => {
            currentPopup = null;
        });
    }

    /**
     * Actualiza la lista de sismos en la interfaz
     */
    function updateEarthquakeList() {
        if (!apiData || !apiData.events || !apiData.events.length) {
            listContainer.innerHTML = '<div class="no-data">No hay datos de sismos disponibles</div>';
            return;
        }
        
        listContainer.innerHTML = '';
        
        // Generar elementos HTML para cada sismo
        apiData.events.forEach((event, index) => {
            const isFeatured = index === 0;
            const intensity = getIntensityFromMagnitude(event.magnitude.value);
            const formattedTime = formatLocalDate(event.local_date);
            
            const itemHTML = `
                <div class="earthquake-item ${isFeatured ? 'featured' : ''}" data-id="${event.id}" data-lat="${event.latitude}" data-lng="${event.longitude}">
                    <div class="item-intensity ${intensity.className}">${intensity.number}</div>
                    <div class="item-details">
                        <div class="item-region">${event.geo_reference}</div>
                        <div class="item-time">${formattedTime}</div>
                        <div class="item-depth">Profundidad: ${event.depth} km</div>
                        <div class="item-magnitude">${event.magnitude.measure_unit} ${event.magnitude.value}</div>
                    </div>
                </div>
            `;
            listContainer.innerHTML += itemHTML;
        });
        
        // Añadir eventos de clic a los elementos de la lista
        document.querySelectorAll('.earthquake-item').forEach(item => {
            item.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                const lat = parseFloat(this.getAttribute('data-lat'));
                const lng = parseFloat(this.getAttribute('data-lng'));
                const event = apiData.events.find(e => e.id === id);

                zoomToEarthquake(id, [lng, lat]);
                if (event) showEarthquakePopup(event);

                if (mobileMedia && mobileMedia.matches && listPanel) {
                    listPanel.classList.remove('sheet-expanded');
                    setTimeout(() => map.resize(), 360);
                }
            });
        });

        // Actualizar el badge contador del bottom sheet (mobile)
        const countEl = document.getElementById('earthquake-count');
        if (countEl) countEl.textContent = apiData.events.length;
    }

    /**
     * Actualiza la capa de sismos en el mapa usando sources y layers
     */
    function updateEarthquakeLayer() {
        if (!apiData || !apiData.events || !map.loaded()) return;

        // Preparar datos en formato GeoJSON
        const geojsonData = {
            type: 'FeatureCollection',
            features: apiData.events.map(event => {
                const intensity = getIntensityFromMagnitude(event.magnitude.value);
                return {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [event.longitude, event.latitude]
                    },
                    properties: {
                        id: event.id,
                        magnitude: event.magnitude.value,
                        measure_unit: event.magnitude.measure_unit,
                        depth: event.depth,
                        location: event.geo_reference,
                        date: event.local_date,
                        url: event.url,
                        intensity: intensity.className,
                        color: intensity.color,
                        size: Math.max(8, Math.min(30, 8 + (event.magnitude.value * 3)))
                    }
                };
            })
        };

        // Actualizar o crear source
        if (map.getSource('earthquakes')) {
            map.getSource('earthquakes').setData(geojsonData);
        } else {
            map.addSource('earthquakes', {
                type: 'geojson',
                data: geojsonData
            });

            // Agregar capa de círculos para sismos
            map.addLayer({
                id: 'earthquake-circles',
                type: 'circle',
                source: 'earthquakes',
                paint: {
                    'circle-radius': ['get', 'size'],
                    'circle-color': ['get', 'color'],
                    'circle-stroke-width': 2,
                    'circle-stroke-color': 'rgba(255, 255, 255, 0.3)',
                    'circle-opacity': 0.8
                }
            });

            // Capa adicional para selección
            map.addLayer({
                id: 'earthquake-selected',
                type: 'circle',
                source: 'earthquakes',
                filter: ['==', ['get', 'id'], ''],
                paint: {
                    'circle-radius': ['*', ['get', 'size'], 1.3],
                    'circle-color': ['get', 'color'],
                    'circle-stroke-width': 3,
                    'circle-stroke-color': '#ffffff',
                    'circle-opacity': 1
                }
            });

            // Eventos de click en marcadores
            map.on('click', 'earthquake-circles', (e) => {
                if (e.features.length > 0) {
                    const feature = e.features[0];
                    const properties = feature.properties;
                    
                    zoomToEarthquake(properties.id, feature.geometry.coordinates);

                    const event = apiData.events.find(e => e.id === properties.id);
                    if (event) showEarthquakePopup(event);
                }
            });

            // Cambiar cursor en hover
            map.on('mouseenter', 'earthquake-circles', () => {
                map.getCanvas().style.cursor = 'pointer';
            });

            map.on('mouseleave', 'earthquake-circles', () => {
                map.getCanvas().style.cursor = '';
            });
        }
    }

    /**
     * Hace zoom en un marcador de sismo específico
     * @param {string} id - ID del sismo
     * @param {Array} coordinates - Coordenadas [longitud, latitud] del sismo
     */
    function zoomToEarthquake(id, coordinates) {
        // Actualizar ID seleccionado
        selectedEarthquakeId = id;

        // Hacer zoom en el mapa
        map.flyTo({
            center: coordinates,
            zoom: 9,
            duration: 1000
        });

        // Actualizar filtro para mostrar marcador seleccionado
        if (map.getLayer('earthquake-selected')) {
            map.setFilter('earthquake-selected', ['==', ['get', 'id'], id]);
        }

        // Resaltar el elemento en la lista
        document.querySelectorAll('.earthquake-item').forEach(item => {
            if (item.getAttribute('data-id') === id) {
                item.classList.add('selected');
                // Hacer scroll hasta el elemento seleccionado
                item.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                item.classList.remove('selected');
            }
        });
    }


    // --- EVENTOS DEL MAPA ---
    // (Movido al final del script para evitar duplicación)

    // Añadir botón para actualizar datos manualmente
    document.getElementById('refresh-button')?.addEventListener('click', fetchEarthquakeData);

    // Limpiar selecciones al hacer click en el mapa (pero no en marcadores)
    map.on('click', (e) => {
        // Solo limpiar si no se hizo click en un marcador
        if (!e.defaultPrevented) {
            selectedEarthquakeId = null;
            
            // Limpiar filtro de selección
            if (map.getLayer('earthquake-selected')) {
                map.setFilter('earthquake-selected', ['==', ['get', 'id'], '']);
            }

            // Limpiar selección de lista
            document.querySelectorAll('.earthquake-item').forEach(item => {
                item.classList.remove('selected');
            });
        }
    });

    // --- SISTEMA DE NOTIFICACIONES EN TIEMPO REAL ---
    
    /**
     * Determina la percepción de un sismo basado en su magnitud y profundidad
     * Basado en las reglas de percibidos.js
     */
    function determinarPercepcionSismo(magnitud, profundidad) {
        // MOVIMIENTO MUY FUERTE (Potencialmente destructivo) - DANGER
        if (magnitud >= 6.8 && profundidad <= 70) {
            return { tipo: 'danger', mensaje: 'Fuerte sismo detectado en' };
        }
        if (magnitud >= 5.5 && profundidad <= 30) {
            return { tipo: 'danger', mensaje: 'Fuerte sismo detectado en' };
        }

        // SACUDIDA DE CONSIDERACIÓN (Puede causar daños) - WARNING
        if (magnitud >= 6.0 && profundidad <= 120) {
            return { tipo: 'warning', mensaje: 'Sismo moderado detectado en' };
        }
        if (magnitud >= 5.0 && profundidad <= 60) {
            return { tipo: 'warning', mensaje: 'Sismo moderado detectado en' };
        }

        // LEVE MOVIMIENTO (Claramente perceptible) - INFO
        if (magnitud >= 6.0) {
            return { tipo: 'info', mensaje: 'Leve sismo detectado en' };
        }
        if (magnitud >= 4.0 && profundidad <= 100) {
            return { tipo: 'info', mensaje: 'Leve sismo detectado en' };
        }

        // NO SE PERCIBE - no mostrar notificación
        return null;
    }

    /**
     * Crea y muestra una notificación en tiempo real
     */
    function mostrarNotificacion(tipo, mensaje, magnitud, profundidad, region, hora, measureUnit = 'Mw') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${tipo}`;
        
        // Formatear hora (asumir UTC)
        const fechaHora = new Date(hora).toLocaleString('es-CL', {
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        notification.innerHTML = `
            <div class="notification-header">
                ${mensaje}
            </div>
            <div class="notification-body">
                ${region}
                <div class="notification-details">
                    Magnitud: ${magnitud} ${measureUnit} • Profundidad: ${profundidad} km<br>
                    ${fechaHora}
                </div>
            </div>
        `;

        // Agregar al contenedor
        notificationsContainer.appendChild(notification);

        // Auto-ocultar después del tiempo configurado
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.add('fade-out');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 500); // Tiempo de la animación fade-out
            }
        }, CONFIG.NOTIFICATION_AUTO_HIDE_DELAY);

        // Limitar al máximo de notificaciones configurado
        while (notificationsContainer.children.length > CONFIG.MAX_NOTIFICATIONS) {
            const oldest = notificationsContainer.firstChild;
            oldest.classList.add('fade-out');
            setTimeout(() => {
                if (oldest.parentNode) {
                    oldest.parentNode.removeChild(oldest);
                }
            }, 500);
        }
    }

    /**
     * Procesa datos del WebSocket de sismos en tiempo real
     */
    function procesarDatosSismo(data) {
        try {
            if (data && data.data && data.data.properties) {
                const props = data.data.properties;
                const magnitud = parseFloat(props.mag);
                const profundidad = parseFloat(props.depth);
                const region = props.flynn_region;
                const hora = props.time;

                if (!isNaN(magnitud) && !isNaN(profundidad) && region && hora) {
                    const percepcion = determinarPercepcionSismo(magnitud, profundidad);
                    
                    if (percepcion) {
                        console.log(`🌍 Sismo detectado: ${magnitud} Mw, ${profundidad}km - ${region}`);
                        mostrarNotificacion(
                            percepcion.tipo,
                            percepcion.mensaje,
                            magnitud,
                            profundidad,
                            region,
                            hora,
                            'Mw' // WebSocket generalmente usa Mw
                        );
                    }
                }
            }
        } catch (error) {
            console.error('Error procesando datos de sismo:', error);
        }
    }

    /**
     * Conectar al WebSocket de sismos en tiempo real
     */
    function conectarWebSocket() {
        console.log('🔗 Conectando al sistema de alertas en tiempo real...');
        
        websocket = new WebSocket(CONFIG.WEBSOCKET_URI);

        websocket.onopen = function() {
            console.log('✅ Sistema de alertas conectado');
            // Mostrar notificación de prueba (opcional)
            // mostrarNotificacion('info', 'Sistema conectado', 'Sistema de alertas sísmicas activo', '', '', new Date().toISOString());
        };

        websocket.onmessage = function(event) {
            try {
                const mensaje = JSON.parse(event.data);
                procesarDatosSismo(mensaje);
            } catch (error) {
                console.error('Error al parsear mensaje WebSocket:', error);
            }
        };

        websocket.onclose = function() {
            console.log('⚠️ Conexión de alertas perdida. Reintentando...');
            setTimeout(conectarWebSocket, CONFIG.WEBSOCKET_RECONNECT_DELAY);
        };

        websocket.onerror = function(error) {
            console.error('❌ Error en sistema de alertas:', error);
            if (websocket) {
                websocket.close();
            }
        };
    }

    // Iniciar sistema de notificaciones cuando el mapa esté listo
    map.on('load', () => {
        // Cuando el mapa esté cargado, crear la capa si ya tenemos datos
        if (apiData) {
            updateEarthquakeLayer();
        }
        
        // Iniciar sistema de alertas en tiempo real
        conectarWebSocket();
    });

    // --- DEBUG INFO ---
    console.log('CQuake Chile - Migrado a MapLibre GL JS con Protomaps');
    console.log('Sistema de alertas sísmicas en tiempo real habilitado');
    console.log('Mapa inicializado correctamente');

    // ============================================================
    // BOTTOM SHEET MOBILE — Toggle, resize del mapa y contador
    // Sólo activa comportamiento en mobile vía matchMedia.
    // No afecta desktop. Clases CSS controlan la transición visual.
    // ============================================================
    const listPanel = document.querySelector('.list-panel');
    const listHeader = document.querySelector('.list-header');
    const earthquakeCountEl = document.getElementById('earthquake-count');
    const mobileMedia = window.matchMedia('(max-width: 768px)');

    // Alterna el estado colapsado/expandido del bottom sheet
    function toggleBottomSheet() {
        if (!listPanel) return;
        listPanel.classList.toggle('sheet-expanded');
        // MapLibre necesita saber que su contenedor cambió de tamaño
        if (typeof map !== 'undefined') {
            setTimeout(() => map.resize(), 360);
        }
    }

    let sheetSwipeHandled = false;
    let sheetStartY = 0;
    let sheetStartX = 0;
    let sheetIsDragging = false;
    let sheetIsRealDrag = false;
    let sheetStartOffset = 0;
    const SHEET_SWIPE_THRESHOLD = 60;
    const SHEET_TAP_THRESHOLD = 10;

    function getSheetCollapsedOffset() {
        const handle = listPanel.querySelector('.list-handle');
        const visibleHeight = listHeader.offsetHeight + (handle ? handle.offsetHeight : 0);
        return Math.max(0, listPanel.offsetHeight - visibleHeight);
    }

    if (listHeader) {
        listHeader.addEventListener('click', (e) => {
            if (e.target.closest('.refresh-button')) return;
            if (!mobileMedia.matches) return;
            if (sheetSwipeHandled) {
                sheetSwipeHandled = false;
                return;
            }
            toggleBottomSheet();
        });

        listHeader.addEventListener('touchstart', (e) => {
            if (!mobileMedia.matches) return;
            if (e.target.closest('.refresh-button')) return;
            const touch = e.touches[0];
            sheetStartY = touch.clientY;
            sheetStartX = touch.clientX;
            sheetIsDragging = true;
            sheetIsRealDrag = false;
            sheetSwipeHandled = false;
            sheetStartOffset = listPanel.classList.contains('sheet-expanded') ? 0 : getSheetCollapsedOffset();
            listPanel.classList.add('sheet-dragging');
        }, { passive: true });

        listHeader.addEventListener('touchmove', (e) => {
            if (!sheetIsDragging || !mobileMedia.matches) return;
            const touch = e.touches[0];
            const deltaY = touch.clientY - sheetStartY;
            const deltaX = touch.clientX - sheetStartX;

            if (!sheetIsRealDrag) {
                if (Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
                    sheetIsDragging = false;
                    listPanel.classList.remove('sheet-dragging');
                    return;
                }
                if (Math.abs(deltaY) < SHEET_TAP_THRESHOLD && Math.abs(deltaX) < SHEET_TAP_THRESHOLD) {
                    return;
                }
                sheetIsRealDrag = true;
            }

            e.preventDefault();
            const maxOffset = getSheetCollapsedOffset();
            const newOffset = Math.max(0, Math.min(maxOffset, sheetStartOffset + deltaY));
            listPanel.style.transform = `translateY(${newOffset}px)`;
        }, { passive: false });

        listHeader.addEventListener('touchend', (e) => {
            if (!sheetIsDragging || !mobileMedia.matches) return;
            sheetIsDragging = false;
            listPanel.classList.remove('sheet-dragging');

            if (!sheetIsRealDrag) {
                listPanel.style.transform = '';
                return;
            }
            sheetIsRealDrag = false;
            sheetSwipeHandled = true;

            const touch = e.changedTouches[0];
            const deltaY = touch.clientY - sheetStartY;
            const maxOffset = getSheetCollapsedOffset();
            const currentOffset = Math.max(0, Math.min(maxOffset, sheetStartOffset + deltaY));

            listPanel.style.transform = '';

            if (deltaY < -SHEET_SWIPE_THRESHOLD || currentOffset < maxOffset * 0.4) {
                listPanel.classList.add('sheet-expanded');
            } else if (deltaY > SHEET_SWIPE_THRESHOLD || currentOffset >= maxOffset * 0.4) {
                listPanel.classList.remove('sheet-expanded');
            }
            setTimeout(() => map.resize(), 360);
        }, { passive: true });

        listHeader.addEventListener('touchcancel', () => {
            if (!sheetIsDragging) return;
            sheetIsDragging = false;
            sheetIsRealDrag = false;
            listPanel.classList.remove('sheet-dragging');
            listPanel.style.transform = '';
            if (sheetStartOffset === 0) {
                listPanel.classList.add('sheet-expanded');
            } else {
                listPanel.classList.remove('sheet-expanded');
            }
        }, { passive: true });
    }

    if (mobileMedia.media) {
        mobileMedia.addEventListener('change', () => {
            if (typeof map !== 'undefined') setTimeout(() => map.resize(), 100);
            if (!mobileMedia.matches && listPanel) {
                listPanel.classList.remove('sheet-expanded', 'sheet-dragging');
                listPanel.style.transform = '';
            }
        });
    }

    // ResizeObserver: el mapa escucha cambios reales de tamaño del contenedor
    if (window.ResizeObserver && document.getElementById('map-container')) {
        const ro = new ResizeObserver(() => {
            if (typeof map !== 'undefined') map.resize();
        });
        ro.observe(document.getElementById('map-container'));
    }
});