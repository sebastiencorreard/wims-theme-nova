#!/bin/sh
# Contrôles sans conteneur (pas de verrou), lancés par livrer.sh avant toute livraison, et à la main après une
# modification : ./verifier.sh. Chaque contrôle vient d'une panne vécue (CLAUDE.md, « Pièges »). 2026-11-11.
cd "$(dirname "$0")"
python3 - <<'PY'
import glob, os, re, subprocess, sys, shutil
err = []
def ko(m): err.append(m)

# 1. js/nova.js = assemblage de js/src, empreinte à jour dans htmlheader.phtml.
r = subprocess.run(['./construire-js.sh', '--verifier'], capture_output=True, text=True)
if r.returncode: ko(r.stderr.strip())

# 2. Syntaxe des scripts écrits par Nova.
scripts = ['js/nova.js', 'js/suivi.js', 'js/flyers.js']
if shutil.which('node'):
    for f in scripts:
        r = subprocess.run(['node', '--check', f], capture_output=True, text=True)
        if r.returncode: ko('Syntaxe : ' + r.stderr.strip()[:600])
else:
    print('(node absent : syntaxe des scripts non vérifiée)')

# 3. Scripts servis en windows-1252 : aucun caractère non ASCII hors commentaire (l'outil Edit écrit en clair un
#    échappement \uXXXX : vécu le 2026-11-08, tout nova.js en panne).
def hors_commentaires(t):
    # Retire commentaires, en respectant chaînes et expressions régulières (heuristique : « / » après un opérateur).
    out, i, n, dernier = [], 0, len(t), ''
    while i < n:
        c = t[i]
        if c in '"\'`':
            j = i + 1
            while j < n and t[j] != c:
                j += 2 if t[j] == '\\' else 1
            out.append(t[i:j + 1]); i = j + 1; dernier = c; continue
        if c == '/' and t[i + 1:i + 2] == '/':
            j = t.find('\n', i); j = n if j < 0 else j
            out.append(' ' * 0); i = j; continue
        if c == '/' and t[i + 1:i + 2] == '*':
            j = t.find('*/', i + 2); j = n - 2 if j < 0 else j
            out.append('\n' * t.count('\n', i, j + 2)); i = j + 2; continue
        if c == '/' and (dernier == '' or dernier in '(,=:[!&|?{};+-*%<>~^' or re.search(r'\b(return|typeof|case|in|of)$', ''.join(out[-12:]))):
            j, classe = i + 1, False
            while j < n and (t[j] != '/' or classe) and t[j] != '\n':
                if t[j] == '\\': j += 1
                elif t[j] == '[': classe = True
                elif t[j] == ']': classe = False
                j += 1
            out.append(t[i:j + 1]); i = j + 1; dernier = '/'; continue
        out.append(c)
        if not c.isspace(): dernier = c
        i += 1
    return ''.join(out)
for f in sorted(glob.glob('js/src/*.js')) + ['js/suivi.js', 'js/flyers.js']:
    code = hors_commentaires(open(f, encoding='utf-8', errors='replace').read())
    for k, l in enumerate(code.split('\n'), 1):
        if any(ord(ch) > 127 for ch in l):
            ko('%s:%d : caractère non ASCII dans le code (l\'écrire en échappement \\uXXXX) : %s' % (f, k, l.strip()[:90]))

# 4. Feuilles : celles du modèle existent, celles de _css/ sont dans le modèle.
modele = open('css.css.template', encoding='utf-8', errors='replace').read()
citees = set(re.findall(r'^--- Nova/(_css/[^ ]+) ---$', modele, re.M))
for f in sorted(citees):
    if not os.path.exists(f): ko('css.css.template cite %s, absent' % f)
for f in sorted(glob.glob('_css/*.css')):
    if f not in citees: ko('%s n\'est pas dans css.css.template (feuille sans effet)' % f)

# 5. Gabarits et textes lus par WIMS en latin-1 : un fichier enregistré en UTF-8 afficherait « Ã© ».
for f in sorted(glob.glob('*.phtml') + glob.glob('_widgets/*.phtml') + glob.glob('lang/*') + glob.glob('_procs/*.proc')):
    b = open(f, 'rb').read()
    servi = b'\n'.join(l for l in b.split(b'\n') if not l.lstrip().startswith(b'!!'))   # hors commentaires
    if any(x > 127 for x in servi):
        try: servi.decode('utf-8'); ko('%s : texte en UTF-8 hors commentaire, WIMS le lit en latin-1' % f)
        except UnicodeDecodeError: pass

