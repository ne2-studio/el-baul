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

- El baúl tiene ahora una pestaña "Fotos", junto a "Historia", "Capítulos" y "Familia", con todas las fotos del baúl ordenadas cronológicamente, con selección múltiple y las mismas acciones que ya existían en la vista de fotos de un capítulo (cambiar o borrar fecha, etiquetar personas, borrar). Subir fotos sueltas ahora se hace desde esta pestaña; el botón "Subir fotos" se ha quitado del menú de la pestaña "Capítulos". Un filtro arriba permite elegir entre ver solo las fotos sin capítulo (opción por defecto) o todas las fotos del baúl.
- La ficha de una persona vuelve a tener una pestaña "Recuerdos", entre "Fotos" y "Biografía", con los recuerdos de las fotos en las que esa persona está etiquetada.
- En la selección múltiple de fotos, ahora se puede borrar el lote seleccionado de una vez, pidiendo un único motivo para todas ellas.
- Al ver una foto, ahora aparece debajo de las personas etiquetadas el capítulo al que pertenece, y se puede tocar para ir directamente a él (salvo si ya se está viendo dentro de ese mismo capítulo).
- Al volver de un capítulo al listado del baúl, ahora se recupera el punto de scroll en el que se estaba antes de entrar, en vez de volver siempre arriba del todo.
- Al mover una o varias fotos a otro capítulo, si se busca un capítulo que no existe todavía aparece una opción "Nuevo capítulo" con el texto buscado: al elegirla y confirmar se crea ese capítulo y se mueven las fotos a él directamente, sin pasos adicionales.

### Cambiado

- En la pantalla "Invitar a la familia", las personas se listan ahora primero las que aún no han sido invitadas y luego las que ya están en el baúl, en orden alfabético dentro de cada grupo. En los menús para etiquetar personas, en cambio, se listan primero las que ya están en el baúl y luego las que están pendientes de invitación, también en orden alfabético dentro de cada grupo.
- En el visor de fotos, en móvil la foto ahora ocupa toda la pantalla y el panel de recuerdos aparece plegado como una hoja desplegable desde abajo; en escritorio se mantiene como antes, siempre visible junto a la foto.
- El email de bienvenida y el resumen semanal ahora saludan solo por el nombre de pila (por ejemplo, "Hola Pedro"), en vez de por el nombre completo.
- El resumen semanal por email y las notificaciones push de novedades ahora indican quién ha añadido cada novedad (por ejemplo, "Tita Loli añadió 3 recuerdos nuevos"), en vez de mostrar solo el número.
- Se ha renovado el contenido del email de bienvenida (tanto para quien entra por primera vez como para quien llega invitado a un baúl), que ahora incluye un vídeo de presentación de El Baúl.
- Se ha rediseñado la navegación de la cuenta y los ajustes del baúl: "Mi cuenta" (perfil, notificaciones y cerrar sesión) y "Ajustes del baúl" (portada, información, solicitudes de eliminación y eliminar baúl) ahora son pantallas propias accesibles desde el menú "···" del baúl, en vez de menús emergentes.
- En la pantalla de invitación a un baúl, ahora solo hay un botón ("Unirme al Baúl") y siempre pasa por la presentación de El Baúl antes de aceptar la invitación; antes se podía saltar directamente sin verla.
- La pestaña "Biografía" de la ficha de una persona pasa a activarse de forma gradual: mientras no esté disponible para tu baúl no aparecerá, y el asistente de IA tampoco tendrá en cuenta ese contenido.
- "Invitar a la familia" ya no muestra un único enlace para todo el baúl: ahora es una pantalla con la lista de personas del baúl, cada una con su propio botón "Invitar" para enviarle un enlace de invitación solo para ella. Al final hay un botón "Invitar a otra persona" para dar de alta a alguien que todavía no está en la lista. El estado "Sin acceso" desaparece: una persona está dentro del baúl o no lo está, y "Revocar acceso" ahora invalida su enlace de invitación (se le puede volver a invitar más adelante). La opción "Gestionar acceso" pasa a llamarse "Gestionar permisos".

### Arreglado

- Al ajustar el zoom de una foto de perfil de persona o de portada (capítulo o baúl), el recorte que se guardaba no coincidía con el que se veía en la vista previa; ahora sí coinciden.
- Al abrir un baúl, un capítulo o una persona, a veces fallaba la carga con un error de servidor; ahora carga siempre correctamente.
- Al abrir la aplicación, a veces aparecía la pantalla de "Sin conexión" aunque hubiera conexión real; ahora no ocurre.
- Al cambiar el nivel de acceso de una persona, ahora aparece un aviso de éxito confirmando el cambio.
- En el menú "···" de una persona, ya no aparece una doble línea separadora cuando no hay ninguna opción de gestión de acceso disponible (por ejemplo, en una persona pendiente de aceptar la invitación).
- En el menú "···" de una persona nunca invitada (sin acceso que revocar), ya no aparece la opción "Revocar acceso".
- En la pantalla de subir fotos, ya se pueden arrastrar y soltar fotos también sobre el botón "Añadir más fotos" cuando ya hay fotos seleccionadas; antes el navegador las abría en una pestaña nueva en vez de añadirlas.
- La pantalla de "Guardando tus recuerdos…" al subir muchas fotos a la vez ya no se queda bloqueada; ahora muestra una vista previa compacta de las fotos junto con el progreso ("Subiendo X de Y fotos") en vez de una lista completa con una foto por fila.
- Al copiar el enlace de invitación a un baúl, el aviso de confirmación ("Enlace copiado al portapapeles") ya no queda oculto detrás de la ventana de invitación.
- Al entrar directamente a un baúl (por ejemplo, recargando la página o abriendo un enlace guardado), la pantalla "Abriendo baúl..." ya no se queda cargando para siempre en algunos casos.
- Al subir fotos en formato HEIC (el habitual del iPhone), la generación de la vista previa ya no tarda tanto.
- En el feed, al tocar la foto de un recuerdo que comparte foto con otra entrada (por ejemplo, la foto subida y el recuerdo escrito sobre ella), ahora se abre correctamente; antes en ocasiones no pasaba nada.
- Tras una instalación nueva, los baúles aparecían marcados con novedades pero al entrar el feed no mostraba nada como nuevo; ahora la primera visita a un baúl sí muestra su contenido existente marcado como novedad.
- Los recuerdos con texto muy largo ya no ocupan todo el espacio en el feed del baúl ni en el listado de recuerdos de un capítulo; ahora aparecen colapsados con un botón "Ver más" para desplegarlos.
- En la pantalla de sugerencia de contribución de una foto, el botón "No hay nadie en esta foto" aparecía antes que "Guardar"; ahora aparece debajo, como en el resto de pantallas.
- Al compartir una foto con El Baúl desde el share nativo de Android nada más abrir la aplicación, a veces se veía brevemente un baúl (y su sugerencia de contribución) antes de la pantalla para elegir a qué baúl compartir; ahora se va directamente a esa pantalla.
- Al confirmar "No hay nadie en esta foto" en la sugerencia de contribución, si la foto ya tenía algún recuerdo, se pedía escribir uno de todas formas; ahora, en ese caso, se cierra la sugerencia sin pedir nada más.

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

## Versiones anteriores

Ver [`CHANGELOG-ARCHIVE.md`](./CHANGELOG-ARCHIVE.md) para el histórico de la
fase alfa (`alpha-v0.0.0-*`, previa a `beta-v0.1.0`).
