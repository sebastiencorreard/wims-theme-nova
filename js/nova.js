/* Nova — menu latéral sur téléphone et tablette.
 * Ajoute à la barre du haut un bouton qui ouvre et ferme le menu (#wimsmenumodubox) ; fermeture
 * aussi par Échap, par un clic hors du menu ou en suivant un lien. Sans JavaScript, le menu
 * reste dans la page : rien ne se perd. Aucune dépendance (jQuery n'est pas requis).
 */
(function () {
  'use strict';
  function initialiser() {
    var barre = document.getElementById('wimstopbox');
    var menu = document.getElementById('wimsmenumodubox');
    if (!barre || !menu || document.querySelector('.nova-menu-bouton')) return;

    var bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'nova-menu-bouton';
    bouton.setAttribute('aria-controls', 'wimsmenumodubox');
    bouton.setAttribute('aria-expanded', 'false');
    bouton.setAttribute('aria-label', document.documentElement.lang === 'en' ? 'Menu' : 'Menu de la classe');
    bouton.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
    barre.insertBefore(bouton, barre.firstChild);

    function basculer(ouvrir) {
      document.body.classList.toggle('nova-menu-ouvert', ouvrir);
      bouton.setAttribute('aria-expanded', ouvrir ? 'true' : 'false');
      if (ouvrir) {
        var premier = menu.querySelector('a[href]');
        if (premier) premier.focus();
      }
    }
    bouton.addEventListener('click', function () {
      basculer(!document.body.classList.contains('nova-menu-ouvert'));
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('nova-menu-ouvert')) {
        basculer(false);
        bouton.focus();
      }
    });
    document.addEventListener('click', function (e) {
      if (!document.body.classList.contains('nova-menu-ouvert')) return;
      if (menu.contains(e.target) ? e.target.closest('a[href]') : !bouton.contains(e.target)) basculer(false);
    });
  }
  /* Chronomètre d'examen (Nova/_widgets/headmenu.phtml). WIMS fait décompter #chrono_exam
   * (scripts/js/chronoid.js) sans rien changer près de la fin : Nova lit ce texte « mm:ss » et pose
   * l'état sur .nova-chrono (data-etat) — normal, attention (≤ 5 min), critique (≤ 1 min), fin —,
   * change le libellé, l'annonce aux lecteurs d'écran, et affiche un bandeau à 00:00. Les textes
   * viennent des data-texte-* écrits par le widget (lang/name.phtml.<langue>). */
  function chronometre() {
    var boite = document.querySelector('.nova-chrono');
    var temps = document.getElementById('chrono_exam');
    if (!boite || !temps) return;
    var libelle = boite.querySelector('.nova-chrono-libelle');
    var libelleNormal = libelle ? libelle.textContent : '';
    var textes = {
      normal: libelleNormal,
      attention: boite.getAttribute('data-texte-5min'),
      critique: boite.getAttribute('data-texte-1min'),
      fin: boite.getAttribute('data-texte-fin')
    };
    document.body.classList.add('nova-examen');
    var annonce = document.createElement('div');
    annonce.className = 'nova-sr';
    annonce.setAttribute('aria-live', 'assertive');
    document.body.appendChild(annonce);
    var precedent = null;

    function bandeau() {
      if (document.querySelector('.nova-chrono-bandeau')) return;
      var b = document.createElement('div');
      b.className = 'nova-chrono-bandeau';
      b.setAttribute('role', 'alert');
      var fort = document.createElement('strong');
      fort.textContent = textes.fin;
      var detail = document.createElement('span');
      detail.textContent = boite.getAttribute('data-texte-fin-detail') || '';
      b.appendChild(fort);
      b.appendChild(detail);
      var corps = document.querySelector('.wimsbody') || document.body;
      corps.insertBefore(b, corps.firstChild);
    }
    function mettreAJour() {
      var m = /(\d+):(\d\d)/.exec(temps.textContent);
      if (!m) return;
      var s = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
      var etat = s === 0 ? 'fin' : s <= 60 ? 'critique' : s <= 300 ? 'attention' : 'normal';
      if (etat === precedent) return;
      boite.setAttribute('data-etat', etat);
      document.body.setAttribute('data-nova-chrono', etat);
      if (libelle && textes[etat]) libelle.textContent = textes[etat];
      if (etat !== 'normal') annonce.textContent = textes[etat] || '';
      if (etat === 'fin') bandeau();
      precedent = etat;
    }
    new MutationObserver(mettreAJour).observe(temps, { childList: true, characterData: true, subtree: true });
    mettreAJour();

    // Heure de fin, calculée par WIMS (html/examclock.proc) et rangée par tail.phtml dans un
    // <template> : « 01/10/2026 - 10:48:12 » devient « Fin à 10:48 » dans le chronomètre.
    var modele = document.getElementById('nova-fin-examen');
    var heure = modele && /(\d{1,2}:\d{2}):\d{2}/.exec(modele.innerHTML);
    if (heure) {
      var fin = document.createElement('span');
      fin.className = 'nova-chrono-fin';
      fin.textContent = (boite.getAttribute('data-texte-fin-a') || '') + ' ' + heure[1];
      boite.appendChild(fin);
    }
  }

  function demarrer() { initialiser(); chronometre(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();
})();
