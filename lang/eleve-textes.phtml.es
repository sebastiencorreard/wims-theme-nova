!! Nova : textes de nova.js en clair (es), lus par !read themes/$wims_theme/lang/eleve-textes.phtml.$lang <etiquette>.
!! Aucun nom de variable WIMS (tampon des noms de 32 Ko par page, src/var.c ; 2026-11-12). Encodage latin-1.
!! Un texte = un attribut dans fr, en, es, it (verifier.sh compare les etiquettes et les attributs).
!goto $wims_read_parm

:avatar
!! _widgets/avatar.phtml
<div id="nova-avatar" data-jetons="$nova_aj" data-message="$nova_am" data-choix="$nova_ac" data-elements="$nova_ax" data-regles="$nova_ar" data-niveaux="$nova_an"
  data-script="themes/$wims_theme/js/avatar.js" data-utilisateur="$wims_user"
  data-t-jeton="%n moneda" data-t-jetons="%n monedas" data-t-prochain="%n ejercicios superados más para tu próxima moneda." data-t-prochain1="1 ejercicio superado más para tu próxima moneda."
  data-t-jour="Hoy: %n ejercicios contados, %m como máximo." data-t-enregistrer="Guardar" data-t-hasard="Al azar" data-t-enregistre="Avatar guardado: aparece en la parte superior de tus páginas." data-t-apercu="Vista previa" data-t-enr-bloque="Desbloquea primero el elemento de la vista previa, o haz clic en Cancelar."
  data-t-tire="Elegido entre tus elementos desbloqueados. Guárdalo si te gusta." data-t-premier="Elige tu avatar y guárdalo: aparecerá en la parte superior de tus páginas." data-t-categories="Pelo,Color del sombrero,Navidad,Color del pelo,Piel,Ojos,Cejas,Boca,Gafas,Color de las gafas,Barba,Ropa,Estampado de la camiseta,Color de la ropa,Fondo" data-t-ouverts="%n de %m desbloqueados."
  data-t-motif="Elegir un estampado cambia a la camiseta estampada." data-t-lunettes="Elige también unas gafas (pestaña Gafas) para ver este color en tu avatar." data-t-aucun="Ninguno" data-t-ouvrir="Desbloquear" data-t-annuler="Cancelar"
  data-t-question="¿Desbloquearlo por %n moneda? Queda desbloqueado para siempre." data-t-question2="¿Desbloquearlo por %n monedas? Queda desbloqueado para siempre." data-t-manque="Necesitas %n monedas. ¡Supera algunos ejercicios más!" data-t-manque1="Necesitas 1 moneda. ¡Supera algunos ejercicios más!"
  data-t-badge="Reservado a la insignia %b, nivel %n. Estás en el nivel %m." data-t-badge-off="Reservado a la insignia %b, que tu clase no ofrece." data-t-badge-ok="Desbloqueado por tu insignia %b, nivel %n." data-t-ouvert="¡Desbloqueado!" data-t-refus="No es posible ahora: recarga la página."
  data-t-erreur="No se han podido cargar los dibujos: recarga la página." data-t-regles="Cómo ganar monedas" data-t-regle1="Un ejercicio cuenta cuando lo superas (al menos %n sobre 10)." data-t-regle2="El mismo ejercicio cuenta una vez al día: puedes repetirlo otro día."
  data-t-regle3="Una respuesta enviada en menos de %n segundos no cuenta." data-t-regle4="Cuentan como máximo %n ejercicios al día: mejor un poco cada día." data-t-regle5="Un elemento desbloqueado sigue desbloqueado. Los elementos raros cuestan 2 monedas; los que tienen una estrella son recompensas de insignias."
  data-t-leg1="1 moneda para desbloquear" data-t-leg2="raro: 2 monedas" data-t-leg3="recompensa de insignia"
  data-t-fidelite="$nova_fid_nom" data-t-perseverance="$nova_per_nom" data-t-echauffement="$nova_ech_nom" data-t-top="$nova_top_nom"
  data-t-niveaux="$nova_fid_niveaux"></div>
!exit

