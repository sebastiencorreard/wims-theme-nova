!! Nova : textes propres au thème (es). Lu par html/headmenu*.phtml (themes/$wims_theme/lang/).
!! Encodage latin-1 : WIMS sert ses pages en windows-1252.
!! Textes anglais d'abord (repli : un texte absent de cette langue s'affiche en anglais, jamais vide ; 2026-11-10).
!read themes/$wims_theme/lang/name.phtml.en
!set nova_menu_activites=Actividades
!set nova_menu_participants=Participantes
!set nova_menu_communication=Comunicación
!set nova_menu_classe=Clase
!set nova_menu_aide=Ayuda y herramientas
!set nova_examencours=Examen en curso
!set nova_examen_court=Examen
!set nova_explorer=Explorar
!set nova_taxonomie=Taxonomía
!set nova_glossaires=Glosarios
!set nova_parcourir=Recorrer el sitio
!set nova_accueil=Inicio
!set nova_rg_rubrique=Ajustes de Nova
!set nova_sv_titre=Seguimiento en directo
!set nova_avs_titre=Avatares de los alumnos,Insignias de los alumnos
!set nova_pied=Condiciones,Contacto
!! Version imprimable d'une feuille (adm/sheet, job=print : tous les exercices calcules dans une seule page) : le tampon
!! des noms de variables (32 Ko) y est presque plein avant la barre (debordement vu le 2026-11-12, serveur de l'utilisateur,
!! dans ce fichier). Seuls les textes de la barre et du menu ci-dessus y sont lus ; nova.js prend ses textes de secours.
!if $module=adm/sheet and $job=print
  !exit
!endif
!set nova_chrono_libelle=Tiempo restante
!set nova_chrono_fin_detail_exo=Todavía puedes terminar el ejercicio, pero la nota baja a medida que pasa el tiempo.
!set nova_chrono_fin_detail_exo0=Una respuesta enviada ahora tendrá un 0.
!set nova_examen_a_terminer=Examen por terminar
!set nova_examen_a_terminer_court=Terminar
!set nova_badges_titre=Mis insignias
!set nova_fid_nom=Regularidad
!set nova_fid_niveaux=Papel,Madera,Piedra,Hierro,Bronce,Oro,Diamante,Cósmico
!set nova_std_textes=Textos estándar
!set nova_per_nom=Perseverancia
!set nova_ech_nom=Calentamiento
!set nova_top_nom=En la cima
!set nova_bdg_av_non=no ofrecido
!! Suivi en direct (_widgets/suivi.phtml ; nova_svj_ : js/suivi.js), 2026-11-10.
