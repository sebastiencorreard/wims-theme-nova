!! Reglage « Textes du theme standard » : rien n'est surcharge (_procs/textes-standard.proc).
!read themes/$wims_theme/_procs/textes-standard.proc
!if $nova_std_textes=oui
  !exit
!endif
!! Nova : pages des classes virtuelles d'un visiteur (2026-11-27, utilisateur) : << Entrer >> pour SE CONNECTER a une
!! classe ou s'y inscrire. Titres des zones : _widgets/visiteur-barre.phtml (html/name.phtml est relu apres ce fichier).
!set name_text1=Elija la línea correspondiente a la clase o al centro educativo que le corresponda. \
<p>Pulse <span class="wims_button disabled">$wims_name_Enter</span> para conectarse o inscribirse \
(si el estado es <span class="wims_label wims_warning">$name_protected</span>, necesita la contraseña de la clase \
que le proporcione el profesor o el administrador).</p>
!set name_supervisor_text=!nosubst Escoja la línea que corresponde a la clase, al agrupamiento o al establecimiento buscado.\
<br>Luego pulse sobre <span class="wims_button disabled">$wims_name_Enter</span> como profesor (para conectarse a una clase o inscribirse en ella)\
 o como administrador (para gestionar el agrupamiento o establecimiento).\
<p>La inscripción a esta parte está reservada a los profesores.</p>
!! Nova : page de connexion (adm/class/classes, authparticipant.phtml) sans les textes d'introduction
!! (demande de l'utilisateur, 2026-10-03). Balises restees vides masquees par _css/composants.css.
!set name_enterorregister=,
!set name_enter=
