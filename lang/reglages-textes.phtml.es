!! Nova : textes de nova.js en clair (es), lus par !read themes/$wims_theme/lang/reglages-textes.phtml.$lang <etiquette>.
!! Aucun nom de variable WIMS (tampon des noms de 32 Ko par page, src/var.c ; 2026-11-12). Encodage latin-1.
!! Un texte = un attribut dans fr, en, es, it (verifier.sh compare les etiquettes et les attributs).
!goto $wims_read_parm

:apparence_classe_1
!! _widgets/apparence-classe.phtml
<template id="nova-reglages-classe" data-logo-afficher="Mostrar un logotipo" data-logo-wims="Logotipo WIMS animado, con el color del tema" data-logo-image="Dirección (URL) de la imagen de su logotipo: PNG, JPG o SVG, que empiece por https://" data-logo-exemple="https://ejemplo.es/logo.png" data-titre="Ajustes de Nova" data-enregistre="Ajustes de Nova guardados." data-lien="Los ajustes del tema Nova (visualización, alumnos, deberes WIMS, insignias...) tienen su propia página:" data-lien-texte="Ajustes de Nova" data-erreur-vacances="Línea no comprendida (se espera: DD/MM/AAAA - DD/MM/AAAA):" data-mots-defaut="valor por defecto" data-mots-retirer="Quitar" data-mots-ajouter="Añadir" data-mots-placeholder="Nueva palabra" data-mots-retablir="Volver al valor por defecto" data-vac-noms="Todos los Santos,Navidad,Invierno,Primavera,Verano" data-vac-ete="desde el %d" data-vac-manque="Nova todavía no conoce las fechas de %a: actualiza Nova o elige fechas personalizadas." data-vac-zone="$nova_app_vac_zone" data-vac-resume-aucune="Sin vacaciones: el objetivo semanal se muestra todo el año." data-vac-herite-de="%h: %v" data-sans-effet="pr_bgcolor,pr_bgimg,pr_ref_menucolor,pr_ref_button_bgcolor,pr_ref_button_color,pr_ref_button_help_bgcolor,pr_ref_button_help_color,pr_sccolor1,pr_actcolor1,pr_css,pr_homepage" data-sans-effet-ligne="wims_deposit" data-champ-theme="pr_refcolor" data-couleur-theme="$nova_app_couleur_theme" data-masques="se ocultan los ajustes sin efecto en el tema Nova o raramente útiles." data-afficher="Mostrarlos" data-masquer="Ocultarlos">
!exit

:apparence_classe_2
!! _widgets/apparence-classe.phtml
              <option value="" data-texte="%s (heredado)">$nova_bdg_coul_herite_vide</option>
!exit

:apparence_classe_3
!! _widgets/apparence-classe.phtml
              <option value="" data-texte="%s (heredado)">$nova_bdg_coul_herite_vide</option>
!exit

:apparence_classe_4
!! _widgets/apparence-classe.phtml
              <option value="" data-texte="%s (heredado)">$nova_bdg_coul_herite_vide</option>
!exit

:apparence_classe_5
!! _widgets/apparence-classe.phtml
              <option value="" data-texte="%s (heredado)">$nova_bdg_coul_meme_badge</option>
!exit

:apparence_classe_6
!! _widgets/apparence-classe.phtml
              <option value="" data-texte="%s (heredado)">$nova_bdg_coul_herite_vide</option>
!exit

:apparence
!! _widgets/apparence.phtml
<template id="nova-apparence" data-sans-effet="$nova_sans" data-champ-theme="$nova_theme" data-couleur-theme="$nova_app_couleur_theme" data-masques="se ocultan los ajustes sin efecto en el tema Nova o raramente útiles." data-afficher="Mostrarlos" data-masquer="Ocultarlos">
!exit

:aide_couleur
!! _widgets/apparence-classe.phtml, apparence.phtml : aide repliee du reglage (2026-11-25)
<details class="nova-app-detail nova-app-aide-detail" data-bouton="$wims_name_help" data-fermer="Cerrar"><summary>$nova_std_changements</summary><ul><li>Color de acento de Nova: barra superior, botones, enlaces, pestañas, títulos de las tarjetas.</li><li>Es el mismo valor que «Color del tema» de la página Apariencia de WIMS: cambiar uno cambia el otro.</li><li>Sin color elegido: el del portal, de la agrupación o del sitio; si no, el ciruela de Nova.</li><li>Sin cambios: los colores de estado (verde logrado, naranja en curso, rojo) y el color que un alumno eligió en «Mi color».</li></ul></details>
!exit

