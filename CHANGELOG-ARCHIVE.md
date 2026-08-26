# Changelog — histórico

Versiones antiguas movidas fuera de [`CHANGELOG.md`](./CHANGELOG.md) para que
ese archivo se mantenga corto y legible. Ver ese fichero para el formato y
las versiones recientes.

## [beta-v0.4.1] - 2026-08-18

### Añadido

- Ahora es posible poner El Baúl en mantenimiento: mientras dura, la app muestra una pantalla explicándolo y ninguna acción está disponible.
- En la selección múltiple de fotos, ahora puedes borrar la fecha de todas las fotos seleccionadas a la vez.
- La pantalla de una subida de fotos (la que abres desde "y N más" en el feed) ahora tiene selección múltiple, con las mismas acciones en lote que ya había en capítulos: cambiar fecha, borrar fecha, mover, crear un capítulo nuevo y etiquetar personas.
- Si subes una foto que ya estaba en el baúl, ya no se duplica: la app la reconoce y avisa de que esa foto ya estaba, sin que cuente como un error ni interrumpa la subida del resto de fotos seleccionadas.
- En la app nativa de Android, si aún no has activado las notificaciones push, aparece un aviso ofreciendo activarlas. Si lo cierras, no vuelve a aparecer hasta pasada una semana (y se resetea si desinstalas/reinstalas la app o la usas en otro dispositivo).
- El selector de baúles ahora muestra un punto junto a cada baúl con novedades desde tu última visita, y otro junto al propio selector si hay novedades en cualquiera de tus baúles.
- En la sugerencia de etiquetar personas en una foto, al pulsar "No hay nadie en esta foto" ahora se propone escribir un recuerdo sobre esa misma foto, en vez de no hacer nada.
- Ahora cada subida de fotos admite como máximo 30; si seleccionas más, la selección se recorta automáticamente y se avisa con un mensaje.

### Arreglado

- Al abrir un baúl, ya no aparece un segundo aviso de carga del feed: ahora toda la entrada queda bajo "Abriendo baúl...".
- Al crear un capítulo nuevo, ahora navega directamente a ese capítulo y muestra un aviso de éxito, en vez de volver a la vista del baúl sin confirmación.
- En la pantalla de "¿nos ayudas con esta foto?" (etiquetar personas o escribir un recuerdo), el panel de la foto ya no tiene un alto fijo: ahora se ajusta a la proporción real de la foto, así una foto panorámica deja más sitio a la lista de debajo en vez de mostrarse con franjas negras. Además, el alto máximo es algo menor, para que los botones de seleccionar personas se vean mejor.
- Las pestañas de "Recuerdos" y "Fotos" en la pantalla de Capítulo ya no muestran el número entre paréntesis, no aportaba nada.
- Al abrir la app (por ejemplo, al compartir una foto con El Baúl desde otra app en Android), ya no se ve una pantalla en negro mientras carga: ahora se muestra una pantalla de carga.
- En la pantalla de subida de fotos, al añadir muchas fotos de golpe ya no parece que la app se haya quedado colgada mientras se preparan las previsualizaciones: ahora se muestra un aviso de carga.
- En la pantalla "Guardando tus recuerdos…", al subir muchas fotos a la vez ya no se bloquea el scroll ni el título y el progreso quedan fuera de la pantalla: ahora se quedan siempre visibles y solo se desplaza la cuadrícula de fotos.
- Si la sesión se cae mientras estabas usando la app, ahora se intenta volver a iniciarla automáticamente en vez de mandarte directamente a la pantalla de "Continuar con Google".
- Corregido un caso en el que, tras recargar la app con una sesión ya inválida, el reintento automático de inicio de sesión podía repetirse en vez de llevarte a la pantalla de "Continuar con Google" tras un único intento.
- Se ha corregido un fallo por el que el email de resumen semanal dejaba de llegar a algunas personas usuarias de forma silenciosa e intermitente.
- Se ha corregido que, al abrir la app en el navegador, a veces se recargara sola sin avisar (por ejemplo, cambiando de golpe una recomendación que ya estabas viendo). Ahora, si hay una versión nueva disponible, aparece un aviso para actualizar cuando tú quieras.
- En las pantallas de subida de fotos, al seleccionar fotos muy pesadas la app se quedaba pillada mientras las previsualizaba. Ahora las previsualizaciones se muestran a un tamaño reducido, sin afectar a la calidad de la foto que se sube y se guarda.
- La pantalla de "Sin conexión" saltaba con demasiada facilidad ante un fallo de red puntual que se resolvía solo. Ahora se reintenta antes de mostrarla y, si llega a aparecer, la app se recupera sola en cuanto vuelve la conexión, sin necesidad de recargar la página.
- Al abrir un capítulo, ya no se ven dos avisos de carga distintos y seguidos ("Cargando fotos..." y "Cargando capítulo..."): ahora se muestra un único "Abriendo capítulo...".

