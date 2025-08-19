# JQuake Chile - Visor de Sismos

Esta aplicación web es una réplica de JQuake adaptada para Chile, un visor de sismos que muestra información en tiempo real sobre actividad sísmica en el territorio chileno. La aplicación está estructurada con una arquitectura moderna que separa HTML, CSS y JavaScript.

## Estructura del Proyecto

El proyecto está organizado en los siguientes archivos:

- **jquake.html**: Contiene la estructura HTML básica de la aplicación.
- **styles.css**: Contiene todos los estilos CSS para dar formato a la interfaz de usuario.
- **script.js**: Contiene toda la lógica JavaScript para la funcionalidad de la aplicación.
- **data/comunas.json**: Contiene los datos geográficos de las comunas de Chile en formato TopoJSON para la visualización del mapa.

## Características

- Visualización de sismos en un mapa interactivo de Chile usando D3.js y TopoJSON.
- Marcadores de epicentros de sismos en el mapa con colores según su intensidad.
- Lista de sismos recientes con detalles como magnitud, ubicación y profundidad.
- Indicador de intensidad con código de colores basado en la magnitud del sismo.
- Reloj en tiempo real que muestra la fecha y hora actuales.
- Diseño responsivo que se adapta a diferentes tamaños de pantalla.

## Tecnologías Utilizadas

- **HTML5**: Para la estructura básica de la aplicación.
- **CSS3**: Para el diseño y estilo de la interfaz de usuario.
- **JavaScript**: Para la lógica de la aplicación y manipulación del DOM.
- **D3.js**: Para la visualización de datos geográficos y el mapa interactivo.
- **TopoJSON**: Para el manejo eficiente de datos geográficos.

## Cómo Usar

1. Abre el archivo `jquake.html` en un navegador web moderno.
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