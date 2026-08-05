# Changelog — histórico

Versiones antiguas movidas fuera de [`CHANGELOG.md`](./CHANGELOG.md) para que
ese archivo se mantenga corto y legible. Ver ese fichero para el formato y
las versiones recientes.

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
