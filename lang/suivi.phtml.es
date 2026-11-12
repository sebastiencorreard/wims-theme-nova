!! Nova : textes (es) des suivi en direct : _widgets/suivi.phtml.
!! Lus seulement par ces gabarits (2026-11-11) : name.phtml, lu sur CHAQUE page, faisait deborder le tampon des noms
!! de variables de WIMS (32 Ko, src/var.c : variable_name_buffer_overflow sur un exercice d'une feuille).
!! Encodage latin-1 : WIMS sert ses pages en windows-1252.
!! Textes anglais d'abord (repli : un texte absent de cette langue s'affiche en anglais, jamais vide).
!read themes/$wims_theme/lang/suivi.phtml.en
!! Suivi en direct (_widgets/suivi.phtml ; nova_svj_ : js/suivi.js), 2026-11-10.
!set nova_sv_sous_titre=En el aula de informática: ¿a qué alumnos hay que ir a ver?
!set nova_sv_chargement=Cargando el informe
!set nova_sv_actualiser=Actualizar
!set nova_sv_reglages=Ajustes
!set nova_sv_afficher=Mostrar
!set nova_sv_recherche=Buscar un alumno
!set nova_sv_recherche_aide=Buscar un alumno por su nombre o su identificador
!set nova_sv_classe=Clase o curso
!set nova_sv_toutes=Todas mis clases
!set nova_sv_legende=Alumnos de la sesión, del más urgente al más tranquilo
!set nova_sv_col_situation=Situación
!set nova_sv_col_eleve=Alumno
!set nova_sv_col_exercice=Ejercicio en curso
!set nova_sv_col_notes=Últimas notas
!set nova_sv_col_action=Última acción
!set nova_sv_col_chrono=Cronología
!set nova_sv_vide=Ningún alumno corresponde a estos filtros.
!set nova_sv_aide=Notas sobre 10 del ejercicio en curso: rojo por debajo del umbral de dificultad, verde a partir del umbral de éxito. Una señal invita a ir a ver al alumno; no dice nada de sus intenciones. «Sin acción» no quiere decir desconectado, y una sesión abierta no garantiza la presencia ante la pantalla. Las respuestas no contabilizadas se incluyen cuando WIMS las registra.
!set nova_sv_panneau_titre=Ajustes de la detección
!set nova_sv_fermer=Cerrar
!set nova_sv_panneau_aide=Cada regla se lee como una frase. Los cambios se aplican enseguida y se guardan en este ordenador.
!set nova_sv_seance=Sesión
!set nova_sv_a_fenetre=Ventana reciente, en minutos (120 como máximo)
!set nova_sv_a_inactivite=Minutos antes de «sin acción»
!set nova_sv_a_intervalle=Segundos entre dos actualizaciones
!set nova_sv_a_erreurs=Número de notas bajas
!set nova_sv_a_resultats=Número de últimas notas examinadas
!set nova_sv_a_note_faible=Nota baja, estrictamente inferior a, sobre 10
!set nova_sv_a_attente=Minutos sin nota
!set nova_sv_a_reprises=Número de repeticiones
!set nova_sv_a_reussites=Número de notas de éxito
!set nova_sv_a_note_reussite=Nota de éxito, mayor o igual que, sobre 10
!set nova_sv_defauts=Valores por defecto
!set nova_sv_noscript=Activa JavaScript para mostrar y filtrar este informe.
!set nova_svj_difficulte=Posible dificultad
!set nova_svj_attente=Tiempo largo
!set nova_svj_repetition=Repetición
