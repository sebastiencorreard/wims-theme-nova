# Nova : avatar de l'eleve (Avataaars de DiceBear ; demande de l'utilisateur, maquette validee le 2026-11-07).
# Appele par _widgets/avatar.phtml (accueil de l'eleve, module de confiance). Entree decoupee en sections :
#   #conf     feuilles ou sont poses les reglages --nova-... (site, structure, classe : la derniere l'emporte) ;
#   #fichier  log/classes/<structure ou classe>/.nova_avatar_<login> : « choix cat.val,... » et « ouverts cat.val ... » ;
#   #stock    score/<eleve>.nova de toutes les zones de la structure (niveaux des badges, le plus haut compte) ;
#   #zone <n> puis score/<eleve> et noscore/<eleve> de cette zone (« E... » = examen).
# Variables : auj (AAAAMMJJ) ; catalogue (_procs/avatar-catalogue.txt) ; ouvrir (cat.val a ouvrir avec des jetons) ;
#   choix (cat.val,cat.val,... a enregistrer). Les deux dernieres viennent de l'adresse : verifiees ici, element par element.
#
# Un exercice REUSSI compte une fois par jour (meme feuille ou examen, meme exercice, meme zone) quand :
#   sa note atteint --nova-avatar-seuil (sur 10, 7 par defaut) ;
#   la reponse arrive au moins --nova-avatar-secondes (15) apres l'ouverture de l'exercice (ligne « new » de la meme
#   session, de la meme feuille et du meme exercice) ;
#   et au plus --nova-avatar-max-jour (10) exercices comptent par jour.
# Jetons : un par palier de --nova-avatar-paliers (« 3 10 20 30 40 »), puis un tous les --nova-avatar-pas (10) exercices.
# Un element ouvert le reste toujours (meme si son prix change) ; un element de badge s'ouvre au niveau du catalogue,
# badges actifs seulement.
#
# Sortie :
#   avatar off | avatar on
#   jetons <gagnes> <depenses> <disponibles> <exercices comptes> <comptes aujourd'hui> <max par jour> <reste> <pourcent>
#   message - | ouvert | choix | refus
#   choix - | cat.val,cat.val,...      (choix enregistre, verifie)
#   elements cat:val:etat ...          (etat : libre, achete, 1, 2, badge-<cle>-<niveau>-<0 ou 1 = atteint>)
#   ecrire 0|1, puis le nouveau contenu du fichier de l'eleve (2 lignes : choix, ouverts) ;
#   enfin <note de reussite> <secondes> <max par jour> (pour les regles affichees a l'eleve) ;
#   niveaux <cle>:<niveau atteint>:<badge propose 1|0> ... (fidelite, perseverance, echauffement, top).

function jours(s,    y, m, d, era, yoe, doy, doe) {
  y = substr(s, 1, 4) + 0; m = substr(s, 5, 2) + 0; d = substr(s, 7, 2) + 0
  if (m <= 2) y--
  era = int(y / 400); yoe = y - era * 400
  doy = int((153 * (m > 2 ? m - 3 : m + 9) + 2) / 5) + d - 1
  doe = yoe * 365 + int(yoe / 4) - int(yoe / 100) + doy
  return era * 146097 + doe - 719468
}
function nombre(v, mini, maxi, defaut) {
  if (v !~ /^[0-9]+(\.[0-9]+)?$/) return defaut
  v += 0; if (v < mini) return mini; if (v > maxi) return maxi
  return v
}
# Secondes depuis 1970 d'un horodatage AAAAMMJJ.hh:mm:ss (sans le E des examens).
function secondes(t,    h) {
  h = substr(t, 10)
  return jours(substr(t, 1, 8)) * 86400 + substr(h, 1, 2) * 3600 + substr(h, 4, 2) * 60 + substr(h, 7, 2)
}
function actif(nom) {
  if (conf["badges"] != "oui") return 0
  return conf["badges-actifs"] == "" || conf["badges-actifs"] ~ ("(^|[ ,])(" nom "|tous)([ ,]|$)")
}
# Etat d'un element pour cet eleve : libre, achete, 1, 2 (a acheter), badge-<cle>-<niveau>-<0|1>.
function etat(e,    p, b) {
  p = prix[e]
  if (p == "libre") return "libre"
  if (e in achete) return "achete"
  if (p == "1" || p == "2") return p
  split(p, b, ":")
  return "badge-" b[1] "-" b[2] "-" ((actif(b[1]) && niv[b[1]] >= b[2] + 0) ? 1 : 0)
}
function ouvert(e,    s) { s = etat(e); return s == "libre" || s == "achete" || s ~ /-1$/ }

