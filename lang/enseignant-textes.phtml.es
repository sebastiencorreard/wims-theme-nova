!! Nova : textes de nova.js en clair (es), lus par !read themes/$wims_theme/lang/enseignant-textes.phtml.$lang <etiquette>.
!! Aucun nom de variable WIMS (tampon des noms de 32 Ko par page, src/var.c ; 2026-11-12). Encodage latin-1.
!! Un texte = un attribut dans fr, en, es, it (verifier.sh compare les etiquettes et les attributs).
!goto $wims_read_parm

:acces_classe
!! _widgets/acces-classe.phtml
<template id="nova-acces" data-titre-jour="Horas prohibidas, cada día" data-aide-jour="Tus alumnos no podrán hacer ejercicios ni consultar recursos durante estas horas. La página de inicio y las notas siguen accesibles." data-de="De" data-a="a" data-lendemain="día siguiente" data-retirer-plage="Quitar esta franja" data-ajouter-plage="Añadir una franja" data-nuit="De noche: de 20:30 a 7:00" data-titre-periodes="Periodos prohibidos" data-aide-periodes="Una sola vez, entre dos fechas: un fin de semana de exámenes, una semana de vacaciones..." data-du="Del" data-au="al" data-heure-debut="Hora de inicio" data-heure-fin="Hora de fin" data-retirer-periode="Quitar este periodo" data-ajouter-periode="Añadir un periodo" data-incomplet="incompleto: ignorado" data-titre-portee="Qué se prohíbe" data-tout="Todo el trabajo en la clase" data-exo="Solo los ejercicios" data-titre-resume="Resumen" data-resume-tout="El trabajo en la clase está prohibido %1." data-resume-exo="Los ejercicios están prohibidos %1." data-chaque-jour="cada día de %1 a %2" data-chaque-jour-lendemain="cada día de %1 a %2 del día siguiente" data-periode="del %1 a las %2 al %3 a las %4" data-aucune="Ninguna restricción: tus alumnos pueden trabajar a cualquier hora." data-lignes="Líneas escritas para WIMS" data-expert="Ajuste experto (otras reglas, direcciones IP...)" data-expert-n="Ajuste experto: %1 regla(s) escrita(s) a mano" data-expert-aide="El campo de WIMS. Las reglas escritas a mano se conservan; las reglas de este formulario están entre las líneas «# Nova : debut» y «# Nova : fin». Una regla repetida se escribe una sola vez."></template>
!exit

:avatars_classe
!! _widgets/avatars-classe.phtml
<section id="nova-avatars" aria-labelledby="nova-avatars-titre" data-script="themes/$wims_theme/js/avatar.js"
  data-t-resume="Alumnos: %n · con avatar: %a · sin avatar: %s" data-t-gagnees="Monedas ganadas" data-t-depensees="Gastadas"
  data-t-dispo="Disponibles" data-t-elements="Elementos desbloqueados: %n" data-t-exercices="Ejercicios logrados contados: %n" data-t-niveau="niv. %n"
  data-t-sans="Todavía no hay avatar guardado." data-t-attente="Monedas disponibles: %n" data-t-precedent="Anterior" data-t-suivant="Siguiente"
  data-t-fermer="Cerrar" data-t-enregistrer="Guardar el avatar (.svg)" data-classe="$nova_avk" data-avatar="$nova_avb"
  data-t-afficher="Mostrar:" data-t-avatar="Avatar" data-t-aucun="ninguna insignia" data-t-eleves="Alumnos: %n" data-t-jeton="%n moneda" data-t-jetons="%n monedas"
  data-t-fidelite="$nova_fid_nom" data-t-perseverance="$nova_per_nom" data-t-echauffement="$nova_ech_nom" data-t-top="$nova_top_nom">
!exit

:capacite
!! _widgets/capacite.phtml
<template id="nova-capacite-textes" data-sur="%u de %t (%p %)" data-plein="La clase se acerca a su capacidad máxima."></template>
!exit

