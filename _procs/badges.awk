# Nova : badges de l'élève (demande de l'utilisateur, 2026-10-07 ; Persévérance le 2026-10-09). Appelé par user.phtml
# (accueil de l'élève, module de confiance) ; l'entrée est découpée en sections :
#   #conf   feuilles où sont posés les réglages --nova-… (site, structure, classe : la dernière l'emporte) ;
#   #stock  score/<élève>.nova, une ligne par badge (« fidelite niveau=5 obtenu=20270122 vu=5 record=12 ») ;
#   #score  score/<élève> et noscore/<élève> (5e champ « score » = une réponse envoyée, 6e = la note ; « E… » = examen).
# Variable : auj (AAAAMMJJ, 8 premiers caractères de $wims_now).
# Sortie :
#   fidelite off | fidelite on niveau record serie etat prochain nouveau obtenu np palier1 … palierN
#     etat : fait (assez d'exercices cette semaine), attente, danger (relance : badges qui la demandent), pause (vacances).
#   perseverance off | perseverance on niveau total prochain nouveau obtenu np palier1 … palierN
#   encours - | encours <examen 0/1> <feuille ou examen> <exercice> <échecs> : exercice le plus récent avec assez
#     d'échecs et pas encore de réussite (Persévérance : « une réussite et il compte »).
#   reglages <exercices par semaine> <note de réussite> <note d'échec> <échecs> <examens 1/0>
#   ecrire 1|0 (score/<élève>.nova à réécrire), puis son nouveau contenu.
#
# Fidélité : une semaine (lundi-dimanche) compte si l'élève y a envoyé une réponse dans au moins
# --nova-fidelite-exercices exercices différents (1 par défaut). Une semaine de vacances (tous ses jours de classe, du
# lundi au vendredi, dans une période de --nova-vacances) est sautée : elle ne compte pas et ne casse pas la série.
# Persévérance : un exercice compte (une fois) quand l'élève y obtient au moins --nova-perseverance-reussite après au
# moins --nova-perseverance-echecs notes sous --nova-perseverance-echec ; examens compris si --nova-perseverance-examens
# vaut oui (défaut). Les deux niveaux suivent leurs paliers et ne se perdent jamais (gardés dans le stock).

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
function nombre(v, mini, maxi, defaut) {
  if (v !~ /^[0-9]+(\.[0-9]+)?$/) return defaut
  v += 0; if (v < mini) return mini; if (v > maxi) return maxi
  return v
}
# Paliers : nombres croissants, 8 au plus (une image par niveau) ; liste vide ou fausse : défaut.
function paliers(liste, defaut, pal,    m, brut, i, p, n) {
  if (liste == "") liste = defaut
  m = split(liste, brut, /[ ,]+/); n = 0
  for (i = 1; i <= m && n < 8; i++) {
    if (brut[i] !~ /^[0-9]+$/ || brut[i] + 0 < 1) continue
    p = brut[i] + 0; if (n && p <= pal[n]) p = pal[n] + 1
    pal[++n] = p
  }
  if (!n) n = split(defaut, pal, " ")
  return n
}
function actif(nom) {
  if (conf["badges"] != "oui") return 0
  return conf["badges-actifs"] == "" || conf["badges-actifs"] ~ ("(^|[ ,])(" nom "|tous)([ ,]|$)")
}

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
  if ($1 == "fidelite" || $1 == "perseverance") { ancien[$1] = $0; for (i = 2; i <= NF; i++) { split($i, kv, "="); st[$1, kv[1]] = kv[2] } }
  else if (NF) autres = autres $0 "\n"
  next
}
section == "score" && $5 == "score" {
  examen = $1 ~ /^E/
  s = $1; sub(/^E/, "", s)
  d8 = substr(s, 1, 8)
  if (!jour8(d8)) next
  # Même réponse dans score/ et noscore/ : une seule fois.
  cle = $1 " " $3 " " $4 " " $6
  if (cle in vu) next
  vu[cle] = 1
  # Fidélité : exercices différents de chaque semaine.
  w = semaine(jours(d8))
  ex = (examen ? "E" : "") $3 "." $4
  if (!((w, ex) in fait)) { fait[w, ex] = 1; nfait[w]++ }
  if (!(w in dernier) || d8 > dernier[w]) dernier[w] = d8
  if (w0 == "" || w < w0) w0 = w
  # Persévérance : notes de chaque exercice, triées plus bas.
  if ($6 !~ /^[0-9]+(\.[0-9]+)?$/ || $6 + 0 > 10) next
  if (!(ex in pn)) { npe++; pex[npe] = ex; pexam[ex] = examen; pf[ex] = $3; po[ex] = $4 }
  k = ++pn[ex]; pt[ex, k] = s; ps[ex, k] = $6 + 0
}

