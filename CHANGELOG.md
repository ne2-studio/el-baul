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

- Al crear una persona (o al gestionar su acceso) ahora se puede elegir su nivel de acceso: Colaborador, Administrador o Sin acceso, con una breve explicación de lo que implica cada opción. "Sin acceso" es para quienes forman parte de la historia familiar pero no deben poder entrar al baúl, y solo se puede elegir mientras la persona todavía no se ha unido.
- En la ficha de una persona que aún no se ha unido al baúl, ahora hay una opción "Enviar invitación" para compartirle directamente su enlace de invitación.

### Cambiado

- Al revocar el acceso de alguien, ahora su nivel pasa a "Sin acceso" (antes se mantenía el que tuviera); para volver a invitarla hay que elegirle antes un nivel de acceso distinto.
- El menú "Invitar a la familia" ya no muestra a las personas marcadas como "Sin acceso".
- En la pestaña de Personas ("Familia"), ahora las personas marcadas como "Sin acceso" aparecen en su propio grupo, aparte de las que están pendientes de unirse, mostradas de forma atenuada y plegado por defecto.
- En la ficha de una persona, ahora la insignia de nivel de acceso se muestra siempre, incluyendo "Sin acceso", y el texto de debajo distingue con más precisión su situación: si ya se unió al baúl, si aún no se ha unido, o si forma parte de la historia familiar pero no tiene acceso.

### Arreglado

- Al compartir una foto con El Baúl desde el selector nativo de Android, ahora aparece directamente la pantalla para elegir baúl, sin tener que volver atrás por varias pantallas ni hacer scroll para que se vea.

## [beta-v0.4.3] - 2026-08-26

### Cambiado

- En la pestaña "Recuerdos" de la ficha de una persona, los recuerdos ahora se ordenan por la fecha de la foto a la que pertenecen (de más reciente a más antigua), en vez de por la fecha en que se escribió el recuerdo.

### Arreglado

- Al pulsar "Volver" tras subir fotos (cuando esa subida no venía de un capítulo o pantalla previa concreta), ya no se quedaba la pantalla en blanco.
- Al compartir una foto desde otra app (por ejemplo Google Fotos) hacia El Baúl en Android, ya no se quedaba la app en una pantalla en blanco sin salida.
- En el feed del baúl, al tocar la foto de un recuerdo cuya foto se había movido de capítulo después de escribir el recuerdo, ya no aparecía "No se ha encontrado la foto." (se abría el capítulo antiguo en vez del actual).

### Seguridad

- Actualizadas las librerías del sistema incluidas en las imágenes de El Baúl para corregir vulnerabilidades conocidas.

## [beta-v0.4.2] - 2026-08-25

### Añadido

- El baúl tiene ahora una pestaña "Fotos", junto a "Historia", "Capítulos" y "Familia", con todas las fotos del baúl ordenadas cronológicamente, con selección múltiple y las mismas acciones que ya existían en la vista de fotos de un capítulo (cambiar o borrar fecha, etiquetar personas, borrar). Subir fotos sueltas ahora se hace desde esta pestaña; el botón "Subir fotos" se ha quitado del menú de la pestaña "Capítulos". Un filtro arriba permite elegir entre ver solo las fotos sin capítulo (opción por defecto) o todas las fotos del baúl; con "Sin capítulo" seleccionado, la selección múltiple también permite mover las fotos a un capítulo o crear uno nuevo con ellas.
- Tras subir fotos, ahora se aterriza en una pantalla con esas fotos recién subidas (con selección múltiple y sus acciones habituales) en vez de en el capítulo de destino; al volver, se recupera la pantalla desde la que se inició la subida.
- La ficha de una persona vuelve a tener una pestaña "Recuerdos", entre "Fotos" y "Biografía", con los recuerdos de las fotos en las que esa persona está etiquetada.
- En la selección múltiple de fotos, ahora se puede borrar el lote seleccionado de una vez, pidiendo un único motivo para todas ellas.
- Al ver una foto, ahora aparece debajo de las personas etiquetadas el capítulo al que pertenece, y se puede tocar para ir directamente a él (salvo si ya se está viendo dentro de ese mismo capítulo).
- Al volver de un capítulo al listado del baúl, ahora se recupera el punto de scroll en el que se estaba antes de entrar, en vez de volver siempre arriba del todo.
- Al mover una o varias fotos a otro capítulo, si se busca un capítulo que no existe todavía aparece una opción "Nuevo capítulo" con el texto buscado: al elegirla y confirmar se crea ese capítulo y se mueven las fotos a él directamente, sin pasos adicionales.

