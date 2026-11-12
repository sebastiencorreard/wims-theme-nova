!! Nova : textes (es) des accueil de l'eleve (user.phtml), Mon avatar, Mon activite.
!! Lus seulement par ces gabarits (2026-11-11) : name.phtml, lu sur CHAQUE page, faisait deborder le tampon des noms
!! de variables de WIMS (32 Ko, src/var.c : variable_name_buffer_overflow sur un exercice d'une feuille).
!! Encodage latin-1 : WIMS sert ses pages en windows-1252.
!! Textes anglais d'abord (repli : un texte absent de cette langue s'affiche en anglais, jamais vide).
!read themes/$wims_theme/lang/eleve.phtml.en
!set nova_badges_voir=Ver la insignia
!set nova_badges_masquer=Ocultar
!set nova_fid_nouveau=Nuevo nivel:
!set nova_fid_bravo1=%n semanas de WIMS: ¡un gran comienzo!
!set nova_fid_bravo2=%n semanas de WIMS: se está creando un hábito.
!set nova_fid_bravo3=%n semanas de WIMS: ¡sólido como una roca!
!set nova_fid_bravo4=%n semanas de WIMS: un verdadero hábito de trabajo.
!set nova_fid_bravo5=%n semanas de WIMS: enhorabuena por tu constancia.
!set nova_fid_bravo6=%n semanas de WIMS: ¡qué regularidad, enhorabuena!
!set nova_fid_bravo7=%n semanas de WIMS: un trabajo notable.
!set nova_fid_bravo8=%n semanas de WIMS: el nivel más alto, ¡chapó!
!set nova_act_regularite=Mi regularidad
!set nova_act_temps=Mi tiempo de trabajo
!set nova_act_notes=Mis últimas notas
!set nova_act_jours0=Todavía ningún trabajo esta semana
!set nova_act_jours1=1 día esta semana
!set nova_act_joursn=%1 días esta semana
!set nova_act_lettres=L,M,X,J,V,S,D
!set nova_act_noms=lunes,martes,miércoles,jueves,viernes,sábado,domingo
!set nova_act_travail=trabajado
!set nova_act_encourage1=Un día más y alcanzas tu objetivo de %2 días por semana. ¡Incluso 10 minutos cuentan!
!set nova_act_encourage=%1 días más y alcanzas tu objetivo de %2 días por semana. ¡Incluso 10 minutos cuentan!
!set nova_act_bien1=¡Bien! Un día más para alcanzar tu objetivo de %2 días por semana.
!set nova_act_bien=¡Bien! %1 días más para alcanzar tu objetivo de %2 días por semana.
!set nova_act_bravo=Enhorabuena, objetivo alcanzado: %2 días por semana. ¡Sigue así!
!set nova_act_vacances=¡Felices vacaciones! Sin objetivo durante las vacaciones.
!set nova_act_exercice=Hacer un ejercicio
!set nova_act_duree=%1 esta semana
!set nova_act_repere=referencia: %1 h
!set nova_act_pause=Has trabajado mucho esta semana. Acuérdate de hacer pausas y de guardar tiempo para otras cosas: también ayuda a aprender.
!set nova_act_maj=Actualizado cada noche.
!set nova_act_aucune=Todavía ninguna nota.
!set nova_act_aujourdhui=hoy
!set nova_act_hier=ayer
!set nova_act_le=el %1
!set nova_act_toutes=Todas mis notas
!set nova_act_detail=Gráficos detallados de WIMS
!set nova_act_exo=Ejercicio %1
!set nova_badges_court=Insignias
!set nova_per_bravo1=Tu primer ejercicio superado tras dificultades: ¡enhorabuena por no rendirte!
!set nova_per_bravo=%n ejercicios superados tras dificultades: nunca te rindes, ¡enhorabuena!
!set nova_ech_bravo1=Tu primer deber preparado: bien calentado, ¡enhorabuena!
!set nova_ech_bravo=%n deberes preparados: siempre llegas bien calentado, ¡enhorabuena!
!set nova_top_bravo1=Tu primer deber en la cima, ¡enhorabuena!
!set nova_top_bravo=%n deberes en la cima: te mantienes en lo más alto, ¡enhorabuena!
!set nova_av_titre=Mi avatar
!set nova_av_credits=Avataaars by Pablo Stanley via DiceBear
