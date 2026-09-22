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

- Desde "Editar relaciones" en la ficha de una persona, ahora se pueden añadir o quitar relaciones de padre/madre e hijo/hija con otras personas del baúl. La ficha de persona muestra una nueva pestaña "Familia" con sus padres e hijos, cada uno navegable a su propia ficha.
- "Editar relaciones" permite ahora asignar también el cónyuge de una persona (como máximo uno, ya que El Baúl representa familias monógamas). En el árbol genealógico, los cónyuges aparecen en la misma fila, unidos por un conector con dos anillos entrelazados.
- En la pestaña "Historia" de un baúl, quien puede invitar a la familia ve ahora un aviso mientras queden personas por invitar, con acceso directo a "Invitar a la familia". Al ocultarlo, no vuelve a aparecer hasta la próxima vez que se abre la app.
- La pestaña "Familia" del baúl ahora tiene un selector Mosaico / Árbol genealógico. El árbol genealógico representa gráficamente las relaciones de padre/madre e hijo/hija entre las personas del baúl, organizadas por generaciones y navegable con scroll o arrastre; tocar una persona abre su ficha. Las personas sin relaciones familiares siguen disponibles solo en Mosaico. La vista elegida se recuerda para la próxima visita.
- Nueva pantalla "Mis fotos", accesible desde el selector de baúles (ahora con una sección "Personal" además de "Mis baúles"): muestra, en un único lugar, todas las fotos que has subido a cualquiera de tus baúles, sin repetir la misma foto si aparece en varios. Al abrir una foto desde aquí se indica en qué baúles aparece.
- Desde "Mis fotos", ahora se puede añadir una foto a otro baúl al que tengas acceso, sin volver a subirla: al abrirla, "Aparece en" permite elegir un baúl adicional donde mostrarla.
- "Mis fotos" ahora tiene su propio botón para subir fotos directamente, sin elegir ni crear un baúl primero: se puede decidir más adelante en qué baúl compartirlas, con el mismo selector de fotos y progreso de subida de siempre. Un nuevo filtro "Sin compartir" muestra las fotos que todavía no están en ningún baúl. Al ver una foto que aún no aparece en ningún baúl, se ofrece añadirla a uno directamente desde el visor.
- Desde "Mis fotos" ahora se puede quitar una foto de esta galería personal ("Quitar de Mis fotos"), tanto una a una como seleccionando varias a la vez. La foto sigue apareciendo con normalidad en los baúles donde ya esté compartida, y se puede volver a guardar en Mis fotos más adelante.
- Al ver una foto dentro de un baúl (una a una o en selección múltiple), ahora se puede "Guardar en Mis fotos" para tenerla también en tu galería personal, sin duplicar el archivo ni afectar a la foto original del baúl.
- Al ver una foto en el móvil, ahora la barra inferior muestra un pequeño icono junto a las personas etiquetadas cuando la foto tiene recuerdos, sin necesidad de desplegar el panel para saberlo.
- En la app de Android, el selector de baúles tiene ahora una nueva entrada personal "En este dispositivo" que muestra las fotos del propio móvil (pidiendo permiso de acceso si hace falta), sin necesidad de subirlas antes a El Baúl.
- "En este dispositivo" ahora muestra primero las carpetas de fotos del móvil, con su portada y número de fotos; al entrar en una se ven solo las fotos de esa carpeta.
- Ahora se puede tocar una foto en "En este dispositivo" para verla a pantalla completa, con el mismo visor que el resto de la app.
- En "Mi cuenta" ahora se muestra la versión de la app, al final de la pantalla.

### Arreglado