### Seguridad

- Al subir una foto, ya no se confía en el nombre de archivo ni en el tipo declarado por quien la sube para decidir cómo tratarla: ahora se examina el propio contenido del archivo. Esto evita que un archivo mal etiquetado o manipulado a propósito pueda saltarse las comprobaciones de imagen válida.

## [beta-v0.4.0] - 2026-08-13

### Añadido

- El feed del baúl ahora separa "Nueva actividad" desde tu última visita de lo que ya habías visto, y marca esas tarjetas con un hint visual. Cada baúl lleva su propio marcador de última visita.
- Nueva tarjeta en el feed cuando se crea un capítulo.
- Si entras desde el navegador de un móvil Android, un aviso te ofrece abrir o descargar la app.
- El logo de El Baúl aparece ahora en la cabecera de todos los emails (bienvenida y resumen semanal).
- Al elegir foto de portada de un capítulo o de un baúl, ahora puedes recortarla (zoom y centrado horizontal/vertical), igual que ya podías hacer con la foto de perfil.
- Ahora puedes borrar tú mismo una foto que hayas subido, durante la primera hora tras subirla, por si te equivocas al subirla.
- Nueva recomendación de contribución "escribe un recuerdo": al abrir un baúl, a veces te propone una foto al azar y te anima a contar qué recuerdas de ese momento, como alternativa a "¿nos ayudas con esta foto?".
- El chat ahora aprende en silencio información relevante que le cuentas (personas, apodos, historias familiares) y la recuerda en conversaciones futuras dentro del mismo baúl. Desde el menú del chat puedes entrar en "Gestionar memoria" para ver, corregir o eliminar lo que recuerda de ti.
- Nuevo Modo TV: abre el navegador de tu televisión en la dirección de El Baúl seguida de `/tv` y aparecerá un código QR; escanéalo con el móvil (con la sesión iniciada), elige el baúl que quieres mostrar y la TV lo abrirá sola, sin tener que teclear ningún enlace. Una vez abierto, las fotos del baúl se ven a pantalla completa y se navegan con las flechas y Enter del mando (o tocando/haciendo clic a los lados y en el centro de la pantalla, para televisores con mando de ratón), mostrando la fecha, el capítulo, las personas etiquetadas y el último recuerdo de cada foto. El acceso caduca solo pasadas unas horas.

### Cambiado

- El panel para gestionar el acceso de una persona ahora tiene el mismo estilo que el resto de paneles, y muestra botones de "Guardar cambios" y "Cancelar" en vez de aplicar el cambio de rol al instante.
- Las pestañas Historia, Capítulos y Familia del baúl ya no muestran un número de recuento — no aportaba información útil.
- Las notificaciones push diarias ya no avisan de actividad que ya habías visto en el feed de un baúl concreto (el resumen semanal por email sigue incluyéndola, como recopilatorio que es).
- La recomendación de "¿nos ayudas con esta foto?" ya no aparece la primera vez que abres la app, ni al entrar desde una notificación push o desde un enlace de email.
- El botón para eliminar una foto ahora se llama "Borrar foto" en vez de "Retirar foto", para que quede más claro qué hace.
- El botón para confirmar la subida de fotos ahora se llama "Subir fotos" en vez de "Guardar recuerdos", para que quede más claro qué hace.

