#!/usr/bin/env python3
# Nova : construit js/avatar-extras.js (elements de l'avatar dessines pour Nova, hors DiceBear) a partir des dessins
# _avatar/<categorie>/<valeur>.svg (2026-11-11, demande de l'utilisateur : categorie « Noel »).
#
# Chaque dessin est fait sur la tete de reference (page 280 x 280, viewBox de l'avatar) : Inkscape le range dans
# <g transform="translate(8)" mask=...>, le meme repere que la tete de DiceBear. On garde ce groupe (sans le masque :
# l'avatar a deja le sien), on retire tout ce qui est propre a Inkscape (sodipodi, inkscape, id, metadonnees) et on
# arrondit les nombres a 2 decimales. Le fichier produit doit rester en ASCII (WIMS le sert en windows-1252).
# Puis l'empreinte du fichier est posee dans js/src/62-avatar.js (AVATAR_EXTRAS_V) : relancer ./construire-js.sh.
#
#   ./construire-avatar.py
import hashlib, json, os, re, sys
import xml.etree.ElementTree as ET

ICI = os.path.dirname(os.path.abspath(__file__))
SVG = '{http://www.w3.org/2000/svg}'
GARDES = {'d', 'transform', 'style', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'opacity',
          'fill-opacity', 'stroke-opacity', 'fill-rule', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'width', 'height',
          'points', 'x1', 'y1', 'x2', 'y2'}
BALISES = {'g', 'path', 'circle', 'ellipse', 'rect', 'polygon', 'polyline', 'line'}
# Proprietes de style utiles (Inkscape en ajoute beaucoup d'autres).
STYLES = {'fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-linecap',
          'stroke-linejoin', 'opacity', 'display'}


def arrondi(texte):
    return re.sub(r'-?\d+\.\d+(?:e-?\d+)?', lambda m: ('%.2f' % float(m.group(0))).rstrip('0').rstrip('.'), texte)


def nettoyer_style(s):
    garde = []
    for decl in s.split(';'):
        if ':' not in decl:
            continue
        k, v = (x.strip() for x in decl.split(':', 1))
        if k in STYLES:
            garde.append(k + ':' + arrondi(v))
    return ';'.join(garde)


def ecrire(el):
    nom = el.tag.replace(SVG, '')
    if nom not in BALISES:
        return ''
    attrs = []
    for k, v in el.attrib.items():
        if k.startswith('{') or k not in GARDES:
            continue
        if k == 'style':
            v = nettoyer_style(v)
            if not v:
                continue
        else:
            v = arrondi(v)
        if 'url(' in v:
            sys.exit('reference interne (url(#...)) non geree : ' + v)
        attrs.append('%s="%s"' % (k, v.replace('"', "'")))
    enfants = ''.join(ecrire(e) for e in el)
    debut = '<' + nom + ''.join(' ' + a for a in attrs)
    return debut + ('>' + enfants + '</' + nom + '>' if enfants else '/>')


def dessin(chemin):
    racine = ET.parse(chemin).getroot()
    if racine.get('viewBox', '').split() != ['0', '0', '280', '280']:
        sys.exit(chemin + ' : la page doit rester 280 x 280 (viewBox 0 0 280 280)')
    corps = ''
    for el in racine:
        nom = el.tag.replace(SVG, '')
        if nom in ('defs', 'metadata') or nom not in BALISES:
            continue
        # Groupe du repere de la tete (translate(8), masque de la page) : garder le decalage, pas le masque.
        corps += ecrire(el)
    if not corps:
        sys.exit(chemin + ' : aucun dessin')
    if any(ord(c) > 127 for c in corps):
        sys.exit(chemin + ' : caractere non ASCII')
    return corps


extras = {}
base = os.path.join(ICI, '_avatar')
for cat in sorted(os.listdir(base)):
    if not os.path.isdir(os.path.join(base, cat)):
        continue
    for f in sorted(os.listdir(os.path.join(base, cat))):
        if f.endswith('.svg'):
            extras.setdefault(cat, {})[f[:-4]] = dessin(os.path.join(base, cat, f))

texte = ('/* Nova : elements de l\'avatar dessines pour Nova (hors DiceBear), poses par-dessus le dessin d\'Avataaars.\n'
         ' * GENERE par construire-avatar.py a partir de _avatar/<categorie>/<valeur>.svg : ne pas modifier ici. */\n'
         'window.novaAvatarExtras = ' + json.dumps(extras, separators=(',', ':'), sort_keys=True) + ';\n')
octets = texte.encode('ascii')
with open(os.path.join(ICI, 'js', 'avatar-extras.js'), 'wb') as f:
    f.write(octets)
empreinte = hashlib.sha256(octets).hexdigest()[:10]

src = os.path.join(ICI, 'js', 'src', '62-avatar.js')
contenu = open(src, encoding='utf-8').read()
nouveau = re.sub(r"var AVATAR_EXTRAS_V = '[0-9a-f]*';", "var AVATAR_EXTRAS_V = '%s';" % empreinte, contenu)
if nouveau == contenu and ("'%s'" % empreinte) not in contenu:
    sys.exit('AVATAR_EXTRAS_V introuvable dans js/src/62-avatar.js')
if nouveau != contenu:
    donnees = nouveau.encode('utf-8')
    with open(src, 'wb') as f:
        f.write(donnees)
print('js/avatar-extras.js : %d octets, %s, empreinte %s' % (
    len(octets), ', '.join('%s (%s)' % (c, ' '.join(sorted(v))) for c, v in sorted(extras.items())), empreinte))
