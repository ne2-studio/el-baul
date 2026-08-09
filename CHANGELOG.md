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

## [beta-v0.3.1] - 2026-08-09

### Añadido

- Notificaciones push (Android): además de los avisos de prueba, cada día como mucho se envía un aviso con las novedades del baúl (nuevos recuerdos, fotos o capítulos añadidos por otras personas). Si no hay nada nuevo, no se envía nada.

### Arreglado

- El icono de las notificaciones push en Android ya no aparece como un círculo opaco: ahora muestra el emblema de El Baúl.
- Al navegar directamente entre dos capítulos, dos personas o dos baúles (por ejemplo, tras mover fotos a otro capítulo) antes de que terminara de cargar la pantalla anterior, esta ya no se puede quedar cargando para siempre.
- Las fechas relativas (feed, baúles, capítulos, invitaciones) ahora usan una precisión que baja según se alejan en el tiempo: minutos y horas en lo más reciente, "hoy"/"ayer" durante el primer día, "hace X días" o "hace 1 semana" hasta las dos semanas, y a partir de ahí una fecha concreta (con el año solo si no es el actual).

## [beta-v0.3.0] - 2026-08-08

### Añadido

- Al entrar en el feed de un baúl, si hay alguna foto sin personas etiquetadas se pide ayuda para identificar a quién sale antes de mostrar el feed — una única recomendación, opcional ("Ahora no"), que no vuelve a aparecer en ese baúl hasta pasados 60 minutos (pero sí puede aparecer al entrar en otro baúl distinto). La foto se queda fija arriba (con los mismos gestos de zoom del visor de la galería) y "Guardar" fijo abajo, así que solo la lista de personas se mueve al hacer scroll. Al guardar, aparece un aviso de agradecimiento.
- El feed de un baúl ahora también puede mostrar las fotos subidas, agrupadas en una tarjeta por cada vez que alguien sube varias a la vez: quién las subió, cuántas fotos son, a qué capítulo pertenecen (si corresponde) y una vista previa en miniatura de las primeras cuatro. Al tocar "y X más" se abre una cuadrícula solo con las fotos de esa subida, y al tocar una foto se abre la galería navegando únicamente entre las fotos de esa misma subida.
- Notificaciones push (Android): en Notificaciones dentro de Cuenta hay un nuevo interruptor "Notificaciones push" que pide permiso al sistema y registra el dispositivo para recibir avisos. Desde el panel de administración, la ficha de cada usuario permite enviarle una notificación push de prueba con un mensaje y un enlace interno opcional al que lleva la app al tocarla.

### Cambiado

- Dentro de un baúl, la pestaña de Recuerdos pasa a llamarse "Historia" y la de Personas pasa a llamarse "Familia".
- En la tarjeta de un recuerdo dentro del feed de un baúl, quién lo escribió (foto y nombre) y cuándo pasan a la primera línea, antes del propio texto.
- En tablet y escritorio, el visor de fotos ahora muestra la foto y los recuerdos en dos columnas en vez de apilados, aprovechando mejor el ancho de la pantalla.
- El chat con IA pasa a llamarse "Recordemos juntos" y ahora siempre intenta seguir la conversación con una pregunta: si la persona usuaria pregunta y hay respuesta, invita a ahondar en el recuerdo; si pregunta y no la hay, lo dice y pide esa información; si simplemente comparte algo sin preguntar, sigue la charla con una pregunta que ayude a recordar más detalles, sin decir que no lo sabe.
- El chat con IA ahora sabe con quién está hablando, en vez de responder como si no supiera quién eres.
- El chat con IA solo tiene en cuenta (y muestra) los últimos 10 mensajes de la conversación, y ninguno de hace más de 24 horas; pasado ese tiempo la conversación empieza de cero.

### Arreglado

- La foto en el visor ya no cambia de tamaño según las dimensiones de la imagen ni la cantidad de recuerdos cargados: ahora mide siempre lo mismo.
- Al abrir una foto, mientras se cargan sus recuerdos se muestra un pequeño indicador de carga en vez de dar a entender por un instante que no tiene ninguno.
- La foto sugerida para etiquetar al entrar en un baúl ahora se elige al azar entre las que faltan por etiquetar, en vez de ser siempre la misma (la más antigua).
- El resumen semanal por email ya no cuenta ni muestra los capítulos, recuerdos y fotos que la propia persona destinataria ha creado, solo las novedades del resto.
- En las tarjetas del feed de un baúl, la fecha ("hace X") pasa a su propia línea debajo del nombre para que el título ya no se corte.
- El nombre del baúl en la cabecera se muestra un poco más pequeño para que quepa mejor y no se corte con nombres largos.

## Versiones anteriores

Ver [`CHANGELOG-ARCHIVE.md`](./CHANGELOG-ARCHIVE.md) para el histórico de la
fase alfa (`alpha-v0.0.0-*`, previa a `beta-v0.1.0`).