### Arreglado

- Las fotos de resolución muy alta ya no fallaban al mostrarse dentro de la app: ahora se ajustan automáticamente a un tamaño manejable al subirlas, conservando la proporción original.
- Los enlaces de los emails (resumen semanal, bienvenida) daban un error al pulsarlos en vez de llevarte a la página correspondiente.
- Editar un recuerdo desde el visor de fotos ya no descuadra el diseño al abrir el teclado en móvil: ahora se edita en una ventana aparte.
- El selector de baúl (y el resto de menús desplegables) ya no se quedaba con el foco visualmente atascado en el botón tras pinchar fuera para cerrarlo — antes hacía falta pinchar fuera dos veces.
- El texto de las filas del selector de baúl aparecía en negro al pasar el ratón por encima, en vez de en blanco como el resto de menús desplegables.
- La lista de solicitudes de retirada de fotos ocupaba todo el ancho de la pantalla en ordenador, en vez de mantener el mismo ancho que el resto de páginas.
- Las flechas del campo de año (al añadir una fecha) empezaban a contar desde 0 en vez de partir de un año real.
- Si ya habías solicitado la retirada de una foto, el menú volvía a ofrecer "Solicitar retirada" como si nada — ahora aparece deshabilitado con el texto "Ya has solicitado la retirada".
- Borrar un capítulo daba error si tenía alguna foto ya borrada con personas etiquetadas.
- En Android, los enlaces de los emails ya abren la app instalada en vez de siempre el navegador.

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

## [alpha-v0.0.0-20260729] - 2026-07-29

### Añadido

- Ahora se puede revocar el acceso de una persona sin borrar su historia.
- Se puede dividir el selector de avatar en fotos etiquetadas/sin etiquetar y una pantalla de recorte completa.
- Ahora se pueden editar los recuerdos propios.

### Cambiado

- Las personas ahora se agrupan según su nivel de acceso al baúl.
- Los avatares de persona se integraron con las fotos del baúl.
- Cualquier miembro del baúl puede editar la biografía de una persona, no solo quien la creó.

### Arreglado

- Las hojas inferiores grandes ya no se desplazan ni tapan su cabecera con el contenido.

## [alpha-v0.0.0-20260728] - 2026-07-28

### Añadido

- Ahora se pueden compartir recuerdos mediante enlaces públicos.

### Cambiado

- Se alineó visualmente la ventana de revocar acceso.

### Arreglado

- Las fechas de un capítulo se actualizan correctamente tras mover fotos entre capítulos.
- Se evita navegar entre fotos por error mientras se edita un comentario.
- El color de los botones deshabilitados ya no cambia al pasar el cursor.

## [alpha-v0.0.0-20260727] - 2026-07-27

### Cambiado

- El chat con inteligencia artificial responde siempre en español de España y conoce la fecha actual.

## [alpha-v0.0.0-20260726] - 2026-07-26

### Arreglado

- El resumen semanal por correo se envía siempre los domingos a las 8:00 (UTC).
- Se corrigió la URL de la política de privacidad para usar la ruta en español.

## [alpha-v0.0.0-20260725] - 2026-07-25

### Añadido

- Pie de página común en los correos transaccionales.
- Selector de foto de portada en los menús de baúl y de capítulo.
- El chat genera preguntas de inicio sugeridas según los capítulos y personas del baúl.
- Ahora se pueden etiquetar personas en las fotos y explorar las fotos de una persona en orden cronológico.
- Se pueden etiquetar personas en varias fotos a la vez desde la selección múltiple.
- Campo de biografía libre en la ficha de persona, usado también por el chat.
- Pestañas de Biografía y Fotos en la ficha de persona.

### Cambiado

- El tamaño de letra base de la aplicación aumentó de 16 a 18px.
- La barra de pestañas se puede desplazar horizontalmente en móvil.
- Las pantallas se ensancharon para mostrar una cuadrícula de 3 columnas en los capítulos.
- El botón de editar persona se movió a la barra de navegación.
- La gestión de roles de una persona se movió al menú de "...".
- La barra de acciones sobre fotos seleccionadas se desplaza horizontalmente en móvil.
- El aviso (Toast) se ensanchó en móvil.