:aide_animations
!! _widgets/apparence-classe.phtml, apparence.phtml : aide repliee du reglage (2026-11-25)
<details class="nova-app-detail nova-app-aide-detail" data-bouton="$wims_name_help" data-fermer="Cerrar"><summary>$nova_std_changements</summary><ul><li>Sí: menús, ventanas y bloques plegados se abren deslizándose; aparecen estrellas tras una respuesta correcta y el teléfono vibra; la guirnalda de diciembre centellea.</li><li>No (por defecto): todo aparece de golpe, sin movimiento.</li><li>Siempre desactivadas en un dispositivo configurado para reducir el movimiento.</li><li>Sin cambios: el reloj de arena de una acción en curso sigue girando, y la ganancia de monedas del avatar sigue animada.</li></ul></details>
!exit

:aide_clavier
!! _widgets/apparence-classe.phtml, apparence.phtml : aide repliee du reglage (2026-11-25)
<details class="nova-app-detail nova-app-aide-detail" data-bouton="$wims_name_help" data-fermer="Cerrar"><summary>$nova_std_changements</summary><ul><li>Sí: en teléfono y tableta, tocar un campo de respuesta de un ejercicio abre un teclado matemático en lugar del del dispositivo: cifras, operaciones, paréntesis, cuadrado, cubo, raíz cuadrada, potencia de 10, flechas y borrar.</li><li>La tecla «ABC» devuelve el teclado del dispositivo, para escribir letras.</li><li>No (por defecto): el teclado del dispositivo, como con el tema estándar.</li><li>Sin cambios: en el ordenador, ningún teclado en pantalla.</li></ul></details>
!exit

:aide_fil
!! _widgets/apparence-classe.phtml, apparence.phtml : aide repliee du reglage (2026-11-25)
<details class="nova-app-detail nova-app-aide-detail" data-bouton="$wims_name_help" data-fermer="Cerrar"><summary>$nova_std_changements</summary><ul><li>Sí (por defecto): en pantalla grande, la ruta de navegación de profesores y administradores queda bajo la barra superior al desplazar la página.</li><li>No: se desplaza con la página, como con el tema estándar.</li><li>Sin cambios: en el teléfono, la ruta siempre se desplaza; los alumnos no tienen ruta de navegación, sino un botón «Volver».</li></ul></details>
!exit

:aide_deco
!! _widgets/apparence-classe.phtml, apparence.phtml : aide repliee du reglage (2026-11-25)
<details class="nova-app-detail nova-app-aide-detail" data-bouton="$wims_name_help" data-fermer="Cerrar"><summary>$nova_std_changements</summary><ul><li>Sí (por defecto): en diciembre, una guirnalda luminosa en lo alto de la barra superior, detrás de los botones, y copos de nieve en filigrana.</li><li>La guirnalda solo centellea si las animaciones están activadas.</li><li>Nunca durante un examen.</li><li>No: barra sin decoración todo el año.</li></ul></details>
!exit

:aide_entree
!! _widgets/apparence-classe.phtml, apparence.phtml : aide repliee du reglage (2026-11-25)
<details class="nova-app-detail nova-app-aide-detail" data-bouton="$wims_name_help" data-fermer="Cerrar"><summary>$nova_std_changements</summary><ul><li>Sí (por defecto): un alumno que solo tiene un curso (portal) o una clase (agrupación) entra directamente tras conectarse, si la página de inicio de la estructura no tiene nada más que mostrarle (ni trabajo, ni mensaje).</li><li>Si vuelve a la página de inicio de la estructura por la ruta de navegación, se queda en ella.</li><li>No: llega a la página de inicio de la estructura y elige su curso, como con el tema estándar.</li><li>Sin efecto en una clase independiente.</li></ul></details>
!exit

