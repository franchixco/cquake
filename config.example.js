
/**
 * Configuración para JQuake Chile - Variables de entorno
 * Este archivo contiene configuraciones sensibles que deben ser manejadas
 * como variables de entorno en producción (Cloudflare Workers)
 */

// En desarrollo, usar valores por defecto
// En producción (Cloudflare Workers), estos valores vendrán de las variables de entorno
const CONFIG = {
    // API de datos sísmicos
    EARTHQUAKE_API_URL: typeof EARTHQUAKE_API_URL !== 'undefined' 
        ? EARTHQUAKE_API_URL 
        : 'YOUR_EARTHQUAKE_API_URL',
    
    // WebSocket para alertas en tiempo real
    WEBSOCKET_URI: typeof WEBSOCKET_URI !== 'undefined' 
        ? WEBSOCKET_URI 
        : 'YOUR_WEBSOCKET_URI',
    
    // API Key de Protomaps
    PROTOMAPS_API_KEY: typeof PROTOMAPS_API_KEY !== 'undefined' 
        ? PROTOMAPS_API_KEY 
        : 'YOUR_PROTOMAPS_API_KEY',
    
    // URL base del estilo de mapa
    MAP_STYLE_BASE_URL: 'https://api.protomaps.com/styles/v5/black/es.json',
    
    // Configuraciones del mapa
    MAP_CENTER: [-70.6693, -33.4489], // Santiago, Chile
    MAP_ZOOM: 5,
    MAP_MIN_ZOOM: 4,
    MAP_MAX_ZOOM: 12,
    
    // Configuraciones de la aplicación
    DATA_UPDATE_INTERVAL: 300000, // 5 minutos
    NOTIFICATION_AUTO_HIDE_DELAY: 10000, // 10 segundos
    MAX_NOTIFICATIONS: 3,
    WEBSOCKET_RECONNECT_DELAY: 5000 // 5 segundos
};

// Construir URL completa del estilo de mapa
CONFIG.MAP_STYLE_URL = `${CONFIG.MAP_STYLE_BASE_URL}?key=${CONFIG.PROTOMAPS_API_KEY}`;

// Exportar configuración (compatible con módulos y scripts tradicionales)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    window.CONFIG = CONFIG;
}