BEGIN {
  while ((getline l < catalogue) > 0) {
    if (l ~ /^#/ || split(l, c, " ") != 3) continue
    e = c[1] "." c[2]
    ne++; ordre[ne] = e; prix[e] = c[3]; cat[e] = c[1]
  }
  close(catalogue)
}

/^#conf$/ { section = "conf"; next }
/^#fichier$/ { section = "fichier"; next }
/^#stock$/ { section = "stock"; next }
/^#zone / { section = "score"; zone = $2; next }

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
section == "fichier" {
  if ($1 == "choix") ancienChoix = $2
  else if ($1 == "ouverts") for (i = 2; i <= NF; i++) if ($i in prix) achete[$i] = 1
  next
}
section == "stock" {
  for (i = 2; i <= NF; i++) if ($i ~ /^niveau=/) { v = substr($i, 8) + 0; if (v > niv[$1]) niv[$1] = v }
  next
}
section == "score" {
  t = $1; ex = ""
  if (t ~ /^E/) { t = substr(t, 2); ex = "E" }
  if (t !~ /^[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]\.[0-9][0-9]:[0-9][0-9]:[0-9][0-9]$/) next
  k = zone " " ex $3 "." ($4 + 0)
  if ($5 == "new") { ouverture[$2, k] = secondes(t); next }
  if ($5 != "score" || $6 !~ /^[0-9]+(\.[0-9]+)?$/) next
  if (!(($2, k) in ouverture)) next
  reponses[++nr] = substr(t, 1, 8) " " k " " $6 " " (secondes(t) - ouverture[$2, k])
  next
}

END {
  if (conf["avatar"] != "oui") { print "avatar off"; exit }
  print "avatar on"
  seuil = nombre(conf["avatar-seuil"], 0, 10, 7)
  delai = int(nombre(conf["avatar-secondes"], 0, 600, 15))
  maxj = int(nombre(conf["avatar-max-jour"], 1, 100, 10))
  pas = int(nombre(conf["avatar-pas"], 1, 100, 10))
  liste = conf["avatar-paliers"]; if (liste == "") liste = "3 10 20 30 40"
  m = split(liste, brut, /[ ,]+/); np = 0
  for (i = 1; i <= m && np < 20; i++) {
    if (brut[i] !~ /^[0-9]+$/) continue
    p = brut[i] + 0; if (p < 1) p = 1; if (np && p <= pal[np]) p = pal[np] + 1
    pal[++np] = p
  }
  if (!np) np = split("3 10 20 30 40", pal, " ")

  # Exercices comptes : une fois par jour et par exercice, au plus maxj par jour.
  total = 0; ajd = 0
  for (r = 1; r <= nr; r++) {
    split(reponses[r], c, " ")
    if (c[4] + 0 < seuil || c[5] + 0 < delai) continue
    cle = c[1] " " c[2] " " c[3]
    if (cle in compte) continue
    compte[cle] = 1
    if (parjour[c[1]] >= maxj) continue
    parjour[c[1]]++; total++
    if (c[1] == auj) ajd++
  }
  # Jetons gagnes et prochain seuil.
  gagnes = 0
  for (i = 1; i <= np; i++) if (total >= pal[i]) gagnes++
  if (total >= pal[np]) { g = int((total - pal[np]) / pas); gagnes += g; avant = pal[np] + g * pas; apres = avant + pas }
  else { avant = 0; for (i = 1; i <= np; i++) { if (total >= pal[i]) avant = pal[i]; else { apres = pal[i]; break } } }
  reste = apres - total
  pc = int(100 * (total - avant) / (apres - avant))

  # Ouverture demandee (ouvrir=cat.val) : element a jetons, pas encore ouvert, assez de jetons.
  message = "-"
  depenses = 0; for (e in achete) if (prix[e] == "1" || prix[e] == "2") depenses += prix[e]
  if (ouvrir != "") {
    s = (ouvrir in prix) ? etat(ouvrir) : ""
    if ((s == "1" || s == "2") && gagnes - depenses >= s + 0) { achete[ouvrir] = 1; depenses += s; message = "ouvert" }
    else message = "refus"
  }
  # Choix demande : chaque categorie au plus une fois, element ouvert ; sinon on garde l'ancien choix.
  nouveau = ""
  if (choix != "") {
    m = split(choix, brut, ",")
    for (i = 1; i <= m; i++) {
      e = brut[i]
      if (!(e in prix) || !ouvert(e) || (cat[e] in pris)) continue
      pris[cat[e]] = 1; nouveau = nouveau (nouveau == "" ? "" : ",") e
    }
    if (nouveau != "") message = (message == "refus") ? "refus" : "choix"
    else { nouveau = ancienChoix; message = "refus" }
  } else nouveau = ancienChoix

  dispo = gagnes - depenses; if (dispo < 0) dispo = 0
  print "jetons " gagnes " " depenses " " dispo " " total " " ajd " " maxj " " reste " " pc
  print "message " message
  print "choix " (nouveau == "" ? "-" : nouveau)
  ligne = "elements"
  for (i = 1; i <= ne; i++) { e = ordre[i]; ligne = ligne " " cat[e] ":" substr(e, length(cat[e]) + 2) ":" etat(e) }
  print ligne
  liste = ""; for (i = 1; i <= ne; i++) if (ordre[i] in achete) liste = liste " " ordre[i]
  ecrire = (nouveau != ancienChoix || message == "ouvert") ? 1 : 0
  print "ecrire " ecrire
  print "choix " nouveau
  print "ouverts" liste
  print seuil " " delai " " maxj
  print "niveaux fidelite:" (niv["fidelite"] + 0) ":" actif("fidelite") " perseverance:" (niv["perseverance"] + 0) ":" actif("perseverance") \
    " echauffement:" (niv["echauffement"] + 0) ":" actif("echauffement") " top:" (niv["top"] + 0) ":" actif("top")
}