:aide_masques
!! _widgets/apparence-classe.phtml, apparence.phtml : aide repliee du reglage (2026-11-25)
<details class="nova-app-detail nova-app-aide-detail" data-bouton="$wims_name_help" data-fermer="Cerrar"><summary>$nova_std_changements</summary><ul><li>Comunicación marcada: la sección «Comunicación» (foro, «Escribir al profesor») desaparece del menú de los alumnos.</li><li>Enlaces externos marcados: la sección de otras clases y enlaces a la plataforma del centro desaparece, entera, del menú de los alumnos.</li><li>Nada marcado: menú de los alumnos completo, como con el tema estándar.</li><li>Sin cambios: el menú del profesor. Solo cambia el menú: las páginas siguen abiertas.</li></ul></details>
!exit

:aide_moyenne
!! _widgets/apparence-classe.phtml, apparence.phtml : aide repliee du reglage (2026-11-25)
<details class="nova-app-detail nova-app-aide-detail" data-bouton="$wims_name_help" data-fermer="Cerrar"><summary>$nova_std_changements</summary><ul><li>Sí (por defecto): al principio de «Mis notas», una tarjeta muestra la media del alumno y, para la clase, el mínimo, la media y el máximo.</li><li>La misma tarjeta aparece en el detalle de un alumno visto por el profesor.</li><li>No: se quita la tarjeta; las notas de exámenes y hojas siguen visibles.</li></ul></details>
!exit

:aide_seuil
!! _widgets/apparence-classe.phtml, apparence.phtml : aide repliee du reglage (2026-11-25)
<details class="nova-app-detail nova-app-aide-detail" data-bouton="$wims_name_help" data-fermer="Cerrar"><summary>$nova_std_changements</summary><ul><li>Un ejercicio está «Logrado» (punto verde) cuando el indicador del baremo de su hoja supera esta parte de los puntos pedidos.</li><li>90 (por defecto): la regla de WIMS. Más bajo, el alumno ve antes sus ejercicios logrados.</li><li>«Brillantemente logrado» (estrella): logrado, con una calidad superior a 9.</li><li>La misma regla vale en la página de inicio, en las secuencias y en la página de una hoja.</li><li>Sin cambios: las notas, calculadas por WIMS como siempre.</li><li>Campo vacío: valor del portal, de la agrupación o del sitio.</li></ul></details>
!exit

:aide_activite
!! _widgets/apparence-classe.phtml, apparence.phtml : aide repliee du reglage (2026-11-25)
<details class="nova-app-detail nova-app-aide-detail" data-bouton="$wims_name_help" data-fermer="Cerrar"><summary>$nova_std_changements</summary><ul><li>Sí (por defecto): «Mi actividad» del menú del alumno abre una página sencilla de Nova: días de trabajo de la semana, objetivo, tiempo de trabajo, últimas notas.</li><li>Un alumno que trabaja menos días que el umbral elegido recibe ánimo; más allá de las horas elegidas, se le invita a hacer pausas.</li><li>Durante las vacaciones elegidas, la página no fija objetivo.</li><li>No: la página de WIMS (gráficos), como con el tema estándar.</li></ul></details>
!exit

:aide_dm_mots
!! _widgets/apparence-classe.phtml, apparence.phtml : aide repliee du reglage (2026-11-25)
<details class="nova-app-detail nova-app-aide-detail" data-bouton="$wims_name_help" data-fermer="Cerrar"><summary>$nova_std_changements</summary><ul><li>Un examen es un deber WIMS cuando su título contiene una de estas palabras, seguida o no de un número («DMWIMS03»).</li><li>Nova lo usa para el botón «Deber calificado» de tu página de inicio y para las insignias Calentamiento y En la cima.</li><li>Acentos y mayúsculas no cuentan. Por defecto: DMWIMS, DM.</li><li>Sin cambios: los exámenes en sí; solo se lee su título.</li></ul></details>
!exit

