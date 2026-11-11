#!/usr/bin/env python3
"""Construit icones/Lucide/icon-min.css, jeu d'icônes WIMS « Lucide » de Nova.

Chaque règle du jeu Font_Awesome de WIMS (gifs/themes/Font_Awesome/icon-min.css) est reprise avec ses
sélecteurs ; le glyphe de la police devient une icône Lucide en SVG, posée en masque CSS (couleur du texte).
Usage : construire-lucide.py <icon-min.css de Font_Awesome> <dossier icons/ de lucide-static> [sortie]
Le dossier icons/ vient du paquet npm lucide-static (version dans LUCIDE_VERSION ci-dessous).
"""
import os, re, sys, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from correspondance import G, C, E

LUCIDE_VERSION = '1.61.0'
fa_css, icones = sys.argv[1], sys.argv[2]
ici = os.path.dirname(os.path.abspath(__file__))
sortie = sys.argv[3] if len(sys.argv) > 3 else os.path.join(ici, 'Lucide', 'icon-min.css')

def svg(nom):
    s = open(os.path.join(icones, nom + '.svg'), encoding='utf-8').read()
    s = re.sub(r'<!--.*?-->', '', s, flags=re.S)
    s = re.sub(r'\s+', ' ', s).strip().replace('> <', '><').replace(' />', '/>')
    s = re.sub(r'<svg[^>]*>', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" '
               'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">', s, count=1)
    return 'url("data:image/svg+xml,' + urllib.parse.quote(s, safe=" =:/'-.,") + '")'

t = re.sub(r'/\*.*?\*/', '', open(fa_css, encoding='utf-8').read(), flags=re.S)
groupes = {}          # icône Lucide -> sélecteurs
ordre = []
def ajouter(icone, sel):
    if icone not in groupes: groupes[icone] = []; ordre.append(icone)
    if sel not in groupes[icone]: groupes[icone].append(sel)
for sels, decl in re.findall(r'([^{}@]+)\{([^{}]*)\}', t):
    m = re.search(r'content:"\\([0-9a-f]{4})"', decl)
    if not m: continue
    for sel in (x.strip() for x in sels.split(',')):
        if not re.search(r':(before|after)$', sel): continue
        cl = re.findall(r'\.([A-Za-z0-9_-]+):(?:before|after)$', sel)
        ajouter(C.get(cl[-1], G[m.group(1)]) if cl else G[m.group(1)], sel)
# Lettres de Font_Awesome (Createxo C, Modtool M…) : icônes
for cl in ('createxo', 'modtool', 'quicktool', 'latex2wims'):
    for sel in (f'.menuitem>.{cl}:before', f'.text_icon.{cl}:before'): ajouter(C[cl], sel)
for cl, ic in E.items(): ajouter(ic, f'.menuitem>.{cl}:before')
tous = [s for ic in ordre for s in groupes[ic]]

out = ['/* Jeu d\'icônes WIMS « Lucide » (thème Nova). Icônes Lucide ' + LUCIDE_VERSION + ', licence ISC (LICENSE).',
       '   Fichier produit par themes/Nova/icones/construire-lucide.py : ne pas modifier à la main. */',
       '@import "../../domains/general/icons.css";@import "../../domains/sciences/icons.css";',
       ".text_icon{background-repeat:no-repeat}",
       ".text_icon[class^='icon_'],.text_icon[class*='icon_']{padding-left:1.5em;background-size:1.2em;min-height:1.2em;background-position:2px 50%;display:inline-block;vertical-align:middle}",
       ".slide-menu-closed .slide-menu{width:46px}.slide-menu-closed #wimstopbox,.slide-menu-closed div#wimsbodybox{margin-left:46px}.slide-menu .menuitem>a{padding:.4rem 1rem}",
       ".external_link{white-space:nowrap}.footer .menuitem>a{padding:.7rem 1rem}",
       # Boîte de l'icône : 1em de côté, taille de police de Font_Awesome (20px) pour garder les variantes icon-2x, small…
       ','.join(tous) + '{content:"";display:inline-block;flex:none;font-size:18px;width:1em;height:1em;line-height:1;vertical-align:-.2em;margin-right:.35em;background-color:currentColor;-webkit-mask:var(--wims-icone) center/contain no-repeat;mask:var(--wims-icone) center/contain no-repeat}',
       ".breadcrumbs a:before,.breadcrumbs .text_item:before{font-size:1.1em;vertical-align:-.15em}",
       "strike.text_icon:before{font-size:inherit;margin-right:0}",
       "#wimsmenumodubox .menuitem a:before{min-width:1em}",
       ".menuitem a:after{margin-right:0;margin-left:.35em}.menuitem a.small:before,.menuitem a.small a:before,.icon_button.small>span:before{font-size:14px}",
       ".icon-lg a:before{font-size:1.33333333em;vertical-align:-15%}.icon-2x a:before{font-size:2em}.icon-3x a:before{font-size:3em}.icon-4x a:before{font-size:4em}.icon-5x a:before{font-size:5em}",
       ".icon-fw a:before{width:1.28571429em}",
       ".icon-ul{padding-left:0;margin-left:2.14285714em;list-style-type:none}.icon-ul>li{position:relative}.icon-ul a:before{position:absolute;left:-2.14285714em;top:.14285714em}",
       ".icon-spin a:before,.text_icon.icon-spin:before{animation:wims-tourne 2s infinite linear}.icon-pulse a:before{animation:wims-tourne 1s infinite steps(8)}",
       "@keyframes wims-tourne{0%{transform:rotate(0)}100%{transform:rotate(359deg)}}",
       ".icon_rotate-90 a:before{transform:rotate(90deg)}.icon_rotate-180 a:before{transform:rotate(180deg)}.icon_rotate-270 a:before{transform:rotate(270deg)}.icon_flipH a:before{transform:scale(-1,1)}.icon_flipV a:before{transform:scale(1,-1)}",
       ".nav>a:before,.language_selector a:before{content:none}",
       ".success:before{color:#2aa52a}.alert:before{color:#a52a2a}.info:before{color:#004077;float:left}"]
for ic in ordre:
    out.append(','.join(groupes[ic]) + '{--wims-icone:' + svg(ic) + '}')
os.makedirs(os.path.dirname(sortie), exist_ok=True)
data = ('\n'.join(out) + '\n').encode('utf-8')
with open(sortie, 'wb') as f: f.write(data)
print(f'{len(ordre)} icônes, {len(tous)} sélecteurs, {len(data)} octets -> {sortie}')
