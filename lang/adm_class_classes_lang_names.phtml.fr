!! Reglage « Textes du theme standard » : rien n'est surcharge (_procs/textes-standard.proc).
!read themes/Nova/_procs/textes-standard.proc
!if $nova_std_textes=oui
  !exit
!endif
!! Nova : page de connexion (adm/class/classes, authparticipant.phtml) sans les textes d'introduction
!! (demande de l'utilisateur, 2026-10-03). Balises restees vides masquees par _css/composants.css.
!set name_enterorregister=,
!set name_enter=
