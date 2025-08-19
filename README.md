# CQuake Chile - Visor de Sismos

Esta aplicación web es una versión chilena de JQuake, un visor de sismos que muestra información en tiempo real sobre actividad sísmica en el territorio chileno. La aplicación está estructurada con una arquitectura moderna que separa HTML, CSS y JavaScript.

## Estructura del Proyecto

El proyecto está organizado en los siguientes archivos:

- **index.html**: Contiene la estructura HTML básica de la aplicación.
- **styles.css**: Contiene todos los estilos CSS para dar formato a la interfaz de usuario.
- **script.js**: Contiene toda la lógica JavaScript para la funcionalidad de la aplicación.
- **config.js**: Contiene la configuración de la aplicación, como endpoints de API y claves.

## Características

- Visualización de sismos en un mapa interactivo de Chile usando MapLibre GL JS y Protomaps.
- Marcadores de epicentros de sismos en el mapa con colores y tamaños según su intensidad.
- Lista de sismos recientes con detalles como magnitud, ubicación y profundidad.
- Notificaciones en tiempo real de nuevos sismos mediante WebSockets.
- Actualización automática de datos cada 5 minutos.
- Diseño responsivo que se adapta a diferentes tamaños de pantalla.

## Tecnologías Utilizadas

- **HTML5**: Para la estructura básica de la aplicación.
- **CSS3**: Para el diseño y estilo de la interfaz de usuario.
- **JavaScript (ES6+)**: Para la lógica de la aplicación y manipulación del DOM.
- **MapLibre GL JS**: Para la visualización de mapas interactivos.
- **Protomaps (PMTiles)**: Para el servicio de mapas base.
- **WebSocket**: Para la comunicación en tiempo real y notificaciones de sismos.

## Cómo Usar

1. Abre el archivo `index.html` en un navegador web moderno.
2. El mapa mostrará la región geográfica con las prefecturas y ciudades principales.
3. La lista en el panel derecho mostrará los sismos recientes, con el más reciente destacado en la parte superior.
4. El reloj en la esquina inferior derecha muestra la fecha y hora actuales.

## Personalización

Puedes personalizar varios aspectos de la aplicación:

- **Colores y Tema**: Modifica las variables CSS en el archivo `styles.css`.
- **Datos de Sismos**: Actualiza el objeto `apiData` en `script.js` para mostrar datos reales o diferentes.
- **Región del Mapa**: Modifica las coordenadas del centro y la escala en la función `renderMap()` en `script.js`.

## Desarrollo Futuro

Algunas mejoras que podrían implementarse:

- Conexión a una API real de datos sísmicos.
- Animaciones para nuevos sismos.
- Filtros para la lista de sismos por magnitud, fecha o región.
- Modo oscuro/claro para la interfaz de usuario.
- Soporte para múltiples idiomas.