:config_globale
!! _widgets/config-globale.phtml
<template id="nova-cg-textes" data-plus="Más ajustes (%1)" data-moins="Menos ajustes" data-modifie="modificado" data-defaut="Ajustes predeterminados de WIMS"></template>
!exit

:confirmations
!! _widgets/confirmations.phtml
<template id="nova-confirm-textes" data-activer-sheet="¿Activar la hoja %1?" data-activer-exam="¿Activar el examen %1?" data-effacer-sheet="¿Borrar la hoja %1?" data-effacer-exam="¿Borrar el examen %1?" data-effacer-freework="¿Borrar el trabajo libre %1?" data-effacer-doc="¿Borrar el documento %1?" data-effacer-tool="¿Borrar la herramienta %1?" data-travail-sheet="Los alumnos ya han trabajado en la hoja %1" data-desactiver-sheet="¿Desactivar la hoja %1?" data-desactiver-exam="¿Desactivar el examen %1?" data-desactiver-freework="¿Desactivar el trabajo libre %1?" data-refus-sheet="La hoja %1 no se puede desactivar" data-refus-exam="El examen %1 no se puede desactivar" data-refus-freework="El trabajo libre %1 no se puede desactivar" data-wims-refuse="WIMS se niega" data-comptes="%1 cuentas ya han trabajado" data-fw-effacer="Es definitivo: la tarea y los archivos entregados se borran." data-b-activer="Activar" data-b-effacer="Borrar" data-b-desactiver="Desactivar" data-b-scores="Borrar las notas y desactivar" data-b-fermer="Cerrar" data-b-annuler="Cancelar" data-b-page="Abrir la página de WIMS" data-erreur="WIMS no ha respondido: no se ha hecho nada. Inténtelo de nuevo."></template>
!exit

:desactiver_1
!! _widgets/desactiver.phtml
<span id="nova-forcer" hidden data-examen="$nova_fs" data-point-examen="Los ejercicios de esta hoja se usan en un examen: cambiarlos también cambia ese examen y las notas de sus alumnos." data-point-commence="Los alumnos ya lo han empezado: sus notas se conservan. No lo desactive mientras un alumno lo está haciendo." data-type="$nova_ft" data-n="$nova_fn" data-bouton="Desactivar de todos modos..." data-titre="$(nova_forcer_titre_$nova_fk)" data-points="$(nova_forcer_points_$nova_fk)" data-ok="Desactivar de todos modos" data-annuler="Cancelar" data-sauver="Descargar primero una copia de seguridad de la clase" data-sauver-aide="Alumnos, notas, hojas, exámenes... todo lo necesario para restaurarla si hace falta (Configuración, Copia de seguridad y restauración)." data-ok-sauver="Hacer la copia y desactivar" data-etape1="Preparando la copia de seguridad de la clase..." data-etape2="Descarga: %1" data-etape3="Desactivación" data-echec="La copia de seguridad ha fallado: no se ha desactivado nada." data-reessayer="Reintentar" data-sans="Desactivar sin copia de seguridad"></span>
!exit

:desactiver_2
!! _widgets/desactiver.phtml
<span id="nova-forcer" hidden data-reglage="1" data-refus="La desactivación a pesar del uso compartido no está permitida en esta clase. Un profesor puede permitirla en Ajustes de Nova, pestaña Apariencia (« Desactivar a pesar del uso compartido »)."></span>
!exit

:ecarts_zones_1
!! _widgets/ecarts-zones.phtml
<ul id="nova-ecarts" hidden data-titre="%n zonas dependientes no usan estos ajustes %q" data-titre1="1 zona dependiente no usa estos ajustes %q" data-texte="Tienen sus propios ajustes: una copia antigua, o un ajuste hecho en la zona." data-texte1="Tiene sus propios ajustes: una copia antigua, o un ajuste hecho en la zona." data-quoi-apparence="de Nova (visualización, alumnos, avanzados)" data-quoi-badges="de Nova (deberes WIMS, insignias)" data-quoi-tout="de Nova" data-voir="Ver las zonas" data-appliquer="Aplicar estos ajustes a todas las zonas" data-plus-tard="Más tarde" data-attente="Guarda primero tus cambios y luego aplícalos a las zonas.">$nova_ez</ul>
!exit

