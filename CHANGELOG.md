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

- El feed del baúl ahora separa "Nueva actividad" desde tu última visita de lo que ya habías visto, y marca esas tarjetas con un hint visual. Cada baúl lleva su propio marcador de última visita.
- Nueva tarjeta en el feed cuando se crea un capítulo.
- Si entras desde el navegador de un móvil Android, un aviso te ofrece abrir o descargar la app.
- El logo de El Baúl aparece ahora en la cabecera de todos los emails (bienvenida y resumen semanal).
- Al elegir foto de portada de un capítulo o de un baúl, ahora puedes recortarla (zoom y centrado horizontal/vertical), igual que ya podías hacer con la foto de perfil.
- Ahora puedes borrar tú mismo una foto que hayas subido, durante la primera hora tras subirla, por si te equivocas al subirla.
- Nueva recomendación de contribución "escribe un recuerdo": al abrir un baúl, a veces te propone una foto al azar y te anima a contar qué recuerdas de ese momento, como alternativa a "¿nos ayudas con esta foto?".
- El chat ahora aprende en silencio información relevante que le cuentas (personas, apodos, historias familiares) y la recuerda en conversaciones futuras dentro del mismo baúl. Desde el menú del chat puedes entrar en "Gestionar memoria" para ver, corregir o eliminar lo que recuerda de ti.
- Nuevo Modo TV: abre el navegador de tu televisión en la dirección de El Baúl seguida de `/tv` y aparecerá un código QR; escanéalo con el móvil (con la sesión iniciada), elige el baúl que quieres mostrar y la TV lo abrirá sola, sin tener que teclear ningún enlace. Una vez abierto, las fotos del baúl se ven a pantalla completa y se navegan con las flechas y Enter del mando, mostrando la fecha, el capítulo, las personas etiquetadas y el último recuerdo de cada foto. El acceso caduca solo pasadas unas horas.

### Cambiado

- El panel para gestionar el acceso de una persona ahora tiene el mismo estilo que el resto de paneles, y muestra botones de "Guardar cambios" y "Cancelar" en vez de aplicar el cambio de rol al instante.
- Las pestañas Historia, Capítulos y Familia del baúl ya no muestran un número de recuento — no aportaba información útil.
- Las notificaciones push diarias ya no avisan de actividad que ya habías visto en el feed de un baúl concreto (el resumen semanal por email sigue incluyéndola, como recopilatorio que es).
- La recomendación de "¿nos ayudas con esta foto?" ya no aparece la primera vez que abres la app, ni al entrar desde una notificación push o desde un enlace de email.
- El botón para eliminar una foto ahora se llama "Borrar foto" en vez de "Retirar foto", para que quede más claro qué hace.
- El botón para confirmar la subida de fotos ahora se llama "Subir fotos" en vez de "Guardar recuerdos", para que quede más claro qué hace.

### Arreglado

- Los enlaces de los emails (resumen semanal, bienvenida) daban un error al pulsarlos en vez de llevarte a la página correspondiente.
- Editar un recuerdo desde el visor de fotos ya no descuadra el diseño al abrir el teclado en móvil: ahora se edita en una ventana aparte.
- El selector de baúl (y el resto de menús desplegables) ya no se quedaba con el foco visualmente atascado en el botón tras pinchar fuera para cerrarlo — antes hacía falta pinchar fuera dos veces.
- El texto de las filas del selector de baúl aparecía en negro al pasar el ratón por encima, en vez de en blanco como el resto de menús desplegables.
- La lista de solicitudes de retirada de fotos ocupaba todo el ancho de la pantalla en ordenador, en vez de mantener el mismo ancho que el resto de páginas.
- Las flechas del campo de año (al añadir una fecha) empezaban a contar desde 0 en vez de partir de un año real.
- Si ya habías solicitado la retirada de una foto, el menú volvía a ofrecer "Solicitar retirada" como si nada — ahora aparece deshabilitado con el texto "Ya has solicitado la retirada".
- Borrar un capítulo daba error si tenía alguna foto ya borrada con personas etiquetadas.

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
