# Changelog

Todos los cambios notables de El Baúl que afectan a la experiencia de las
personas usuarias se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).
Antes de la primera versión etiquetada (`beta-v0.1.0`), los cambios se agrupan
por día de trabajo bajo `alpha-v0.0.0-AAAAMMDD`, ya que el producto aún no
tenía versiones formales.

Este archivo solo mantiene lo no publicado y las últimas versiones. El
histórico completo está en [`CHANGELOG-ARCHIVE.md`](./CHANGELOG-ARCHIVE.md).

## [No publicado]

### Añadido

- Al entrar en el feed de un baúl, si hay alguna foto sin personas etiquetadas se pide ayuda para identificar a quién sale antes de mostrar el feed — una única recomendación, opcional ("Ahora no"), que no vuelve a aparecer en ese baúl hasta pasados 60 minutos (pero sí puede aparecer al entrar en otro baúl distinto). La foto se queda fija arriba (con los mismos gestos de zoom del visor de la galería) y "Guardar" fijo abajo, así que solo la lista de personas se mueve al hacer scroll.

### Cambiado

- En tablet y escritorio, el visor de fotos ahora muestra la foto y los recuerdos en dos columnas en vez de apilados, aprovechando mejor el ancho de la pantalla.
- El chat con IA pasa a llamarse "Recordemos juntos" y ahora siempre intenta seguir la conversación con una pregunta: si la persona usuaria pregunta y hay respuesta, invita a ahondar en el recuerdo; si pregunta y no la hay, lo dice y pide esa información; si simplemente comparte algo sin preguntar, sigue la charla con una pregunta que ayude a recordar más detalles, sin decir que no lo sabe.

### Arreglado

- La foto en el visor ya no cambia de tamaño según las dimensiones de la imagen ni la cantidad de recuerdos cargados: ahora mide siempre lo mismo.
- Al abrir una foto, mientras se cargan sus recuerdos se muestra un pequeño indicador de carga en vez de dar a entender por un instante que no tiene ninguno.
- La foto sugerida para etiquetar al entrar en un baúl ahora se elige al azar entre las que faltan por etiquetar, en vez de ser siempre la misma (la más antigua).

## [beta-v0.2.0] - 2026-08-07

### Cambiado

- La app ya no abre en una lista de baúles: entra directamente en el último baúl usado. Para cambiar de baúl hay un selector en la parte superior de la pantalla, sin necesidad de navegar a otra pantalla.
- Las tarjetas de capítulo ahora muestran su foto de portada a pantalla completa con el título y las fechas superpuestos, en lugar de aparecer en una cuadrícula con la foto e información por separado.
- Dentro de un baúl, la pestaña de Recuerdos pasa a ser la primera (y la que se abre por defecto) y la de Capítulos la segunda.
- La ficha de una persona ahora tiene una pestaña de Recuerdos (la primera, y la que se abre por defecto) con los recuerdos de los que es autora, antes de Biografía y Fotos.
- Dentro de un capítulo, la pestaña de Recuerdos pasa a ser la primera (y la que se abre por defecto) y la de Fotos la segunda.

### Arreglado

- Al cerrar sesión y volver a entrar, la app ya recuerda el último baúl en el que se estaba y abre directamente en él, en lugar de volver al primero de la lista.
- En las pantallas con pestañas (baúl, capítulo, ficha de persona), cada pestaña conserva ahora su propio scroll: cambiar de pestaña ya no deja el contenido nuevo a mitad de camino, aparece arriba la primera vez y retoma la posición si ya se había visitado.
- Al entrar a un capítulo desde la pestaña de Recuerdos o de Capítulos del baúl y volver, ahora se reabre esa misma pestaña en lugar de caer siempre en Recuerdos.
- El menú de hoja inferior ahora aparece siempre por encima del botón flotante de acción.
- El aviso (Toast) respeta la zona segura inferior del dispositivo.
- Se precargan las fotos de una persona para evitar el parpadeo al abrir su pestaña de Fotos.
- Se redirige a la pantalla de inicio de sesión cuando la sesión ha caducado en el servidor.
- Al ver una foto desde la ficha de una persona, quienes administran el baúl ahora ven las mismas opciones (establecer portada del baúl, retirar foto) que al verla desde un capítulo.
- Al abrir un capítulo, ya no se ve el destello de sus recuerdos apareciendo justo después de que desaparece la pantalla de carga: ahora se precargan junto con las fotos antes de mostrar el contenido.
- Retirar una foto o cambiar su fecha ya actualiza también su aparición en las fichas de las personas etiquetadas en ella.
- El botón flotante de acción ya no parpadea al hacer scroll.
- Al refrescar la página dentro de un baúl, o cambiar a uno que no se había abierto en la sesión, ahora se ve la misma pantalla de "Abriendo baúl..." que al entrar por primera vez, en vez de un texto suelto de "Cargando..." seguido de un instante con el baúl vacío antes de que aparezca su contenido real.
- Lo mismo al refrescar la página dentro de la ficha de una persona: ahora se ve una pantalla de "Abriendo ficha..." completa en vez de un texto suelto de "Cargando..." seguido de un instante con las pestañas vacías.

## [beta-v0.1.2] - 2026-08-04

### Añadido

- Enlace de invitación global y reutilizable para unirse a un baúl.
- Las personas invitadas ahora pueden reclamar una ficha de persona ya preparada desde el enlace de invitación global.
- Compatibilidad con iOS.
- El carrusel de bienvenida se muestra una vez, en el primer inicio de sesión, antes de crear el baúl.
- Tras subir fotos aparece un carril de "Añadidas recientemente".

### Cambiado

- Subir fotos ahora es una pantalla propia, accesible como punto de entrada de la aplicación.
- Crear un baúl vuelve a ser una pantalla completa; las personas nuevas aterrizan ahí al entrar por primera vez.
- La introducción a la app ahora se presenta como una historia, no como un recorrido de funciones.
- La pantalla de crear baúl continúa la introducción de forma más natural.
- La introducción para personas invitadas se personaliza con el contenido real del baúl al que se les invita.

### Arreglado

- Las fotos HEIC de iPhone ahora se previsualizan correctamente y se convierten a JPEG al subirlas.
- Se agrandó la fecha en las tarjetas de capítulo para que se lea mejor.
- Ya no se reprocesa el enlace de inicio de sesión nativo en cada recarga de la app.
- Se corrigió un fallo al compartir contenido desde iOS.
- Los elementos fijos de la interfaz ya no invaden las zonas seguras del dispositivo en iOS.
- El icono y la pantalla de bienvenida de iOS ahora usan las imágenes reales de El Baúl.
- Se omite la pantalla de reclamar persona cuando quien invita ya pertenece al baúl.

### Seguridad

- Cerrar sesión ahora finaliza realmente la sesión de autenticación, no solo la de la app.

## Versiones anteriores

Ver [`CHANGELOG-ARCHIVE.md`](./CHANGELOG-ARCHIVE.md) para el histórico de la
fase alfa (`alpha-v0.0.0-*`, previa a `beta-v0.1.0`).
