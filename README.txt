CINERANDOM — PRIMERA VERSIÓN

QUÉ INCLUYE
- Web adaptable a celular y computadora.
- PWA instalable (Agregar a pantalla de inicio).
- Selección aleatoria de películas y filtros por género, década y puntuación mínima.
- Sinopsis, póster, tráiler de YouTube y proveedores de streaming por país.
- Lista de favoritos y películas descartadas guardadas en el navegador.

PARA ACTIVAR LOS DATOS
1. Creá una cuenta gratuita en https://www.themoviedb.org/
2. Solicitá una API key desde https://www.themoviedb.org/settings/api
3. Copiá el API Read Access Token (Bearer).
4. Abrí CineRandom y tocá el engranaje. Pegá el token y guardá.
5. Opcional: solicitá una clave en https://www.omdbapi.com/apikey.aspx y pegala para consultar la puntuación IMDb.

IMPORTANTE SOBRE LAS FUENTES
- TMDB aporta fichas, imágenes, sinopsis, videos y disponibilidad de streaming (proveedores).
- La puntuación mostrada será IMDb si se configura OMDb y la película tiene IMDb ID. Sin OMDb, se muestra la puntuación de TMDB y se identifica como votos TMDB; no se presenta falsamente como IMDb.
- La disponibilidad depende de los datos publicados por TMDB/JustWatch y puede cambiar. Los enlaces llevan al destino de información del proveedor; no garantizan reproducción ni suscripción.
- Las claves se almacenan en localStorage del navegador. Esta versión es para uso personal/prueba. Para publicar para muchas personas, conviene implementar un backend que proteja las claves.
- Requiere conexión a internet para consultar películas y reproducir tráilers.

CÓMO PROBAR
La PWA y el service worker requieren servir el directorio por HTTP/HTTPS (no abrir index.html como archivo local). Por ejemplo:
  python -m http.server 8000
Luego abrí http://localhost:8000
Para instalar en Android, publicá en un hosting HTTPS y elegí "Agregar a pantalla de inicio" desde el navegador.

TECNOLOGÍA
HTML, CSS y JavaScript sin framework. TMDB API v3, OMDb opcional, YouTube embed.
CineRandom no está afiliada a IMDb, TMDB, JustWatch ni a servicios de streaming.
