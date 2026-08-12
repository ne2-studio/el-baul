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

## [beta-v0.3.2] - 2026-08-12

### Añadido

- La recomendación de "¿nos ayudas con esta foto?" ahora tiene un botón "No hay nadie en esta foto": esa foto deja de proponerse para etiquetar, a diferencia de "Ahora no" que solo la pospone.
- El menú de una foto tiene una nueva opción "Borrar fecha" (junto a "Cambiar fecha") para quitarle la fecha asignada, con confirmación previa.
- El selector de capítulo para mover fotos tiene ahora una caja de búsqueda para filtrar la lista por nombre.

### Cambiado

- La ficha de una persona ya no tiene la pestaña "Recuerdos": ahora solo muestra Fotos y Biografía, en ese orden.
- El selector de fecha de una foto ahora pide primero el día, luego el mes y por último el año, y el mes se elige por su nombre completo en vez de una abreviatura.
- El menú de una foto ya no ofrece "Establecer como portada del baúl" ni "Establecer como portada del capítulo" (la portada sigue pudiendo elegirse desde los ajustes del baúl o del capítulo).

### Arreglado

- Al abrir una foto de una tarjeta de subida en el feed, "Mover a otro capítulo" (y "Establecer como portada del capítulo", si corresponde) ya aparecen cuando esa foto pertenece a un capítulo, igual que al abrirla desde dentro del propio capítulo.
- Al editar la fecha de una foto que ya tenía fecha, el editor ahora la muestra precargada en vez de aparecer vacío.
- El selector de capítulo para mover fotos ya no cambia de alto al filtrar la lista, y ahora deja un pequeño margen entre las opciones y la barra de scroll.

### Seguridad

- Ya no es posible, a través de la gestión de acceso, convertir a otra persona en custodio del baúl ni quitarle ese rol al custodio original.

## [beta-v0.3.1] - 2026-08-09

### Añadido

- Notificaciones push (Android): además de los avisos de prueba, cada día como mucho se envía un aviso con las novedades del baúl (nuevos recuerdos, fotos o capítulos añadidos por otras personas). Si no hay nada nuevo, no se envía nada.

### Arreglado

- El icono de las notificaciones push en Android ya no aparece como un círculo opaco: ahora muestra el emblema de El Baúl.
- Al navegar directamente entre dos capítulos, dos personas o dos baúles (por ejemplo, tras mover fotos a otro capítulo) antes de que terminara de cargar la pantalla anterior, esta ya no se puede quedar cargando para siempre.
- Las fechas relativas (feed, baúles, capítulos, invitaciones) ahora usan una precisión que baja según se alejan en el tiempo: minutos y horas en lo más reciente, "hoy"/"ayer" durante el primer día, "hace X días" o "hace 1 semana" hasta las dos semanas, y a partir de ahí una fecha concreta (con el año solo si no es el actual).

## Versiones anteriores

Ver [`CHANGELOG-ARCHIVE.md`](./CHANGELOG-ARCHIVE.md) para el histórico de la
fase alfa (`alpha-v0.0.0-*`, previa a `beta-v0.1.0`).