## [alpha-v0.0.0-20260724] - 2026-07-24

### Cambiado

- En pantallas grandes, las hojas inferiores grandes se muestran como un panel lateral derecho.

### Arreglado

- Las tarjetas de recuerdo duplicadas se unificaron: tocar el avatar siempre navega a la ficha de la persona.
- El fondo ya no se desplaza mientras el visor de fotos está abierto.
- Al salir de la ficha de una persona, se vuelve a la pestaña desde la que se accedió.
- Los campos de las ventanas modales permanecen visibles por encima del teclado en móvil.
- Se corrigieron fallos silenciosos al cargar personas; ahora se notifican correctamente.

## [alpha-v0.0.0-20260723] - 2026-07-23

### Añadido

- Ahora se pueden crear recuerdos sueltos, y se añadió una pestaña de Recuerdos combinada al baúl.
- Se puede eliminar un capítulo, y el custodio puede solicitar la eliminación de un baúl.
- Los recuerdos vinculados a una foto son interactivos desde la pestaña de Recuerdos.
- Iconos en las acciones del visor de fotos.
- El visor de fotos es ahora una capa superpuesta real, con URLs propias que se pueden compartir y recargar.
- Selección múltiple de fotos al estilo Google Photos en las cuadrículas de capítulo.
- Zoom con pellizco y doble toque en el visor de fotos.
- Primera versión del chat con inteligencia artificial sobre el contenido del baúl.

### Cambiado

- Se eliminó el paso manual de fecha al confirmar la subida de fotos.
- Compartir o quitar una persona se movió al menú de tres puntos de la cabecera.
- Se reordenaron las pestañas del baúl y se actualizó el texto de carga al abrirlo.
- Las fotos de portada anchas se difuminan progresivamente para disimular el escalado.

### Eliminado

- Se eliminó el campo de descripción de los capítulos.

### Arreglado

- La pestaña de Recuerdos del baúl se sincroniza al añadir un recuerdo desde una foto o capítulo.
- Se eliminó el parpadeo de doble pantalla de carga al abrir un baúl por primera vez.
- Se corrigió la dirección del deslizamiento y la animación de salida del visor de fotos al invertir el sentido.
- Se unificaron las ventanas de hoja inferior, corrigiendo los bordes de la ventana de eliminar álbum.
- Se eliminó una llamada a la acción duplicada en los capítulos vacíos.
- Se eliminó la visualización redundante del correo en la ventana de cuenta.
- El campo para escribir un recuerdo se mantiene anclado a la parte inferior del visor de fotos.

## [alpha-v0.0.0-20260722] - 2026-07-22

### Añadido

- Las fotos descargadas en Android se guardan directamente en la galería del dispositivo.

### Cambiado

- Los capítulos y las fotos se ordenan del más antiguo al más reciente.
- Tras subir fotos se navega directamente a ellas con una notificación, en vez de mostrar una pantalla de confirmación.

### Arreglado

- Se muestra "retirar" o "solicitar retirada" según corresponda al rol de la persona usuaria.
- Se corrigieron varios errores de navegación en el visor de fotos (enlaces directos, botón atrás, desplazamiento).

## [alpha-v0.0.0-20260721] - 2026-07-21

### Añadido

- Correo de bienvenida al unirse a El Baúl.
- Resumen semanal por correo.
- Pantalla de preferencias de notificaciones.
- El visor de fotos permite descargar fotos, deslizar entre ellas y muestra el pie de foto.

### Cambiado

- El nombre del remitente de los correos ahora es "El Baúl".

## [alpha-v0.0.0-20260720] - 2026-07-20

### Añadido

- Centro de Ayuda y soporte, con formularios de reporte, sugerencia y soporte.

### Cambiado

- Las invitaciones de persona se comparten mediante el selector nativo del dispositivo, en vez de copiarse al portapapeles.
- El formulario de soporte ya no permite adjuntar capturas de pantalla.

### Arreglado