:aide_dm_note
!! _widgets/apparence-classe.phtml, apparence.phtml : aide repliee du reglage (2026-11-25)
<details class="nova-app-detail nova-app-aide-detail" data-bouton="$wims_name_help" data-fermer="Cerrar"><summary>$nova_std_changements</summary><ul><li>Un deber WIMS cuyo título contiene además una de estas palabras es un deber calificado.</li><li>El botón «Deber calificado» pone una de estas palabras en el título del examen que crea.</li><li>Insignia En la cima: solo cuentan los deberes calificados. Insignia Calentamiento: las sesiones de entrenamiento cuentan antes de la primera apertura del deber calificado.</li><li>Por defecto: noté, test.</li></ul></details>
!exit

:aide_dm_ent
!! _widgets/apparence-classe.phtml, apparence.phtml : aide repliee du reglage (2026-11-25)
<details class="nova-app-detail nova-app-aide-detail" data-bouton="$wims_name_help" data-fermer="Cerrar"><summary>$nova_std_changements</summary><ul><li>Un deber WIMS cuyo título contiene además una de estas palabras es un deber de práctica.</li><li>Un deber de práctica y su deber calificado van juntos cuando tienen el mismo contenido; si no, cuando sus títulos son idénticos salvo esta palabra.</li><li>El botón «Deber calificado» aparece junto a un deber de práctica que aún no tiene su deber calificado.</li><li>Por defecto: entrainement (acentos ignorados).</li></ul></details>
!exit

:aide_dm_essais
!! _widgets/apparence-classe.phtml, apparence.phtml : aide repliee du reglage (2026-11-25)
<details class="nova-app-detail nova-app-aide-detail" data-bouton="$wims_name_help" data-fermer="Cerrar"><summary>$nova_std_changements</summary><ul><li>Número de sesiones del examen creado por el botón «Deber calificado» de tu página de inicio.</li><li>Por defecto: 3.</li><li>Sin cambios: los deberes calificados ya creados; su número de sesiones se cambia en su página, como siempre.</li></ul></details>
!exit

:aide_badges
!! _widgets/apparence-classe.phtml, apparence.phtml : aide repliee du reglage (2026-11-25)
<details class="nova-app-detail nova-app-aide-detail" data-bouton="$wims_name_help" data-fermer="Cerrar"><summary>$nova_std_changements</summary><ul><li>Sí: las insignias marcadas se calculan cada vez que el alumno abre la página de inicio; una pastilla «Insignias» junto a «Mis notas» abre su ventana, y un nuevo nivel se anuncia una vez.</li><li>No (por defecto): no se muestra nada a los alumnos.</li><li>Un nivel ganado nunca se pierde, aunque las insignias se desactiven y se vuelvan a activar.</li><li>Nunca en la página de inicio de un portal o de una agrupación (el trabajo se hace en los cursos), ni durante un examen.</li></ul></details>
!exit

:aide_fidelite
!! _widgets/apparence-classe.phtml, apparence.phtml : aide repliee du reglage (2026-11-25)
<details class="nova-app-detail nova-app-aide-detail" data-bouton="$wims_name_help" data-fermer="Cerrar"><summary>$nova_std_changements</summary><ul><li>Marcada: un nivel más según el número de semanas en que el alumno envió respuestas al menos el número de días fijado (1 por defecto).</li><li>Semanas contadas sin obligación de seguir: una semana sin trabajo (enfermedad, vacaciones) no hace perder nada.</li><li>Umbrales por defecto: 2 4 6 9 12 16 20 25 semanas.</li><li>Sin marcar: insignia ni calculada ni mostrada; los niveles ya ganados quedan guardados.</li></ul></details>
!exit

:aide_perseverance
!! _widgets/apparence-classe.phtml, apparence.phtml : aide repliee du reglage (2026-11-25)
<details class="nova-app-detail nova-app-aide-detail" data-bouton="$wims_name_help" data-fermer="Cerrar"><summary>$nova_std_changements</summary><ul><li>Marcada: un ejercicio cuenta cuando el alumno obtiene al menos 7/10 tras al menos 2 notas por debajo de 5/10 (ajustable).</li><li>Las notas de exámenes también cuentan, salvo si la casilla está desmarcada en los ajustes de la insignia.</li><li>Umbrales por defecto: 1 3 5 10 15 20 25 30 ejercicios.</li><li>Sin marcar: insignia ni calculada ni mostrada; los niveles ya ganados quedan guardados.</li></ul></details>
!exit

