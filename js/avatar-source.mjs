// Nova : avatar de l'eleve. Source du paquet js/avatar.js (DiceBear 9.2.2, style Avataaars) ; voir js/avatar.LISEZMOI.txt.
import { createAvatar } from '@dicebear/core';
import * as avataaars from '@dicebear/avataaars';
window.novaAvatar = function (options) { return createAvatar(avataaars, options).toDataUri(); };