END {
  j = jours(auj); wc = semaine(j); jds = (j + 3) % 7   # 0 = lundi
  m = split(conf["vacances"], brut, /[ ,]+/)
  for (i = 1; i <= m; i++) {
    if (split(brut[i], ab, "-") != 2 || !jour8(ab[1]) || !jour8(ab[2])) continue
    nv++; va[nv] = jours(ab[1]); vb[nv] = jours(ab[2])
  }
  parsem = int(nombre(conf["fidelite-exercices"], 1, 50, 1))
  reussite = nombre(conf["perseverance-reussite"], 0, 10, 7)
  echec = nombre(conf["perseverance-echec"], 0, 10, 5)
  nechecs = int(nombre(conf["perseverance-echecs"], 1, 20, 2))
  examens = conf["perseverance-examens"] != "non"
  ecrire = 0; stock = ""

  # ---------- Fidélité ----------
  if (!actif("fidelite")) print "fidelite off"
  else {
    np = paliers(conf["fidelite-paliers"], "2 3 5 8 12 16 21 26", pal)
    serie = 0; record = 0; niveau = 0; obtenu = ""
    if (w0 != "") for (w = w0; w <= wc; w++) {
      if (vacances(w)) continue
      if (nfait[w] >= parsem) {
        serie++
        if (serie > record) {
          record = serie
          while (niveau < np && record >= pal[niveau + 1]) { niveau++; obtenu = dernier[w] }
        }
      } else if (w < wc) serie = 0    # la semaine en cours n'est pas finie : elle ne casse rien
    }
    if (st["fidelite", "niveau"] + 0 > niveau) { niveau = st["fidelite", "niveau"] + 0; obtenu = st["fidelite", "obtenu"] }
    else if (st["fidelite", "niveau"] + 0 == niveau && st["fidelite", "obtenu"] != "") obtenu = st["fidelite", "obtenu"]
    if (st["fidelite", "record"] + 0 > record) record = st["fidelite", "record"] + 0
    if (niveau > np) niveau = np
    relance = 0    # pas de relance (un badge qui ne se perd pas ; demande de l'utilisateur)
    if (vacances(wc)) etat = "pause"
    else if (nfait[wc] >= parsem) etat = "fait"
    else if (relance && jds >= 3 && serie > 0) etat = "danger"
    else etat = "attente"
    prochain = 0
    if (niveau < np) { prochain = pal[niveau + 1] - serie; if (prochain < 1) prochain = 1 }
    nouveau = niveau > st["fidelite", "vu"] + 0 ? 1 : 0
    if (obtenu == "") obtenu = "-"
    ligne = "fidelite on " niveau " " record " " serie " " etat " " prochain " " nouveau " " obtenu " " np
    for (i = 1; i <= np; i++) ligne = ligne " " pal[i]
    print ligne
    s = "fidelite niveau=" niveau " obtenu=" obtenu " vu=" niveau " record=" record
    if (s != ancien["fidelite"]) ecrire = 1
    stock = stock s "\n"
  }

  # ---------- Persévérance ----------
  encours = "-"; encq = ""
  if (!actif("perseverance")) print "perseverance off"
  else {
    np = paliers(conf["perseverance-paliers"], "1 3 5 10 15 20 25 30", pal)
    total = 0; nd = 0
    for (e = 1; e <= npe; e++) {
      ex = pex[e]
      if (pexam[ex] && !examens) continue
      n = pn[ex]
      # Tri par date (score/ et noscore/ se suivent) : insertion, peu de notes par exercice.
      for (a = 2; a <= n; a++) {
        tt = pt[ex, a]; ss = ps[ex, a]
        for (b = a - 1; b >= 1 && pt[ex, b] > tt; b--) { pt[ex, b + 1] = pt[ex, b]; ps[ex, b + 1] = ps[ex, b] }
        pt[ex, b + 1] = tt; ps[ex, b + 1] = ss
      }
      ratees = 0; reussi = 0
      for (a = 1; a <= n && !reussi; a++) {
        if (ps[ex, a] < echec) ratees++
        else if (ps[ex, a] >= reussite && ratees >= nechecs) { reussi = 1; nd++; quand[nd] = substr(pt[ex, a], 1, 8) }
      }
      if (reussi) total++
      else if (ratees >= nechecs && pt[ex, n] > encq) { encq = pt[ex, n]; encours = pexam[ex] " " pf[ex] " " po[ex] " " ratees }
    }
    # Date d'obtention de chaque niveau : la k-ième réussite (dates triées).
    for (a = 2; a <= nd; a++) { tt = quand[a]; for (b = a - 1; b >= 1 && quand[b] > tt; b--) quand[b + 1] = quand[b]; quand[b + 1] = tt }
    niveau = 0; obtenu = ""
    while (niveau < np && total >= pal[niveau + 1]) { niveau++; obtenu = quand[pal[niveau]] }
    if (st["perseverance", "niveau"] + 0 > niveau) { niveau = st["perseverance", "niveau"] + 0; obtenu = st["perseverance", "obtenu"] }
    else if (st["perseverance", "niveau"] + 0 == niveau && st["perseverance", "obtenu"] != "") obtenu = st["perseverance", "obtenu"]
    if (st["perseverance", "total"] + 0 > total) total = st["perseverance", "total"] + 0
    if (niveau > np) niveau = np
    prochain = 0
    if (niveau < np) { prochain = pal[niveau + 1] - total; if (prochain < 1) prochain = 1 }
    nouveau = niveau > st["perseverance", "vu"] + 0 ? 1 : 0
    if (obtenu == "") obtenu = "-"
    ligne = "perseverance on " niveau " " total " " prochain " " nouveau " " obtenu " " np
    for (i = 1; i <= np; i++) ligne = ligne " " pal[i]
    print ligne
    s = "perseverance niveau=" niveau " obtenu=" obtenu " vu=" niveau " total=" total
    if (s != ancien["perseverance"]) ecrire = 1
    stock = stock s "\n"
  }
  print "encours " encours
  print "reglages " parsem " " reussite " " echec " " nechecs " " examens
  # Badges coupés : leur ligne de stock est gardée telle quelle (rien n'est perdu).
  if (!actif("fidelite") && ancien["fidelite"] != "") stock = stock ancien["fidelite"] "\n"
  if (!actif("perseverance") && ancien["perseverance"] != "") stock = stock ancien["perseverance"] "\n"
  print "ecrire " ecrire
  printf "%s%s", autres, stock
}
