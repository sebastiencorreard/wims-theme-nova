!! Nova : textes (es) des restriction d'acces, ecarts des zones, desactivation forcee (_widgets/acces-classe, ecarts-zones, desactiver).
!! Lus seulement par ces gabarits (2026-11-11) : name.phtml, lu sur CHAQUE page, faisait deborder le tampon des noms
!! de variables de WIMS (32 Ko, src/var.c : variable_name_buffer_overflow sur un exercice d'une feuille).
!! Encodage latin-1 : WIMS sert ses pages en windows-1252.
!! Textes anglais d'abord (repli : un texte absent de cette langue s'affiche en anglais, jamais vide).
!read themes/$wims_theme/lang/enseignant.phtml.en
!set nova_forcer_titre_exam=¿Desactivar el examen %1 a pesar del uso compartido?
!set nova_forcer_titre_sheet=¿Desactivar la hoja %1 a pesar del uso compartido?
!set nova_forcer_points_exam=Se desactivará en todas las clases que comparten tus exámenes: sus alumnos ya no lo verán.|Vuelve a estar «En preparación»: su contenido se puede volver a modificar. Cambiar, añadir o mover ejercicios desajusta las notas ya registradas.|Las notas ya registradas se conservan.|WIMS lo prohíbe por estas razones: hazlo solo con conocimiento de causa.
!set nova_forcer_points_sheet=Se desactivará en todas las clases que comparten tus hojas: sus alumnos ya no la verán.|Vuelve a estar «En preparación»: su contenido se puede volver a modificar. Cambiar, añadir o mover ejercicios desajusta las notas ya registradas.|Las notas ya registradas se conservan.|WIMS lo prohíbe por estas razones: hazlo solo con conocimiento de causa.
!set nova_desact_ok_exam=Examen %1 desactivado en todas las clases que lo comparten: está en preparación.
!set nova_desact_ok_sheet=Hoja %1 desactivada en todas las clases que la comparten: está en preparación.
!set nova_desact_refus_statut=No se ha desactivado nada: el elemento %1 no está activo.
!set nova_desact_refus_commence=No se ha desactivado nada: los alumnos ya han empezado el examen %1.
!set nova_desact_refus_reglage=No se ha desactivado nada: desactivar a pesar del uso compartido no está permitido en esta clase (ajustes de Nova).
!set nova_desact_refus_erreur=No se ha desactivado nada (error).
!set nova_forcer_refus_commence=Nova tampoco puede desactivarlo: los alumnos ya han empezado este examen.
!! Fenetres de confirmation des ressources (2026-11-12) : examen commence (contourne), classe qui ne permet pas, fenetre de Nova (nova.js confirmationsRessources).
!set nova_forcer_titre_exam_commence=¿Desactivar el examen %1 aunque los alumnos lo hayan empezado?
!set nova_forcer_points_exam_commence=Vuelve a « En preparación »: su contenido se puede modificar de nuevo. Cambiar, añadir o mover ejercicios desajusta las notas ya registradas.|Los alumnos ya lo han empezado: sus notas se conservan. No lo desactive mientras un alumno lo está haciendo.|WIMS lo prohíbe por estas razones: hágalo solo con conocimiento de causa.
!! Jauge « Capacite de la classe » (_widgets/capacite.phtml ; 2026-11-12) : %u occupe (utilise + reserve), %t total, %p pourcentage.
!! Configuration globale (_widgets/config-globale.phtml, nova.js configurationGlobale ; 2026-11-12).

!! Page Avatars des eleves (2026-11-12, _widgets/avatars-classe.phtml) ; titre du menu : name.phtml (nova_avs_titre).
!set nova_avs_inactif=Ni el avatar ni las insignias están activados aquí (Ajustes de Nova, pestaña «Insignias y recompensas»).
!set nova_avs_vide=No hay alumnos inscritos aquí.
!set nova_avs_zone=Abra una clase o un curso de la estructura para ver los avatares de sus alumnos.
!set nova_avs_exporter=Exportar los avatares (.zip)
!set nova_avs_retour_titre=Volver a una versión anterior de Nova
!set nova_avs_retour_texte=El avatar, el color y las insignias de cada alumno se guardan con sus notas, con nombres distintos de los de antes del 12 de noviembre de 2026; las versiones de Nova anteriores a esa fecha no los encontrarían. Antes de reinstalar una de esas versiones, este botón los copia con sus nombres antiguos, para todos los alumnos de la clase o de la estructura. Hágalo justo antes de cambiar de versión: la copia de un alumno se elimina en cuanto vuelve a conectarse con la versión actual.
!set nova_avs_retour_bouton=Preparar la vuelta
!set nova_avs_retour_fait=Alumnos preparados (avatar, color, insignias):

!! Hoja y examen, página de preparación (2026-11-12).
!! Etats des ressources, accueil de l'enseignant (2026-11-12) : menu de la pastille d'etat (f feuille, e examen, d devoir libre).
!! Heures de coupure d'un examen (2026-11-12).