# 6. Langues : toute langue autre que fr et en commence par lire l'anglais (jamais de texte vide). Textes en plusieurs
#    fichiers (2026-11-11) : name (barre, chaque page) et ceux lus par les seuls gabarits qui en ont besoin ; chaque
#    langue de name a chacun de ces fichiers.
GROUPES = sorted({os.path.basename(f).split('.')[0] for f in glob.glob('lang/*.phtml.*') if '_lang_' not in f})
LANGUES = sorted(f.rsplit('.', 1)[1] for f in glob.glob('lang/name.phtml.*'))
for g in GROUPES:
    for l in LANGUES:
        f = 'lang/%s.phtml.%s' % (g, l)
        if not os.path.exists(f): ko('%s absent (lu par les gabarits pour cette langue)' % f); continue
        if l in ('fr', 'en') or (g.endswith('-textes') and l in ('es', 'it')): continue
        tete = open(f, encoding='latin-1').read(600)
        if not re.search(r'^!read .*/%s\.phtml\.en' % g, tete, re.M): ko('%s ne commence pas par !read …/%s.phtml.en' % (f, g))
    def cles(l): return set(re.findall(r'^!set (nova_\w+)', open('lang/%s.phtml.%s' % (g, l), encoding='latin-1').read(), re.M))
    fr = cles('fr')
    for l in ('en', 'es', 'it'):
        m = sorted(fr - cles(l))
        if m: ko('lang/%s.phtml.%s : %d texte(s) Nova de fr absents : %s' % (g, l, len(m), ' '.join(m[:8])))
# Textes de nova.js en clair (lang/<groupe>-textes.phtml.<l>, 2026-11-12) : memes etiquettes et memes attributs data-*
# dans fr, en, es, it ; aucun !set (le but : aucun nom de variable WIMS).
def morceaux(f):
    t = open(f, encoding='latin-1').read()
    if re.search(r'^\s*!(set|let|default) ', t, re.M): ko('%s : !set dans un fichier de textes en clair' % f)
    return {m.group(1): sorted(re.findall(r'(data-[\w-]+)=', m.group(2))) for m in re.finditer(r'^:(\w+)\n(.*?)^!exit', t, re.M | re.S)}
for g in [x for x in GROUPES if x.endswith('-textes')]:
    fr = morceaux('lang/%s.phtml.fr' % g)
    for l in ('en', 'es', 'it'):
        if morceaux('lang/%s.phtml.%s' % (g, l)) != fr: ko('lang/%s.phtml.%s : etiquettes ou attributs differents de fr' % (g, l))
# Tampon des noms de variables de WIMS (32 Ko par page, src/var.c) : name.phtml est lu sur chaque page.
noms = re.findall(r'^!set (\w+)=', open('lang/name.phtml.fr', encoding='latin-1').read(), re.M)
if sum(len(n) + 1 for n in noms) > 4000:
    ko('lang/name.phtml.fr : %d octets de noms de variables (> 4000) : ranger les nouveaux textes dans le fichier de leur page' % sum(len(n) + 1 for n in noms))

# 7. Dossier du thème libre : jamais « themes/Nova/ » dans un fichier servi (toujours themes/$wims_theme/).
for f in sorted(glob.glob('*.phtml') + glob.glob('_widgets/*.phtml') + glob.glob('_procs/*') + glob.glob('js/src/*.js')):
    for k, l in enumerate(open(f, encoding='latin-1').read().split('\n'), 1):
        if re.search(r'themes/Nova\b', l) and not re.match(r'\s*(!!|#|//|/?\*)', l):
            ko('%s:%d : chemin « themes/Nova » en dur (écrire themes/$wims_theme)' % (f, k))

if err:
    print('\n'.join('✗ ' + e for e in err)); print('%d problème(s).' % len(err)); sys.exit(1)
print('verifier.sh : tout est bon.')
PY
