#!/usr/bin/env python3
# Nova : met à jour _procs/vacances-zones.txt, dates des vacances scolaires des zones A, B et C (demande de
# l'utilisateur, 2026-11-07), depuis le jeu de données officiel « Calendrier scolaire » du ministère
# (data.education.gouv.fr, fr-en-calendrier-scolaire). À lancer avant une livraison ; pas dans l'archive (livrer.sh).
#
# Format du fichier, une ligne par période : « <zone> <année scolaire> <nom> <premier jour>-<dernier jour> » (AAAAMMJJ,
# dates de Paris). Les dates officielles sont « début » (premier jour sans cours) et « fin » (jour de la reprise) : le
# dernier jour de vacances est la veille de la reprise. Été annoncé seulement par son début : jusqu'au 31 août.
# Ponts (Ascension) laissés de côté : un ou deux jours ne changent pas l'objectif d'une semaine.
import json, sys, urllib.parse, urllib.request
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

API = 'https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-calendrier-scolaire/records'
PARIS = ZoneInfo('Europe/Paris')
NOMS = {"Vacances de la Toussaint": 'Toussaint', "Vacances de Noël": 'Noel', "Vacances d'Hiver": 'Hiver',
        "Vacances de Printemps": 'Printemps', "Vacances d'Été": 'Ete', "Début des Vacances d'Été": 'Ete'}


def jour(iso):
    return datetime.fromisoformat(iso).astimezone(PARIS).date()


def lire():
    params = {
        'where': 'zones in ("Zone A","Zone B","Zone C")',
        'select': 'zones,annee_scolaire,description,population,start_date,end_date',
        'group_by': 'zones,annee_scolaire,description,population,start_date,end_date',
        'order_by': 'start_date', 'limit': 1000,
    }
    with urllib.request.urlopen(API + '?' + urllib.parse.urlencode(params), timeout=60) as r:
        return json.load(r)['results']


def main():
    lignes = set()
    # Années gardées : l'année scolaire précédente et les suivantes (le reste ne sert plus).
    auj = datetime.now(PARIS).date()
    premiere = f'{auj.year - (1 if auj.month >= 9 else 2)}-'
    for r in lire():
        if (r['annee_scolaire'] or '') < premiere:
            continue
        nom = NOMS.get(r['description'])
        if not nom or r['population'] == 'Enseignants' or '-' not in (r['annee_scolaire'] or ''):
            continue
        debut = jour(r['start_date'])
        if r['description'].startswith('Début'):
            fin = debut.replace(month=8, day=31)
        else:
            fin = jour(r['end_date']) - timedelta(days=1)
        if fin < debut:
            continue
        zone = r['zones'][-1]
        lignes.add((zone, r['annee_scolaire'], debut, nom, fin))
    if not lignes:
        sys.exit('Aucune date lue : fichier inchangé.')
    sortie = Path(__file__).resolve().parent / '_procs' / 'vacances-zones.txt'
    texte = ''.join(f'{z} {a} {n} {d:%Y%m%d}-{f:%Y%m%d}\n' for z, a, d, n, f in sorted(lignes))
    sortie.write_text(texte, encoding='ascii')
    annees = sorted({a for _, a, _, _, _ in lignes})
    print(f'{sortie} : {len(lignes)} périodes, années {annees[0]} à {annees[-1]}')


if __name__ == '__main__':
    main()
