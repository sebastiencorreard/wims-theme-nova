# Nova : page « Mon activité » de l'élève (demande de l'utilisateur, 2026-10-08, maquette A). Appelé par
# _widgets/activite.phtml (accueil de l'élève, module de confiance) ; l'entrée est découpée en sections :
#   #conf   feuilles où sont posés les réglages --nova-… (site, structure, classe : la dernière l'emporte) ;
#   #cc     log/ccaccount de la classe et de la structure : une ligne par session de travail, comptée par WIMS
#           chaque nuit (« AAAAMMJJ.HH:MM minutes », pauses de plus de 15 min non comptées, bin/ccsum) ;
#   #score  score/<élève> et noscore/<élève> (« E… » = examen ; 5e champ « score », 6e = note sur 10).
# Variable : auj (AAAAMMJJ).
# Sortie :
#   reglages <seuil> <objectif> <heures> <notes> <oui|non>
#   jours <nombre> <masque lundi..dimanche, 0/1> <aujourd'hui 0..6> <vacances 0/1>
#   minutes <minutes de la semaine> <barre en %, repère à 80 %> <trop 0/1> <heures> <minutes, 2 chiffres>
#   note <note> <niveau 0..10> <écart en jours> <jour 0..6> <JJ/MM> <feuille> <exercice>   (la plus récente d'abord)
# Un jour compte s'il porte une session (ccaccount, jusqu'à la veille) ou une action sur un exercice (journaux,
# aujourd'hui compris). Semaine du lundi au dimanche. Notes des feuilles seulement (pas des examens).

function jours(s,    y, m, d, era, yoe, doy, doe) {
  y = substr(s, 1, 4) + 0; m = substr(s, 5, 2) + 0; d = substr(s, 7, 2) + 0
  if (m <= 2) y--
  era = int(y / 400); yoe = y - era * 400
  doy = int((153 * (m > 2 ? m - 3 : m + 9) + 2) / 5) + d - 1
  doe = yoe * 365 + int(yoe / 4) - int(yoe / 100) + doy
  return era * 146097 + doe - 719468
}
function jour8(s) { return s ~ /^[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]$/ }
function entier(v, mini, maxi, defaut) {
  if (v !~ /^[0-9]+$/) return defaut
  v += 0; if (v < mini) return mini; if (v > maxi) return maxi
  return v
}

BEGIN { lundi = jours(auj) - (jours(auj) + 3) % 7 }

/^#conf$/ { section = "conf"; next }
/^#cc$/ { section = "cc"; next }
/^#score$/ { section = "score"; next }

section == "conf" {
  n = split($0, morceaux, /[;{}]/)
  for (i = 1; i <= n; i++) {
    if (!match(morceaux[i], /--nova-[a-z0-9-]+[ \t]*:/)) continue
    cle = substr(morceaux[i], RSTART + 7, RLENGTH - 7); sub(/[ \t]*:$/, "", cle)
    v = substr(morceaux[i], RSTART + RLENGTH); gsub(/^[ \t]+|[ \t]+$/, "", v); gsub(/["']/, "", v)
    conf[cle] = v
  }
  next
}
section == "cc" {
  s = substr($1, 1, 8)
  if (!jour8(s) || $2 !~ /^[0-9]+$/) next
  d = jours(s) - lundi
  if (d < 0 || d > 6) next
  actif[d] = 1; minutes += $2
  next
}
section == "score" {
  examen = $1 ~ /^E/
  s = $1; sub(/^E/, "", s); s = substr(s, 1, 8)
  if (!jour8(s)) next
  d = jours(s) - lundi
  if (d >= 0 && d <= 6) actif[d] = 1
  if (examen || $5 != "score" || $6 !~ /^[0-9]+(\.[0-9]+)?$/ || $3 !~ /^[0-9]+$/ || $4 !~ /^[0-9]+$/) next
  if ($6 + 0 > 10) next
  # Même réponse dans score/ et noscore/ : une seule fois.
  cle = $1 " " $3 " " $4 " " $6
  if (cle in vu) next
  vu[cle] = 1
  nn++; quand[nn] = $1; sub(/^E/, "", quand[nn]); note[nn] = $6 + 0; feuille[nn] = $3 + 0; exo[nn] = $4 + 0
}

END {
  seuil = entier(conf["activite-seuil"], 1, 7, 2)
  objectif = entier(conf["activite-objectif"], 1, 7, 3)
  if (objectif < seuil) objectif = seuil
  heures = entier(conf["activite-heures"], 1, 80, 6)
  nbnotes = entier(conf["activite-notes"], 1, 20, 5)
  print "reglages " seuil " " objectif " " heures " " nbnotes " " (conf["activite"] == "non" ? "non" : "oui")

  # Vacances (périodes AAAAMMJJ-AAAAMMJJ, celles des badges) : aujourd'hui dans l'une d'elles.
  vac = 0; ja = jours(auj)
  m = split(conf["vacances"], brut, /[ ,]+/)
  for (i = 1; i <= m; i++)
    if (split(brut[i], ab, "-") == 2 && jour8(ab[1]) && jour8(ab[2]) && ja >= jours(ab[1]) && ja <= jours(ab[2])) vac = 1
  masque = ""; n = 0
  for (d = 0; d <= 6; d++) { masque = masque (d in actif ? "1" : "0"); if (d in actif) n++ }
  print "jours " n " " masque " " (ja - lundi) " " vac
  minutes += 0
  pc = int(minutes * 80 / (heures * 60) + 0.5); if (pc > 100) pc = 100
  printf "minutes %d %d %d %d %02d\n", minutes, pc, (minutes > heures * 60 ? 1 : 0), int(minutes / 60), minutes % 60

  # Dernières notes : les plus récentes d'abord (sélection répétée : nbnotes ≤ 20).
  for (k = 1; k <= nbnotes; k++) {
    best = 0
    for (i = 1; i <= nn; i++) if (!(i in pris) && (!best || quand[i] > quand[best])) best = i
    if (!best) break
    pris[best] = 1
    j = jours(substr(quand[best], 1, 8)); niveau = int(note[best] + 0.5); if (niveau > 10) niveau = 10
    print "note " note[best] " " niveau " " (ja - j) " " ((j + 3) % 7) " " substr(quand[best], 7, 2) "/" substr(quand[best], 5, 2) " " feuille[best] " " exo[best]
  }
}