### Cambiado

- En la pantalla de un capítulo, la pestaña "Fotos" es ahora la primera y la seleccionada por defecto, seguida de "Recuerdos".
- En la pantalla "Invitar a la familia", las personas se listan ahora primero las que aún no han sido invitadas y luego las que ya están en el baúl, en orden alfabético dentro de cada grupo. En los menús para etiquetar personas, en cambio, se listan primero las que ya están en el baúl y luego las que están pendientes de invitación, también en orden alfabético dentro de cada grupo.
- En el visor de fotos, en móvil la foto ahora ocupa toda la pantalla y el panel de recuerdos aparece plegado como una hoja desplegable desde abajo; en escritorio se mantiene como antes, siempre visible junto a la foto.
- El email de bienvenida y el resumen semanal ahora saludan solo por el nombre de pila (por ejemplo, "Hola Pedro"), en vez de por el nombre completo.
- El resumen semanal por email y las notificaciones push de novedades ahora indican quién ha añadido cada novedad (por ejemplo, "Tita Loli añadió 3 recuerdos nuevos"), en vez de mostrar solo el número.
- Se ha renovado el contenido del email de bienvenida (tanto para quien entra por primera vez como para quien llega invitado a un baúl), que ahora incluye un vídeo de presentación de El Baúl.
- Se ha rediseñado la navegación de la cuenta y los ajustes del baúl: "Mi cuenta" (perfil, notificaciones y cerrar sesión) y "Ajustes del baúl" (portada, información, solicitudes de eliminación y eliminar baúl) ahora son pantallas propias accesibles desde el menú "···" del baúl, en vez de menús emergentes.
- En la pantalla de invitación a un baúl, ahora solo hay un botón ("Unirme al Baúl") y siempre pasa por la presentación de El Baúl antes de aceptar la invitación; antes se podía saltar directamente sin verla.
- La pestaña "Biografía" de la ficha de una persona pasa a activarse de forma gradual: mientras no esté disponible para tu baúl no aparecerá, y el asistente de IA tampoco tendrá en cuenta ese contenido.
- "Invitar a la familia" ya no muestra un único enlace para todo el baúl: ahora es una pantalla con la lista de personas del baúl, cada una con su propio botón "Invitar" para enviarle un enlace de invitación solo para ella. Al final hay un botón "Invitar a otra persona" para dar de alta a alguien que todavía no está en la lista. El estado "Sin acceso" desaparece: una persona está dentro del baúl o no lo está, y "Revocar acceso" ahora invalida su enlace de invitación (se le puede volver a invitar más adelante). La opción "Gestionar acceso" pasa a llamarse "Gestionar permisos".
- En la pestaña "Familia", las personas vuelven a aparecer agrupadas en dos bloques: "Miembros del baúl" y "Otras personas", en orden alfabético dentro de cada uno; tú siempre apareces primero en "Miembros del baúl".

### Eliminado

- La card "Fotos sueltas" de la pestaña "Capítulos" y su pantalla de listado: ese mismo contenido se ve ahora filtrando "Sin capítulo" en la pestaña "Fotos" del baúl.
- La opción "Seleccionar fotos" del menú "···" de un capítulo: la selección múltiple se activa igual que siempre tocando una foto o el título de un grupo de fecha.

### Arreglado

- En la pestaña "Fotos" del baúl, con el filtro "Sin capítulo" activo, al tocar una foto ahora se abre correctamente; antes no pasaba nada (aunque la URL cambiaba) hasta cambiar al filtro "Todas".
- La pantalla de fotos de una subida ya no depende de que la funcionalidad de "Historia" esté activada; antes fallaba si esa funcionalidad estaba desactivada.
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

## Versiones anteriores

Ver [`CHANGELOG-ARCHIVE.md`](./CHANGELOG-ARCHIVE.md) para el histórico de la
fase alfa (`alpha-v0.0.0-*`, previa a `beta-v0.1.0`).
