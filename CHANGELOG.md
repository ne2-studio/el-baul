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

### Cambiado

- La app ya no abre en una lista de baúles: entra directamente en el último baúl usado. Para cambiar de baúl hay un selector en la parte superior de la pantalla, sin necesidad de navegar a otra pantalla.
- Las tarjetas de capítulo ahora muestran su foto de portada a pantalla completa con el título y las fechas superpuestos, en lugar de aparecer en una cuadrícula con la foto e información por separado.

### Arreglado

- El menú de hoja inferior ahora aparece siempre por encima del botón flotante de acción.
- El aviso (Toast) respeta la zona segura inferior del dispositivo.
- Se precargan las fotos de una persona para evitar el parpadeo al abrir su pestaña de Fotos.
- Se redirige a la pantalla de inicio de sesión cuando la sesión ha caducado en el servidor.
- Al ver una foto desde la ficha de una persona, quienes administran el baúl ahora ven las mismas opciones (establecer portada del baúl, retirar foto) que al verla desde un capítulo.
- Retirar una foto o cambiar su fecha ya actualiza también su aparición en las fichas de las personas etiquetadas en ella.
- El botón flotante de acción ya no parpadea al hacer scroll.
- Al refrescar la página dentro de un baúl, o cambiar a uno que no se había abierto en la sesión, ahora se ve la misma pantalla de "Abriendo baúl..." que al entrar por primera vez, en vez de un texto suelto de "Cargando..." seguido de un instante con el baúl vacío antes de que aparezca su contenido real.

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

## [beta-v0.1.0] - 2026-07-30

### Cambiado

- El recorte/zoom del avatar de persona se aplica ahora en el servidor de imágenes, con mejor calidad.
- Crear un baúl o un capítulo ahora se hace desde una ventana modal.
- Se homogeneizaron los botones de acción de las ventanas modales.
- El chat ahora tiene en cuenta las fechas de los capítulos para responder mejor.

### Arreglado

- Se ajustó el tamaño del avatar de persona para que se vea más nítido.
- Se corrigió el color de los iconos al pasar el cursor en los menús desplegables.
- Los errores de acceso denegado del servidor ya no rompen la pantalla.
- Los avisos (Toasts) de error muestran ahora el estilo visual correcto.
- Se restauró el marcador de posición de las personas sin foto.

### Seguridad

- Se resolvieron vulnerabilidades detectadas en dependencias de la aplicación.

## Versiones anteriores

Ver [`CHANGELOG-ARCHIVE.md`](./CHANGELOG-ARCHIVE.md) para el histórico de la
fase alfa (`alpha-v0.0.0-*`, previa a `beta-v0.1.0`).
