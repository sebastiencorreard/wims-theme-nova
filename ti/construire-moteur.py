import sys
import os
out=sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'moteur-ti.src')
reglages = r"""\comment{=== Travail individualise (theme Nova) - version 1 ===}
\comment{Exercices de la feuille titres "type de tache *", "type de tache **"... : meme nom = meme groupe, nombre d'etoiles = niveau.}
\comment{Les virgules d'un titre sont ignorees dans le nom du type de tache. Page ecrite par la carte de Nova (theme Nova, ti/).}
\comment{--- Reglages (modifiables a la main) ---}
\def{text ti_mode=entrainement}
\def{integer ti_seuil=80}
\def{text ti_ordre=}
\comment{ti_mode : entrainement (un niveau s'ouvre quand le precedent est reussi) ou evaluation (tout est ouvert).}
\comment{ti_seuil : meilleur score en % a partir duquel un niveau est reussi.}
\comment{ti_ordre : noms des types de tache dans l'ordre voulu, separes par des virgules ; les autres suivent.}
\comment{--- Textes (modifiables a la main) ---}
\def{text tx_reussi=Réussi}
\def{text tx_valide=Validé par un niveau au-dessus}
\def{text tx_meilleur=Meilleur score}
\def{text tx_faut=il faut}
\def{text tx_jamais=Pas encore essayé}
\def{text tx_apres=Réussis d'abord le niveau}
\def{text tx_commencer=Commencer}
\def{text tx_continuer=S'entraîner}
\def{text tx_refaire=Refaire}
\def{text tx_autres=Autres exercices}
\def{text tx_bilan=niveaux réussis sur}
\def{text tx_eval=Choisis un type de tâche et le niveau sur lequel tu te sens prêt. Une réussite suffit pour valider un niveau.}
\comment{--- Fin des reglages : ne rien modifier en dessous ---}
"""
# Ecrit par la carte « Travail individualise » de Nova (js/src/70-enseignant.js, travailIndividualise), qui remplace les
# trois lignes ti_mode, ti_seuil, ti_ordre et garde les textes tx_ de la page en place. Sortie en latin-1 (fichier lu
# par WIMS) ; usage : python3 construire-moteur.py [sortie, par defaut moteur-ti.src a cote du script].
# Liste des titres : une ligne par exercice possible (64 = maximum de WIMS par feuille).
titres = [r"\def{text ti_L=\infoexo1[5;]}"] + [r"\def{text ti_L=wims(append line \infoexo%d[5;] to \ti_L)}" % k for k in range(2, 65)]
moteur = r"""
\def{text st_carte=border:1px solid #c8c3cc;border-radius:12px;padding:10px 12px;margin:0 0 12px}
\def{text st_tete=display:flex;justify-content:space-between;align-items:center;gap:8px;margin:0 0 6px}
\def{text st_liste=list-style:none;margin:0;padding:0}
\def{text st_ligne=display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;padding:6px 0;border-top:1px dotted #c8c3cc}
\def{text st_etoiles=color:#b07d00;letter-spacing:1px;white-space:nowrap}
\def{text st_info=flex:1 1 10em}
\def{text st_ok=color:#1d7a46;font-weight:bold}
\def{text st_ferme=color:#77717b}
\comment{Exercices : nom du type de tache, nombre d'etoiles, score en %.}
\def{text ti_G=}
\def{text ti_K=}
\def{text ti_P=}
\def{integer ti_M=0}
\for{k=1 to \nbexo}{
\def{text t=wims(line \k of \ti_L)}
\def{text u=wims(replace internal * by  in \t)}
\def{integer c1=wims(charcnt \t)}
\def{integer c2=wims(charcnt \u)}
\def{integer s=\c1-\c2}
\def{text u=wims(replace internal , by  in \u)}
\def{text u=wims(singlespace \u)}
\def{text u=wims(trim \u)}
\def{integer c3=wims(charcnt \u)}
\if{\c3=0}{\def{integer s=0}}
\def{integer r=\scorerequire[\k]}
\if{\r<10}{\def{integer r=10}}
\def{integer p=100*\scorebests[\k]/\r}
\if{\s>0}{
\def{text q=wims(positionof item \u in \ti_G)}
\def{integer nq=wims(itemcnt \q)}
\if{\nq=0}{\def{text ti_G=wims(append item \u to \ti_G)}}
\if{\s>\ti_M}{\def{integer ti_M=\s}}
}
\def{text ti_K=wims(append item \u~\s to \ti_K)}
\def{text ti_P=wims(append item \p to \ti_P)}
}
\comment{Ordre des groupes : ti_ordre d'abord, puis les autres dans l'ordre de la feuille.}
\def{text ti_O=}
\for{x in \ti_ordre}{
\def{text y=wims(trim \x)}
\def{text q=wims(positionof item \y in \ti_G)}
\def{integer nq=wims(itemcnt \q)}
\def{text q=wims(positionof item \y in \ti_O)}
\def{integer nq2=wims(itemcnt \q)}
\if{\nq>0 and \nq2=0}{\def{text ti_O=wims(append item \y to \ti_O)}}
}
\for{x in \ti_G}{
\def{text q=wims(positionof item \x in \ti_O)}
\def{integer nq=wims(itemcnt \q)}
\if{\nq=0}{\def{text ti_O=wims(append item \x to \ti_O)}}
}
\def{integer ti_ng=wims(itemcnt \ti_O)}
\comment{Premier passage : plus haut niveau reussi de chaque groupe, bilan.}
\def{text ti_H=}
\def{integer ti_tot=0}
\def{integer ti_totv=0}
\for{i=1 to \ti_ng}{
\def{text g=wims(item \i of \ti_O)}
\def{integer h=0}
\for{lv=1 to \ti_M}{
\def{text q=wims(positionof item \g~\lv in \ti_K)}
\def{integer nq=wims(itemcnt \q)}
\if{\nq>0}{
\def{integer kk=\q[1]}
\def{integer ti_tot=\ti_tot+1}
\if{\ti_P[\kk]>=\ti_seuil}{\def{integer h=\lv}}
}
}
\for{lv=1 to \h}{
\def{text q=wims(positionof item \g~\lv in \ti_K)}
\def{integer nq=wims(itemcnt \q)}
\if{\nq>0}{\def{integer ti_totv=\ti_totv+1}}
}
\def{text ti_H=wims(append item \h to \ti_H)}
}
\comment{Affichage.}
<div class="nova-ti" data-mode="\ti_mode" data-seuil="\ti_seuil">
<h2 class="nova-ti-titre" style="text-align:center">\title</h2>
<div class="nova-ti-desc">\desc</div>
<p class="nova-ti-bilan" style="text-align:center"><b>\ti_totv</b> \tx_bilan \ti_tot</p>
\if{\ti_mode=evaluation}{<p class="nova-ti-consigne wims_msg info">\tx_eval</p>}
\for{i=1 to \ti_ng}{
\def{text g=wims(item \i of \ti_O)}
\def{integer h=\ti_H[\i]}
\def{integer prev=0}
\def{integer n=0}
\def{integer nv=0}
\for{lv=1 to \ti_M}{
\def{text q=wims(positionof item \g~\lv in \ti_K)}
\def{integer nq=wims(itemcnt \q)}
\if{\nq>0}{\def{integer n=\n+1}\if{\lv<=\h}{\def{integer nv=\nv+1}}}
}
\def{text cl=}
\if{\nv=\n}{\def{text cl=nova-ti-complet}}
<section class="nova-ti-groupe \cl" style="\st_carte">
<div class="nova-ti-tete" style="\st_tete"><h3 style="margin:0">\g</h3><span class="nova-ti-compte">\nv / \n</span></div>
<ul class="nova-ti-niveaux" style="\st_liste">
\for{lv=1 to \ti_M}{
\def{text q=wims(positionof item \g~\lv in \ti_K)}
\def{integer nq=wims(itemcnt \q)}
\if{\nq>0}{
\def{integer kk=\q[1]}
\def{integer p=\ti_P[\kk]}
\def{integer e=\scorealltries[\kk]}
\def{text et=}
\for{j=1 to \lv}{\def{text et=\et&#9733;}}
\def{text etat=ferme}
\if{\lv<=\h}{\def{text etat=valide}}{\if{\ti_mode=evaluation or \prev<=\h}{\def{text etat=ouvert}}}
<li class="nova-ti-niveau" data-etat="\etat" data-niveau="\lv" data-score="\p" data-essais="\e" style="\st_ligne">
<span class="nova-ti-etoiles" style="\st_etoiles" aria-label="niveau \lv">\et</span>
\if{\etat=valide}{
\if{\p>=\ti_seuil}{<span class="nova-ti-info" style="\st_info;\st_ok"><span class="nova-ti-symbole" aria-hidden="true">&#10003;</span> \tx_reussi, \p&nbsp;%</span>}{<span class="nova-ti-info" style="\st_info;\st_ok"><span class="nova-ti-symbole" aria-hidden="true">&#10003;</span> \tx_valide</span>}
\if{\ti_mode!=evaluation}{<span class="nova-ti-lien nova-ti-refaire">\exercise{\sheet/\kk}{\tx_refaire}</span>}
}
\if{\etat=ouvert}{
\if{\e>0}{<span class="nova-ti-info" style="\st_info">\tx_meilleur \p&nbsp;%, \tx_faut \ti_seuil&nbsp;%</span>}{<span class="nova-ti-info" style="\st_info">\tx_jamais</span>}
<b class="nova-ti-lien nova-ti-action">\if{\e>0}{\exercise{\sheet/\kk}{\tx_continuer &#8250;}}{\exercise{\sheet/\kk}{\tx_commencer &#8250;}}</b>
}
\if{\etat=ferme}{<span class="nova-ti-info" style="\st_info;\st_ferme"><span class="nova-ti-symbole" aria-hidden="true">&#128274;</span> \tx_apres \pet</span>}
\def{integer prev=\lv}
\def{text pet=\et}
}
}
</ul>
</section>
}
\comment{Exercices sans etoile, ou niveau en double : en fin de page.}
\def{text ti_A=}
\for{k=1 to \nbexo}{
\def{text c=wims(item \k of \ti_K)}
\def{text q=wims(positionof item \c in \ti_K)}
\def{integer k1=\q[1]}
\def{integer c4=wims(charcnt \c)}
\def{text c=wims(replace internal ~0 by  in \c)}
\def{integer c5=wims(charcnt \c)}
\if{\c5<\c4 or \k1!=\k}{\def{text ti_A=wims(append item \k to \ti_A)}}
}
\def{integer na=wims(itemcnt \ti_A)}
\if{\na>0}{
<section class="nova-ti-groupe nova-ti-autres" style="\st_carte">
<div class="nova-ti-tete" style="\st_tete"><h3 style="margin:0">\tx_autres</h3></div>
<ul class="nova-ti-niveaux" style="\st_liste">
\for{k in \ti_A}{
\def{integer p=\ti_P[\k]}
\def{integer e=\scorealltries[\k]}
<li class="nova-ti-niveau" data-etat="libre" data-score="\p" data-essais="\e" style="\st_ligne">
<span class="nova-ti-info" style="\st_info">\exercise{\sheet/\k}</span>
\if{\e>0}{<span class="nova-ti-score">\tx_meilleur \p&nbsp;%</span>}
</li>
}
</ul>
</section>
}
</div>
"""
texte = reglages + "\n".join(titres) + "\n" + moteur
data = texte.encode('latin-1')
open(out, 'wb').write(data)