- En "Editar relaciones" de una persona, el buscador para añadir una nueva relación de padre/madre, hijo/hija o cónyuge ya no ofrece a personas con las que ya existe esa relación.
- Al ver una foto apaisada a pantalla completa en el móvil, girar el teléfono a horizontal ya no la encoge: ahora aprovecha el ancho extra en vez de pasar al diseño de escritorio (con panel lateral) en móviles grandes cuya pantalla en horizontal es ancha pero sigue siendo baja.
- El punto de "novedades" del selector de baúles (y los avisos de contenido nuevo en la Historia) ahora es único por persona y se comparte entre todos tus dispositivos: lo que ya has visto en un móvil deja de aparecer como nuevo cuando entras desde otro. Antes cada dispositivo llevaba su propia cuenta y un baúl ya visitado volvía a marcarse como nuevo al abrirlo desde otro sitio.
- "Mover a otro capítulo" ya aparece siempre en el menú del visor de fotos: antes faltaba al ver una foto desde la pestaña "Fotos" del baúl o desde la ficha de una persona, y también desaparecía al ver una foto de un capítulo si el baúl no tenía ningún otro capítulo al que moverla (ahora se puede crear uno nuevo desde el mismo selector).
- Al elegir una foto desde Google Fotos en el selector de archivos de Android, la miniatura de previsualización antes de subirla ya no aparece completamente negra en algunos móviles.
- Al seleccionar muchas fotos para subir, el botón "Subir fotos" ahora se queda siempre visible en la parte inferior de la pantalla en vez de quedar oculto debajo de la cuadrícula de fotos seleccionadas.
- En "Mis fotos", el panel de información de una foto ya no se llama "Recuerdos" ni muestra el aviso "Sé el primero en añadir un recuerdo": ahora se llama "Información" y solo muestra la fecha, las personas etiquetadas y en qué baúles aparece, ya que en Mis fotos no se pueden añadir recuerdos.
- Al seleccionar varias fotos en "Mis fotos" y añadirlas todas a un baúl a la vez, ya no aparece un error de conexión que solo añadía la primera foto y dejaba el resto sin añadir: ahora se añaden correctamente todas las fotos seleccionadas.
- En "En este dispositivo", el scroll infinito ya no pinta las fotos recién cargadas por encima de las que ya se veían: ahora se mantienen ordenadas de más reciente a más antigua, igual que se piden al dispositivo.

### Cambiado

- En la pestaña "Capítulos" de un baúl sin capítulos, el texto vacío ahora explica qué es un capítulo y anima a crear el primero, en vez de decir que el baúl está vacío.
- En la pestaña "Fotos" de un baúl, el filtro ahora empieza mostrando "Todas" las fotos del baúl en vez de solo las que no tienen capítulo, y "Todas" pasa a ser la primera opción. "Sin capítulo" sigue disponible como segunda opción, y la elección se mantiene mientras dure la sesión.
- Al etiquetar personas en una foto (desde el visor, la selección múltiple o la sugerencia "¿Quién sale en esta foto?"), ahora se puede buscar por nombre y crear una persona nueva sin salir del selector, sin necesidad de cerrarlo para ir a "Familia". Las personas ya etiquetadas se muestran como chips arriba de la lista en vez de mezcladas con el resto.
- En "Editar relaciones" de una persona, ahora hay un botón "Añadir" independiente junto a cada sección (Padres, Hijos, Cónyuge) en vez de un único botón que primero pedía elegir el tipo de relación. Cada botón lleva directamente a buscar y añadir a la persona correspondiente, y deja de mostrarse cuando esa relación ya no admite más personas (por ejemplo, al llegar a 2 padres o al tener ya un cónyuge asignado), volviendo a aparecer si se elimina alguna.
- En "Editar relaciones" de una persona, el buscador para añadir una relación ahora permite marcar varias personas a la vez y añadirlas todas con un solo "Añadir", en vez de tener que repetir la búsqueda para cada una. Al añadir padre/madre deja de poder marcarse más gente en cuanto se llegan a 2 en total; al añadir cónyuge sigue admitiendo como máximo uno; al añadir hijos no hay límite.

## [beta-v0.4.4] - 2026-08-28

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

## Versiones anteriores

Ver [`CHANGELOG-ARCHIVE.md`](./CHANGELOG-ARCHIVE.md) para el histórico de la
fase alfa (`alpha-v0.0.0-*`, previa a `beta-v0.1.0`).