:ecarts_zones_2
!! _widgets/ecarts-zones.phtml
<ul id="nova-ecarts-acces" hidden data-enregistre="Restricción de acceso guardada." data-question="%1 zonas dependientes tienen otra restricción de acceso. ¿Aplicarles esta?" data-question1="Una zona dependiente tiene otra restricción de acceso. ¿Aplicarle esta?" data-texte="Su restricción actual se sustituirá por esta, reglas escritas a mano incluidas." data-voir="Ver las zonas" data-appliquer="Aplicar a las %1 zonas" data-appliquer1="Aplicar a esta zona" data-non="No, solo aquí" data-attente="Aplicando..." data-fait="Restricción aplicada a las %1 zonas dependientes." data-fait1="Restricción aplicada a la zona dependiente." data-erreur="No se ha podido aplicar la restricción a las zonas. Usa «Zonas dependientes» de la configuración.">$nova_ea</ul>
!exit

:fiche_ressource
!! _widgets/fiche-ressource.phtml
<template id="nova-fiche-textes" data-f0="Invisible para los alumnos. Todavía puede añadir, quitar y modificar los ejercicios." data-f1="Los alumnos la ven y sus notas se registran." data-f2="Los alumnos todavía la ven, pero sus notas ya no se registran." data-f3="Los alumnos ya no la ven; sus notas ya no se registran." data-f4="Los alumnos ya no la ven." data-e0="Invisible para los alumnos. Todavía puede añadir, quitar y modificar los ejercicios." data-e1="Los alumnos pueden hacerlo y sus notas se registran." data-e2="Los alumnos todavía lo ven, pero sus notas ya no se registran." data-e3="Los alumnos ya no lo ven; sus notas ya no se registran." data-e4="Los alumnos ya no lo ven." data-avances="Opciones avanzadas" data-cut-aide="Un alumno que empezó el examen antes de una hora de corte ya no puede abrir una nueva sesión después de ella." data-cut-le="El" data-cut-a="a las" data-cut-ajouter="Añadir una hora de corte" data-cut-retirer="Quitar esta hora de corte" data-cut-aucune="Ninguna hora de corte." data-cut-expert="Ajuste experto: lo que ve WIMS" data-cut-format="Las horas de corte tal como las lee WIMS: aaaammdd.hh:mm, separadas por espacios." data-com-ecrire="Escribir un comentario" data-com-modifier="Modificar el comentario" data-com-replier="Ocultar el editor"></template>
!exit

:statuts_ressources
!! _widgets/statuts-ressources.phtml
<template id="nova-statuts-textes" data-activer="Activar" data-reactiver="Reactivar" data-activer-f="Los alumnos la ven y sus notas se registran." data-activer-e="Los alumnos pueden hacerlo y sus notas se registran." data-activer-d="Los alumnos pueden entregar su trabajo." data-vide="Añada primero un ejercicio." data-expirer-f="Sigue visible; las nuevas notas ya no se registran." data-expirer-e="Los alumnos ya no pueden hacerlo; las notas se conservan." data-expirer-d="No más entregas; rechazado si quedan copias sin corregir." data-cacher="Desaparece de la página de los alumnos." data-montrer="Vuelve a aparecer en la página de los alumnos." data-reactiver-n="Las notas vuelven a registrarse." data-reactiver-d="Las entregas se reabren." data-desactiver="Vuelve a preparación; aviso si los alumnos ya han trabajado." data-effacer="Definitivo; se pide confirmación." data-archiver="Congela la tarea; ya no podrá reactivarse."></template>
!exit