:aide_echauffement
!! _widgets/apparence-classe.phtml, apparence.phtml : aide repliee du reglage (2026-11-25)
<details class="nova-app-detail nova-app-aide-detail" data-bouton="$wims_name_help" data-fermer="Cerrar"><summary>$nova_std_changements</summary><ul><li>Marcada: un deber WIMS cuenta cuando el alumno ha hecho al menos 2 sesiones completas del entrenamiento (una respuesta a cada ejercicio) antes de abrir el deber calificado por primera vez.</li><li>Deberes reconocidos según la pestaña Deberes WIMS (mismo contenido, o palabras clave de los títulos).</li><li>Umbrales por defecto: 1 3 5 8 12 16 21 26 deberes.</li><li>Sin marcar: insignia ni calculada ni mostrada; los niveles ya ganados quedan guardados.</li></ul></details>
!exit

:aide_top
!! _widgets/apparence-classe.phtml, apparence.phtml : aide repliee du reglage (2026-11-25)
<details class="nova-app-detail nova-app-aide-detail" data-bouton="$wims_name_help" data-fermer="Cerrar"><summary>$nova_std_changements</summary><ul><li>Marcada: un deber calificado cuenta cuando la nota retenida por WIMS alcanza al menos 9/10 (ajustable).</li><li>Deberes calificados reconocidos según la pestaña Deberes WIMS.</li><li>Umbrales por defecto: 1 3 5 8 12 16 21 26 deberes.</li><li>Sin marcar: insignia ni calculada ni mostrada; los niveles ya ganados quedan guardados.</li></ul></details>
!exit

:aide_couleur_perso
!! _widgets/apparence-classe.phtml, apparence.phtml : aide repliee du reglage (2026-11-25)
<details class="nova-app-detail nova-app-aide-detail" data-bouton="$wims_name_help" data-fermer="Cerrar"><summary>$nova_std_changements</summary><ul><li>En el nivel elegido de la insignia elegida, el alumno puede escoger el color de su interfaz («Mi color», menú Perfil) entre diez colores legibles; en el segundo nivel, degradados.</li><li>Sustituye el color del tema solo para él, en toda la clase o la estructura, exámenes incluidos; nunca en las notas, el cronómetro ni los campos.</li><li>Por defecto: color en el nivel 2 de Regularidad, degradados en el nivel 4.</li><li>«nadie»: elección desactivada; los alumnos conservan el color del tema.</li></ul></details>
!exit

:aide_avatar
!! _widgets/apparence-classe.phtml, apparence.phtml : aide repliee du reglage (2026-11-25)
<details class="nova-app-detail nova-app-aide-detail" data-bouton="$wims_name_help" data-fermer="Cerrar"><summary>$nova_std_changements</summary><ul><li>Propuesto: cada alumno compone su avatar («Mi avatar», menú Perfil) y lo ve en la barra superior, con sus monedas.</li><li>Gana monedas logrando ejercicios (al menos 7/10, respuesta enviada al menos 15 s tras abrirlo, una vez al día, 10 ejercicios al día como máximo) y las gasta en elementos del avatar; algunos elementos son recompensas de las insignias.</li><li>Visto solo por el alumno y sus profesores: página «Orla» y lista de participantes.</li><li>No (por defecto): ni avatar ni monedas.</li></ul></details>
!exit

:aide_desact
!! _widgets/apparence-classe.phtml, apparence.phtml : aide repliee du reglage (2026-11-25)
<details class="nova-app-detail nova-app-aide-detail" data-bouton="$wims_name_help" data-fermer="Cerrar"><summary>$nova_std_changements</summary><ul><li>Sí: cuando WIMS se niega a desactivar una hoja o un examen (compartido con otras clases, u hoja usada en un examen), se añade un enlace discreto «Desactivar de todos modos...» bajo la negativa; abre una advertencia y propone primero una copia de seguridad.</li><li>La hoja o el examen queda entonces desactivado en todas las clases que lo comparten; cambiar su contenido desajusta las notas ya registradas.</li><li>El ajuste vuelve solo a No 24 h después de ponerse en Sí: reactívalo si hace falta.</li><li>No (por defecto): la negativa de WIMS, sin otra opción, como con el tema estándar.</li></ul></details>
!exit
