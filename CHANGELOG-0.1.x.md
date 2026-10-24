# Changelog 0.1.x

Cambios de la serie `0.1.x`. Ver [`CHANGELOG.md`](./CHANGELOG.md) para la serie en curso.

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