:user
!! user.phtml
    <div id="nova-badges" hidden data-fidelite="$nova_lf" data-perseverance="$nova_lp" data-echauffement="$nova_lh" data-dm="$nova_ld" data-top="$nova_lt" data-topdm="$nova_lu" data-encours="$nova_ct" data-reglages="$nova_lr"
      data-niveaux="$nova_fid_niveaux" data-images-fidelite="themes/$wims_theme/img/badges/regularite/coeur_0" data-images-perseverance="themes/$wims_theme/img/badges/perseverance/flamme_0"
      data-images-echauffement="themes/$wims_theme/img/badges/entrainement/halteres_0" data-images-top="themes/$wims_theme/img/badges/etoile/etoile_0"
      data-titre="$nova_badges_titre" data-niveau="nivel" data-obtenu="Obtenida el"
      data-serie="racha actual" data-record="mejor racha" data-avant="antes del nivel %s" data-max="Todos los niveles alcanzados: ¡enhorabuena!"
      data-aucun="Todavía ningún nivel" data-sem="sem." data-fermer="Cerrar"
      data-fid-nom="$nova_fid_nom" data-fid-regle="Cuenta cada semana en la que usas WIMS al menos %e días. Una semana sin WIMS no te hace perder nada." data-fid-regle1="Cuenta cada semana en la que usas WIMS al menos 1 día. Una semana sin WIMS no te hace perder nada." data-fid-aide="Un nivel obtenido nunca se pierde. También puedes avanzar durante las vacaciones, si quieres." data-fid-total="semanas contadas"
      data-fid-suite="%n semanas más para el nivel %s." data-fid-suite1="1 semana más para el nivel %s."
      data-fid-etat-fait="Esta semana ya cuenta." data-fid-etat-attente="Esta semana todavía no cuenta: usa WIMS al menos %e días." data-fid-etat-attente1="Esta semana todavía no cuenta: usa WIMS al menos 1 día."
      data-per-nom="$nova_per_nom" data-per-regle="Supera (%r/10 o más) un ejercicio en el que antes obtuviste al menos %n notas estrictamente inferiores a %e/10." data-per-total="ejercicios superados tras dificultades" data-per-encours="En curso: «%t», %n notas estrictamente inferiores a %e/10. ¡Un acierto y cuenta!"
      data-per-suite="%n ejercicios más para el nivel %s." data-per-suite1="1 ejercicio más para el nivel %s." data-per-examens-oui="Un nivel obtenido nunca se pierde. Los ejercicios de examen también cuentan." data-per-examens-non="Un nivel obtenido nunca se pierde. Los ejercicios de examen no cuentan."
      data-ech-nom="$nova_ech_nom" data-ech-regle="Antes de cada deber calificado, haz al menos %n sesiones completas de su examen de práctica: una respuesta a cada ejercicio." data-ech-regle1="Antes de cada deber calificado, haz al menos una sesión completa de su examen de práctica: una respuesta a cada ejercicio." data-ech-total="deberes preparados"
      data-ech-dm="«%t»: %n sesiones completas de práctica más antes de empezar el deber calificado." data-ech-dm1="«%t»: 1 sesión completa de práctica más antes de empezar el deber calificado." data-ech-pret="«%t»: ya has calentado, ¡puedes empezar el deber calificado!" data-ech-suite="%n deberes preparados más para el nivel %s."
      data-ech-suite1="1 deber preparado más para el nivel %s." data-ech-aide="Un nivel obtenido nunca se pierde. Una sesión cuenta cuando has respondido a todos sus ejercicios; la práctica hecha después de empezar el deber calificado no cuenta para él."
      data-top-nom="$nova_top_nom" data-top-regle="Un deber WIMS cuenta cuando tu nota retenida en la prueba calificada (tu mejor sesión) llega al menos a %s/10." data-top-total="deberes en la cima" data-top-afaire="«%t»: ¡te toca! Apunta a %s/10."
      data-top-reussi="«%t»: %n/10, ¡enhorabuena!" data-top-encore="«%t»: %n/10 por ahora. Si te quedan intentos, apunta a %s/10." data-top-suite="%n deberes en la cima más para el nivel %s." data-top-suite1="1 deber en la cima más para el nivel %s."
      data-top-aide="Cuenta tu mejor nota en la prueba calificada, incluso en el último intento. Un nivel obtenido nunca se pierde." data-couleur="$nova_cv"
      data-coul-titre="Tus recompensas" data-coul-aide="Se aplica a todas tus páginas, pruebas incluidas." data-coul-verrou="Alcanza el nivel %s de la insignia %b para elegir tu color."
      data-coul-classe="Volver al color de la clase" data-coul-noms="Coral,Naranja,Ámbar,Verde,Verde abeto,Turquesa,Azur,Marino,Púrpura,Rosa" data-coul-choisie="Color elegido: %s."
      data-coul-menu="Mi color" data-coul-nouveau="nuevo" data-coul-unie="Color liso" data-coul-degrades="Degradados"
      data-coul-degrades-aide="Barra superior, botones y títulos de ventana. El primer color se usa para los enlaces." data-coul-verrou-degrade="Alcanza el nivel %s de la insignia %b para los degradados." data-coul-degrades-noms="Crepúsculo,Brasas,Frambuesa,Atardecer,Océano,Aurora,Bosque,Noche estrellada"
      data-coul-recompense="En el nivel %s: el color de tu WIMS." data-coul-recompense-deg="En el nivel %s: los degradados." data-coul-recompense-deg2="En el nivel %s: los degradados, una vez desbloqueado tu color." data-coul-verrou-degrade2="Alcanza el nivel %s de la insignia %b para los degradados (después del color)." data-coul-choisir="Elegir mi color"></div>
!exit

:notes_detail
!! _widgets/notes-detail.phtml (nova.js notesDetail)
<template id="nova-notes-textes" data-titre="Mis notas" data-moi="tú" data-eleve="alumno" data-examen-restant="%1 examen aún no hecho" data-examens-restants="%1 exámenes aún no hechos" data-commence="%1 de %2 ejercicios empezado" data-commences="%1 de %2 ejercicios empezados" data-pas-commence="Aún no empezada" data-pas-fait="Aún no hecho" data-tous="(todos los ejercicios)" data-ouvrir="Abrir la hoja" data-feuilles="Hojas de ejercicios"></template>
!exit

:feuille
!! header.phtml, page d'une feuille (adm/sheet ; nova.js feuilleExercices, audit D2 maquette B, 2026-11-14)
<template id="nova-feuille-textes" data-feuille="Hoja %1" data-reussi="%1 ejercicio logrado de %2" data-reussis="%1 ejercicios logrados de %2" data-etat-reussi="Logrado" data-etat-cours="En curso" data-etat-faire="Por hacer" data-points="%1 / %2 puntos" data-entrainement="Modo práctica" data-entrainement-aide="Tus respuestas no se califican mientras esté activado."></template>
!exit
