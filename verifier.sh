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

# 6. Langues : toute langue autre que fr et en commence par lire l'anglais (jamais de texte vide).
for f in sorted(glob.glob('lang/name.phtml.*')):
    if f.rsplit('.', 1)[1] in ('fr', 'en'): continue
    tete = open(f, encoding='latin-1').read(400)
    if not re.search(r'^!read .*name\.phtml\.en', tete, re.M): ko('%s ne commence pas par !read …/name.phtml.en' % f)
def cles(l): return set(re.findall(r'^!set (nova_\w+)', open('lang/name.phtml.' + l, encoding='latin-1').read(), re.M))
fr = cles('fr')
for l in ('en', 'es', 'it'):
    m = sorted(fr - cles(l))
    if m: ko('lang/name.phtml.%s : %d texte(s) Nova de fr absents : %s' % (l, len(m), ' '.join(m[:8])))

# 7. Dossier du thème libre : jamais « themes/Nova/ » dans un fichier servi (toujours themes/$wims_theme/).
for f in sorted(glob.glob('*.phtml') + glob.glob('_widgets/*.phtml') + glob.glob('_procs/*') + glob.glob('js/src/*.js')):
    for k, l in enumerate(open(f, encoding='latin-1').read().split('\n'), 1):
        if re.search(r'themes/Nova\b', l) and not re.match(r'\s*(!!|#|//|/?\*)', l):
            ko('%s:%d : chemin « themes/Nova » en dur (écrire themes/$wims_theme)' % (f, k))

if err:
    print('\n'.join('✗ ' + e for e in err)); print('%d problème(s).' % len(err)); sys.exit(1)
print('verifier.sh : tout est bon.')
PY
