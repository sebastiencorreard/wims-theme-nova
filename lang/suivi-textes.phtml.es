!! Nova : textes de nova.js en clair (es), lus par !read themes/$wims_theme/lang/suivi-textes.phtml.$lang <etiquette>.
!! Aucun nom de variable WIMS (tampon des noms de 32 Ko par page, src/var.c ; 2026-11-12). Encodage latin-1.
!! Un texte = un attribut dans fr, en, es, it (verifier.sh compare les etiquettes et les attributs).
!goto $wims_read_parm

:suivi_1
!! _widgets/suivi.phtml
      <p class="nova-suivi-phrase" data-phrase="Tener en cuenta los últimos %1 minutos."><input id="nova-suivi-fenetre" type="number" min="1" max="120" step="1" value="60" aria-label="$nova_sv_a_fenetre"></p>
!exit

:suivi_2
!! _widgets/suivi.phtml
      <p class="nova-suivi-phrase" data-phrase="Indicar «sin acción» después de %1 min."><input id="nova-suivi-inactivite" type="number" min="1" max="120" step="1" value="5" aria-label="$nova_sv_a_inactivite"></p>
!exit

:suivi_3
!! _widgets/suivi.phtml
      <p class="nova-suivi-phrase" data-phrase="Actualizar cada %1 s."><input id="nova-suivi-intervalle" type="number" min="10" max="300" step="1" value="30" aria-label="$nova_sv_a_intervalle"></p>
!exit

:suivi_4
!! _widgets/suivi.phtml
      <p class="nova-suivi-phrase" data-phrase="Cuando al menos %1 de las %2 últimas notas del ejercicio están por debajo de %3 /10."><input id="nova-suivi-erreurs" type="number" min="1" max="5" step="1" value="3" aria-label="$nova_sv_a_erreurs"> <input id="nova-suivi-resultats" type="number" min="1" max="100" step="1" value="5" aria-label="$nova_sv_a_resultats"> <input id="nova-suivi-note-faible" type="number" min="0" max="10" step="0.1" value="5" aria-label="$nova_sv_a_note_faible"></p>
!exit

:suivi_5
!! _widgets/suivi.phtml
      <p class="nova-suivi-phrase" data-phrase="Cuando no llega ninguna nota desde hace %1 min en el ejercicio en curso."><input id="nova-suivi-attente" type="number" min="1" max="120" step="1" value="8" aria-label="$nova_sv_a_attente"></p>
!exit

:suivi_6
!! _widgets/suivi.phtml
      <p class="nova-suivi-phrase" data-phrase="Cuando el alumno vuelve a empezar el ejercicio %1 veces tras %2 notas de al menos %3 /10."><input id="nova-suivi-reprises" type="number" min="1" max="1000" step="1" value="4" aria-label="$nova_sv_a_reprises"> <input id="nova-suivi-reussites" type="number" min="1" max="100" step="1" value="3" aria-label="$nova_sv_a_reussites"> <input id="nova-suivi-note-reussite" type="number" min="0" max="10" step="0.1" value="9" aria-label="$nova_sv_a_note_reussite"></p>
!exit

:suivi_7
!! _widgets/suivi.phtml
  <template id="nova-suivi-textes" data-indispo="El informe no está disponible. Haz clic en Actualizar para reintentarlo." data-ily-s="Hace %1 s" data-ily-min="Hace %1 min" data-aucun-signal="Ninguna señal en este ejercicio" data-why-difficulte="%1 resultados < %2/10 entre los %3 últimos" data-why-repetition="%1 repeticiones tras %2 resultados &ge; %3/10" data-why-attente="Ningún resultado registrado desde hace %1 min: comprobar" data-difficulte="$nova_svj_difficulte" data-attente="$nova_svj_attente" data-repetition="$nova_svj_repetition" data-travail="Trabajando" data-silence="Sin acción" data-ancien="Sesión antigua" data-f-actifs="Todos" data-f-attention="Hay que ir a ver" data-f-tous="Con las sesiones antiguas" data-g-repetition="Repetición tras éxito" data-g-silence="Sin acción desde hace %1 min" data-g-ancien="Sesiones abiertas, fuera de la ventana" data-examen="Examen %1 &middot; %2" data-feuille="Hoja %1 &middot; %2" data-chrono-titre="Cronología &middot; últimos %1 minutos" data-relances="%1 nuevos intentos sin respuesta: %2" data-pas-de-note="sin nota" data-res-indispo="Resultado no disponible" data-res-indispo-court="resultado no disponible" data-note="nota" data-note-a="%1/10 a las %2" data-aucun-essai="Ningún intento registrado en esta ventana." data-quarante="Se muestran los 40 últimos eventos." data-partiel="Historial parcial: se omiten los eventos más antiguos." data-masquer="Ocultar la cronología" data-voir-chrono="Ver la cronología de %1" data-masquer-chrono="Ocultar la cronología de %1" data-passee="señal de la actividad pasada" data-pas-encore="todavía sin nota" data-auto="Actualizar cada %1 s" data-n-classes="%1 clases o cursos" data-minutes="últimos %1 minutos" data-releve-a="Informe de las %1" data-actualisation="Actualizando&hellip;" data-impossible="No se ha podido actualizar. Último informe: %1. %2" data-expiree="Sesión caducada o acceso no disponible: vuelve a la clase." data-err-trop="Demasiadas sesiones para este informe. Abre el seguimiento desde una clase o un curso." data-err-refuse="Acceso denegado." data-err-reserve="Acceso reservado a los profesores y administradores de sus clases." data-err-indispo="Informe no disponible. Actualiza para reintentarlo." data-exo="Ejercicio %1" data-accueil="Inicio" data-inconnue="Actividad desconocida"></template>
!exit
