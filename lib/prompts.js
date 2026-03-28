var CATEGORIES = {
  reagir: {
    label: 'Réagir',
    emoji: '💬',
    description: 'Donner ton avis, constater, approuver ou contester',
    mission: 'Tu réagis au post ci-dessous en donnant ton avis.'
  },
  questionner: {
    label: 'Questionner',
    emoji: '❓',
    description: 'Poser une question, creuser un angle',
    mission: 'Tu questionnes un point du post ci-dessous.'
  },
  prolonger: {
    label: 'Prolonger',
    emoji: '➡️',
    description: 'Aller plus loin, ajouter une idée',
    mission: 'Tu prolonges une idée du post ci-dessous.'
  },
  pousser: {
    label: 'Pousser à l\'action',
    emoji: '🎯',
    description: 'Recommander, défier, appeler à agir',
    mission: 'Tu pousses à l\'action en réponse au post ci-dessous.'
  }
};

function buildPrompt(postContent, category, polarity, examples, wordCount, voice, authorInfo) {
  var cat = CATEGORIES[category];
  if (!cat) return null;

  var systemParts = [];

  // Mission
  systemParts.push('Tu commentes sur LinkedIn. ' + cat.mission);

  // Polarité
  if (polarity === 'desaccord') {
    systemParts.push('Position : en désaccord avec l\'auteur.');
  } else {
    systemParts.push('Position : en accord avec l\'auteur.');
  }

  // Voix
  if (voice === 'je') {
    systemParts.push('Écris à la première personne (\"je\").');
  } else {
    systemParts.push('Écris de façon neutre, sans \"je\".');
  }

  // Nombre de mots
  if (wordCount && wordCount > 0) {
    systemParts.push('Objectif : environ ' + wordCount + ' mots.');
  }

  // Exemples
  if (examples && examples.length > 0) {
    var exBlock = 'Voici des exemples du ton et du style à adopter :\n\n' +
      examples.map(function(ex, i) { return 'Exemple ' + (i + 1) + ' :\n' + ex; }).join('\n\n');
    systemParts.push(exBlock);
  }

  // Consigne finale
  systemParts.push('Commente dans la langue du post. Première phrase = ta position ou ta question. Pas d\'introduction, pas de reformulation du post, pas de validation de l\'auteur. Sois spécifique : mentionne un élément concret du post.');

  // User message
  var userParts = [];
  userParts.push('Post LinkedIn\n\n---\n' + postContent + '\n---');

  if (authorInfo) {
    var authorContext = '\nAuteur :';
    if (authorInfo.name) authorContext += ' ' + authorInfo.name;
    if (authorInfo.headline) authorContext += ' — ' + authorInfo.headline;
    userParts.push(authorContext);
  }

  userParts.push('Retourne UNIQUEMENT le commentaire.');

  return {
    system: systemParts.join('\n\n'),
    user: userParts.join('\n')
  };
}
