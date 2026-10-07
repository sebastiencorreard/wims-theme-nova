# Nova : badges de l'élève (demande de l'utilisateur, 2026-10-07). Premier badge : Fidélité.
# Appelé par user.phtml (accueil de l'élève, module de confiance) ; l'entrée est découpée en sections :
#   #conf   feuilles où sont posés les réglages --nova-… (site, structure, classe : la dernière l'emporte) ;
#   #stock  score/<élève>.nova, une ligne par badge (« fidelite niveau=5 obtenu=20270122 vu=5 record=12 ») ;
#   #score  score/<élève> et noscore/<élève> (5e champ « score » = une réponse envoyée ; « E… » = examen).
# Variable : auj (AAAAMMJJ, 8 premiers caractères de $wims_now).
# Sortie, ligne 1 : « off » (badges coupés), ou
#   « on niveau record serie etat prochain nouveau obtenu np palier1 … palierN »
#   etat : fait (exercice cette semaine), attente, danger (relance : badges qui la demandent), pause (vacances).
# Ligne 2 : 1 si score/<élève>.nova doit être réécrit, sinon 0 ; lignes suivantes : son nouveau contenu.
#
# Fidélité : une semaine (lundi-dimanche) compte si l'élève y a envoyé au moins une réponse. Une semaine de
# vacances (tous ses jours de classe, du lundi au vendredi, dans une période de --nova-vacances) est sautée :
# elle ne compte pas et ne casse pas la série. Le niveau suit la meilleure série et ne se perd jamais (gardé
# dans le stock, même si les paliers changent).

# Jours depuis le 1970-01-01 (calendrier grégorien), d'après AAAAMMJJ.
function jours(s,    y, m, d, era, yoe, doy, doe) {
  y = substr(s, 1, 4) + 0; m = substr(s, 5, 2) + 0; d = substr(s, 7, 2) + 0
  if (m <= 2) y--
  era = int(y / 400); yoe = y - era * 400
  doy = int((153 * (m > 2 ? m - 3 : m + 9) + 2) / 5) + d - 1
  doe = yoe * 365 + int(yoe / 4) - int(yoe / 100) + doy
  return era * 146097 + doe - 719468
}
# Semaine (lundi-dimanche) d'un jour : le 1970-01-01 est un jeudi.
function semaine(j) { return int((j + 3) / 7) }
function vacances(w,    j, k, dedans) {
  if (!nv) return 0
  for (j = w * 7 - 3; j <= w * 7 + 1; j++) {
    dedans = 0
    for (k = 1; k <= nv; k++) if (j >= va[k] && j <= vb[k]) dedans = 1
    if (!dedans) return 0
  }
  return 1
}
function jour8(s) { return s ~ /^[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]$/ }

/^#conf$/ { section = "conf"; next }
/^#stock$/ { section = "stock"; next }
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
section == "stock" {
  if ($1 == "fidelite") { ancien = $0; for (i = 2; i <= NF; i++) { split($i, kv, "="); st[kv[1]] = kv[2] } }
  else if (NF) autres = autres $0 "\n"
  next
}
section == "score" && $5 == "score" {
  s = $1; sub(/^E/, "", s); s = substr(s, 1, 8)
  if (!jour8(s)) next
  w = semaine(jours(s))
  actif[w] = 1
  if (!(w in dernier) || s > dernier[w]) dernier[w] = s
  if (w0 == "" || w < w0) w0 = w
}

END {
  if (conf["badges"] != "oui") { print "off"; exit }
  # Paliers : nombres croissants, 8 au plus (une image par niveau).
  liste = conf["fidelite-paliers"]; if (liste == "") liste = "2 3 5 8 12 16 21 26"
  m = split(liste, brut, /[ ,]+/); np = 0
  for (i = 1; i <= m && np < 8; i++) {
    if (brut[i] !~ /^[0-9]+$/ || brut[i] + 0 < 1) continue
    p = brut[i] + 0; if (np && p <= pal[np]) p = pal[np] + 1
    pal[++np] = p
  }
  if (!np) { split("2 3 5 8 12 16 21 26", pal, " "); np = 8 }
  # Vacances : périodes AAAAMMJJ-AAAAMMJJ.
  m = split(conf["vacances"], brut, /[ ,]+/)
  for (i = 1; i <= m; i++) {
    if (split(brut[i], ab, "-") != 2 || !jour8(ab[1]) || !jour8(ab[2])) continue
    nv++; va[nv] = jours(ab[1]); vb[nv] = jours(ab[2])
  }
  j = jours(auj); wc = semaine(j); jds = (j + 3) % 7   # 0 = lundi

  serie = 0; record = 0; niveau = 0; obtenu = ""
  if (w0 != "") for (w = w0; w <= wc; w++) {
    if (vacances(w)) continue
    if (actif[w]) {
      serie++
      if (serie > record) {
        record = serie
        while (niveau < np && record >= pal[niveau + 1]) { niveau++; obtenu = dernier[w] }
      }
    } else if (w < wc) serie = 0    # la semaine en cours n'est pas finie : elle ne casse rien
  }
  # Jamais perdu : niveau et record gardés.
  if (st["niveau"] + 0 > niveau) { niveau = st["niveau"] + 0; obtenu = st["obtenu"] }
  else if (st["niveau"] + 0 == niveau && st["obtenu"] != "") obtenu = st["obtenu"]
  if (st["record"] + 0 > record) record = st["record"] + 0
  if (niveau > np) niveau = np

  relance = 0    # Fidélité : pas de relance (un badge qui ne se perd pas ; demande de l'utilisateur)
  if (vacances(wc)) etat = "pause"
  else if (actif[wc]) etat = "fait"
  else if (relance && jds >= 3 && serie > 0) etat = "danger"
  else etat = "attente"
  prochain = 0
  if (niveau < np) { prochain = pal[niveau + 1] - serie; if (prochain < 1) prochain = 1 }
  nouveau = niveau > st["vu"] + 0 ? 1 : 0
  if (obtenu == "") obtenu = "-"

  ligne = "on " niveau " " record " " serie " " etat " " prochain " " nouveau " " obtenu " " np
  for (i = 1; i <= np; i++) ligne = ligne " " pal[i]
  print ligne
  stock = "fidelite niveau=" niveau " obtenu=" obtenu " vu=" niveau " record=" record
  print (stock != ancien ? 1 : 0)
  printf "%s%s\n", autres, stock
}
