!! Nova : textes de nova.js en clair (es), lus par !read themes/$wims_theme/lang/reglages-textes.phtml.$lang <etiquette>.
!! Aucun nom de variable WIMS (tampon des noms de 32 Ko par page, src/var.c ; 2026-11-12). Encodage latin-1.
!! Un texte = un attribut dans fr, en, es, it (verifier.sh compare les etiquettes et les attributs).
!goto $wims_read_parm

:apparence_classe_1
!! _widgets/apparence-classe.phtml
<template id="nova-reglages-classe" data-titre="Ajustes de Nova" data-enregistre="Ajustes de Nova guardados." data-lien="Los ajustes del tema Nova (visualización, alumnos, deberes WIMS, insignias...) tienen su propia página:" data-lien-texte="Ajustes de Nova" data-erreur-vacances="Línea no comprendida (se espera: DD/MM/AAAA - DD/MM/AAAA):" data-mots-defaut="valor por defecto" data-mots-retirer="Quitar" data-mots-ajouter="Añadir" data-mots-placeholder="Nueva palabra" data-mots-retablir="Volver al valor por defecto" data-vac-noms="Todos los Santos,Navidad,Invierno,Primavera,Verano" data-vac-ete="desde el %d" data-vac-manque="Nova todavía no conoce las fechas de %a: actualiza Nova o elige fechas personalizadas." data-vac-zone="$nova_app_vac_zone" data-vac-resume-aucune="Sin vacaciones: el objetivo semanal se muestra todo el año." data-vac-herite-de="%h: %v" data-sans-effet="pr_bgcolor,pr_bgimg,pr_ref_menucolor,pr_ref_button_bgcolor,pr_ref_button_color,pr_ref_button_help_bgcolor,pr_ref_button_help_color,pr_sccolor1,pr_actcolor1,pr_css,pr_homepage" data-sans-effet-ligne="wims_deposit" data-champ-theme="pr_refcolor" data-couleur-theme="$nova_app_couleur_theme" data-masques="se ocultan los ajustes sin efecto en el tema Nova o raramente útiles." data-afficher="Mostrarlos" data-masquer="Ocultarlos">
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
