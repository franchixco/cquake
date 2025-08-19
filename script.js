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
                
                // Hacer zoom en el marcador correspondiente
                zoomToEarthquake(id, [lng, lat]);
            });
        });
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
                    
                    // Crear y mostrar popup
                    new maplibregl.Popup({
                        offset: 25,
                        closeButton: true,
                        closeOnClick: true
                    })
                    .setLngLat(feature.geometry.coordinates)
                    .setHTML(`
                        <div class="popup-location">${properties.location}</div>
                        <div class="popup-magnitude">Magnitud ${properties.magnitude} ${properties.measure_unit}</div>
                        <div class="popup-details">
                            <div>Fecha: ${formatLocalDate(properties.date)}</div>
                            <div>Profundidad: ${properties.depth} km</div>
                            <div>Coordenadas: ${feature.geometry.coordinates[1].toFixed(3)}, ${feature.geometry.coordinates[0].toFixed(3)}</div>
                            ${properties.url ? `<div class="popup-link"><a href="${properties.url}" target="_blank" rel="noopener">Más información →</a></div>` : ''}
                        </div>
                    `)
                    .addTo(map);
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
    console.log('JQuake Chile - Migrado a MapLibre GL JS con Protomaps');
    console.log('Sistema de alertas sísmicas en tiempo real habilitado');
    console.log('Mapa inicializado correctamente');
});