- Se restauró la opción "no me acuerdo" en las fechas, y se corrigieron huecos de carga al compartir y fotos de álbum que se perdían.

## [alpha-v0.0.0-20260719] - 2026-07-19

### Añadido

- Rediseño de cómo compartir un baúl, ahora centrado en Personas con enlaces de invitación personales.
- Ficha de Persona con pantalla de detalle/edición y subida de avatar.
- El avatar de la persona configurada se muestra en las burbujas de recuerdos y lleva a su ficha al tocarlo.
- Se captura el capítulo y la fecha al importar fotos, con opción de elegir capítulo desde la selección en fotos sueltas.

### Arreglado

- Se muestra el apodo de la persona, en vez del nombre de la cuenta, como autora de recuerdos y solicitudes de retirada.
- El menú de opciones del baúl se oculta cuando no tiene ninguna acción disponible.
- El botón de confirmar importación se habilita de inmediato cuando la fecha se completa automáticamente por EXIF.
- Se omite el selector de capítulo al subir fotos dentro de un capítulo ya abierto.
- Al compartir fotos desde otra app y elegir un baúl, ya no se vuelve por error a la pantalla de inicio.

## [alpha-v0.0.0-20260718] - 2026-07-18

### Añadido

- Cronología de fotos y capítulos (fechas EXIF, edición manual y orden cronológico).
- Los capítulos se agrupan en carriles cronológicos dentro de la pantalla del baúl.
- Ahora se pueden renombrar baúles y capítulos, y añadirles una descripción.
- Los custodios pueden eliminar fotos desde el visor.
- Cabecera destacada en las pantallas de Baúl/Capítulo, con la edición movida a un menú.
- El visor de fotos muestra la imagen a pantalla completa.
- Feed de Recuerdos en los capítulos. "Álbum" pasa a llamarse "Capítulo" en toda la aplicación.

### Cambiado

- Las subidas de fotos duplicadas se evitan, y reintentar tras un fallo parcial ahora funciona correctamente.

### Arreglado

- Se muestra la insignia de rol correcta (Colaborador/Miembro) en la lista de baúles.
- Se restablece la posición de desplazamiento al navegar entre pantallas.
- Se corrigió el número de miembros del baúl; ahora se ordena por actividad y se muestran recuerdos en las tarjetas de capítulo.

## [alpha-v0.0.0-20260717] - 2026-07-17

### Añadido

- Icono, pantalla de bienvenida y logo de El Baúl en toda la aplicación.
- Nuevo diseño de la lista de baúles con fotos de portada y control de portada para el custodio.
- Control de portada de capítulo para custodios y colaboradores.
- Botones flotantes de acción en las pantallas de Baúl y Capítulo.
- Se pueden subir fotos directamente a un baúl como fotos sueltas.
- Opción "Mover a otro álbum" para mover fotos entre capítulos.
- Se pueden mover fotos sueltas a un capítulo.
- Se pueden recibir fotos compartidas desde otras apps de Android con el botón de compartir del sistema.

### Eliminado

- Se eliminó la función de solicitudes de acceso.
- Se eliminó el feed de actividad.

## [alpha-v0.0.0-20260716] - 2026-07-16

### Añadido

- Los álbumes destacados y las tarjetas de fotos se muestran ahora a pantalla completa.

### Cambiado

- El selector de fotos nativo se abre directamente al subir fotos, sin ventana intermedia.

### Arreglado

- Se muestra un estado de carga mientras los baúles se cargan desde el servidor.
- Los baúles compartidos muestran correctamente el número de personas con acceso, en vez de "Solo tú".
- Se corrigieron insignias sueltas de "0"/"00" bajo los iconos de campana y menú.
- La foto de portada del álbum se actualiza correctamente tras la primera subida.
- La sesión persiste correctamente: iniciar sesión ya sobrevive a reinicios de la aplicación.

## [alpha-v0.0.0-20260715] - 2026-07-15

### Añadido

- Se lanzó la aplicación para Android.

## [alpha-v0.0.0-20260713] - 2026-07-13

### Arreglado

- Se corrigió un error de inicio de sesión que impedía completar la autenticación correctamente.
