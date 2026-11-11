!! Nova : textes (nl) des restriction d'acces, ecarts des zones, desactivation forcee (_widgets/acces-classe, ecarts-zones, desactiver).
!! Lus seulement par ces gabarits (2026-11-11) : name.phtml, lu sur CHAQUE page, faisait deborder le tampon des noms
!! de variables de WIMS (32 Ko, src/var.c : variable_name_buffer_overflow sur un exercice d'une feuille).
!! Encodage latin-1 : WIMS sert ses pages en windows-1252.
!! Textes anglais d'abord (repli : un texte absent de cette langue s'affiche en anglais, jamais vide).
!read themes/$wims_theme/lang/enseignant.phtml.en
!! Fin d'une serie d'exercices : bouton vers la liste (js/nova.js, boutonsCollants)
!set nova_acc_titre_jour=Forbidden hours, every day
!set nova_acc_aide_jour=Your students can neither do exercises nor open resources during these hours. The home page and scores stay available.
!set nova_acc_de=From
!set nova_acc_a=to
!set nova_acc_lendemain=next day
!set nova_acc_retirer_plage=Remove this time slot
!set nova_acc_ajouter_plage=Add a time slot
!set nova_acc_nuit=At night: 8:30 pm to 7 am
!set nova_acc_titre_periodes=Forbidden periods
!set nova_acc_aide_periodes=Once, between two dates: an exam weekend, a holiday week...
!set nova_acc_du=From
!set nova_acc_au=to
!set nova_acc_heure_debut=Start time
!set nova_acc_heure_fin=End time
!set nova_acc_retirer_periode=Remove this period
!set nova_acc_ajouter_periode=Add a period
!set nova_acc_incomplet=incomplete: ignored
!set nova_acc_titre_portee=What is forbidden
!set nova_acc_tout=All work in the class
!set nova_acc_exo=Exercises only
!set nova_acc_titre_resume=Summary
!set nova_acc_resume_tout=Work in the class is forbidden %1.
!set nova_acc_resume_exo=Exercises are forbidden %1.
!set nova_acc_chaque_jour=every day from %1 to %2
!set nova_acc_chaque_jour_lendemain=every day from %1 to %2 the next day
!set nova_acc_periode=from %1 at %2 to %3 at %4
!set nova_acc_aucune=No restriction: your students can work at any time.
!set nova_acc_lignes=Lines written for WIMS
!set nova_acc_expert=Expert setting (other rules, IP addresses...)
!set nova_acc_expert_n=Expert setting: %1 other hand-written rule(s)
!set nova_acc_expert_aide=The WIMS field. Hand-written rules are kept; the rules of this form are between the lines "# Nova : debut" and "# Nova : fin". A duplicate rule is written only once.
!set nova_accp_enregistre=Access restriction saved.
!set nova_accp_question=%1 dependent zones have a different access restriction. Apply this one to them?
!set nova_accp_question1=A dependent zone has a different access restriction. Apply this one to it?
!set nova_accp_texte=Their current restriction will be replaced by this one, hand-written rules included.
!set nova_accp_voir=Show the zones
!set nova_accp_appliquer=Apply to the %1 zones
!set nova_accp_appliquer1=Apply to this zone
!set nova_accp_non=No, only here
!set nova_accp_attente=Applying...
!set nova_accp_fait=Restriction applied to the %1 dependent zones.
!set nova_accp_fait1=Restriction applied to the dependent zone.
!set nova_accp_erreur=The restriction could not be applied to the zones. Use "Dependent zones" in the configuration.
!set nova_forcer_sauver=Download a backup of the class first (.zip)
!set nova_forcer_sauver_aide=Participants, scores, worksheets, exams... everything needed to restore it if necessary (Configuration, Backup and restore).
!set nova_forcer_ok_sauver=Back up, then deactivate
!set nova_forcer_etape1=Preparing the backup of the class...
!set nova_forcer_etape2=Downloading: %1
!set nova_forcer_etape3=Deactivating
!set nova_forcer_echec=The backup failed: nothing was deactivated.
!set nova_forcer_reessayer=Try again
!set nova_forcer_sans=Deactivate without backup
