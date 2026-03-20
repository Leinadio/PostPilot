var PILIER_ORDER = ['declarative', 'interrogative', 'exclamative', 'imperative'];
var PILIER_LABELS = {
  declarative: 'Déclarative',
  interrogative: 'Interrogative',
  exclamative: 'Exclamative',
  imperative: 'Impérative'
};

var COMMENT_CATEGORIES = {
  constat: {
    label: 'Constat',
    emoji: '🔍',
    description: 'Une observation factuelle que le post ne mentionne pas',
    pilier: 'declarative',
    systemPrompt: `Tu commentes sur LinkedIn sous forme déclarative. Chaque phrase est une affirmation. Si le commentaire contient une question, il sera rejeté

Tu poses une observation factuelle que le post ne mentionne pas. Un fait observable, un pattern, une donnée, une tendance

Ton observation est spécifique au sujet du post. Si elle pourrait s'appliquer à n'importe quel post du même domaine, le commentaire sera rejeté

Tu constates, tu ne commentes pas le post. La différence : un constat existe indépendamment du post, il éclaire le sujet par un angle que l'auteur n'a pas couvert

Si ton commentaire ne contient aucun élément factuel vérifiable ou observable, il sera rejeté

Si tu cites un chiffre, il doit être vérifiable. Un chiffre inventé et le commentaire sera rejeté`
  },
  prolongement: {
    label: 'Prolongement',
    emoji: '➡️',
    description: 'Pousser l\'idée du post un cran plus loin',
    pilier: 'declarative',
    systemPrompt: `Tu commentes sur LinkedIn sous forme déclarative. Chaque phrase est une affirmation. Si le commentaire contient une question, il sera rejeté

Tu prolonges la thèse centrale du post. Tu identifies le point où l'auteur s'est arrêté dans son raisonnement et tu formules l'étape suivante qu'il n'a pas atteinte

Ton prolongement reste dans l'axe du post. Il suit la même direction de pensée et pousse plus loin. Un commentaire qui bifurque vers un sujet connexe mais différent sera rejeté

Tu apportes une couche que le post ne contient pas. Une conséquence non formulée, un effet de second ordre, ou ce que cette idée implique à plus grande échelle. Si ton commentaire reformule le post avec d'autres mots, il sera rejeté

Ton prolongement tient en une seule idée. Tu ne prolonges pas tout le post, tu prolonges un point précis de sa thèse. Si le commentaire couvre plusieurs prolongements distincts, il sera rejeté

Le lien entre ton prolongement et le post est immédiat. Le lecteur comprend en une seconde pourquoi ton commentaire découle du post. Si ce lien nécessite une explication intermédiaire, le commentaire sera rejeté`
  },
  contrepied: {
    label: 'Contre-pied',
    emoji: '🔄',
    description: 'Affirmer le contraire avec un argument',
    pilier: 'declarative',
    systemPrompt: `Tu commentes sur LinkedIn sous forme déclarative. Chaque phrase est une affirmation. Si le commentaire contient une question, il sera rejeté

Tu prends le contre-pied du propos du post. Tu affirmes une position opposée ou un angle contradictoire

Ton désaccord est argumenté. Tu avances une raison concrète, un cas, une logique qui soutient ta position inverse

Le ton est affirmé, pas agressif. Tu assumes ta position avec assurance sans attaquer l'auteur

Si ton commentaire contredit sans apporter d'argument, il sera rejeté. Un simple désaccord sans substance sera rejeté`
  },
  angle_mort: {
    label: 'Angle mort',
    emoji: '❓',
    description: 'Ce que le post n\'a pas abordé',
    pilier: 'interrogative',
    systemPrompt: `Tu commentes sur LinkedIn sous forme interrogative. Le cœur de ton commentaire est une question

Tu pointes un aspect que le post n'aborde pas. Un angle oublié, une implication ignorée, un cas non couvert

Ta question vient d'un vrai angle mort du post, pas d'un détail secondaire. Elle doit faire réfléchir l'auteur sur ce qu'il n'a pas envisagé

Ta question est ouverte. Si on peut y répondre par oui ou non, le commentaire sera rejeté

Si ta question est en réalité une affirmation déguisée, le commentaire sera rejeté

Si le commentaire contient plus d'une question, il sera rejeté`
  },
  mise_a_lepreuve: {
    label: 'Mise à l\'épreuve',
    emoji: '⚡',
    description: 'Tester la solidité du propos',
    pilier: 'interrogative',
    systemPrompt: `Tu commentes sur LinkedIn sous forme interrogative. Le cœur de ton commentaire est une question

Tu testes la solidité du propos du post. Ta question cible une hypothèse implicite, une généralisation, ou un point faible du raisonnement

Ta question met en tension un élément précis du post. Elle force l'auteur à défendre ou nuancer sa position

Le ton est curieux et constructif, pas hostile. Tu cherches à comprendre les limites du propos, pas à piéger

Si ta question ne cible pas un élément spécifique du post, le commentaire sera rejeté

Si le commentaire contient plus d'une question, il sera rejeté`
  },
  curiosite: {
    label: 'Curiosité',
    emoji: '🔎',
    description: 'Demander un détail, un exemple, un vécu',
    pilier: 'interrogative',
    systemPrompt: `Tu commentes sur LinkedIn sous forme interrogative. Le cœur de ton commentaire est une question

Tu creuses un point du post en demandant un détail, un exemple concret, ou un vécu spécifique

Ta question porte sur un élément précis du post que tu veux voir approfondi. Pas une question générale sur le sujet

Tu manifestes un intérêt sincère. Ta curiosité est dirigée vers quelque chose de spécifique dans le contenu du post

Si ta question pourrait être posée sans avoir lu le post, le commentaire sera rejeté

Si le commentaire contient plus d'une question, il sera rejeté`
  },
  resonance: {
    label: 'Résonance',
    emoji: '💫',
    description: 'Le post fait écho à un vécu ou une conviction',
    pilier: 'exclamative',
    systemPrompt: `Tu commentes sur LinkedIn sous forme exclamative. Ton commentaire exprime une réaction, un ressenti

Le post fait écho à quelque chose que tu as vécu ou à une conviction profonde. Tu exprimes cette résonance

Tu ancres ta réaction dans un élément précis du post. Ce n'est pas le post en général qui te parle, c'est un point spécifique

Ta résonance est personnelle et située. Elle révèle pourquoi ce point te touche, en lien avec ton propre parcours ou tes convictions

Si ton commentaire est une approbation générique du post, il sera rejeté. La résonance vise un élément précis, pas le post entier

Si ton commentaire pourrait s'appliquer à n'importe quel post inspirant, il sera rejeté`
  },
  etonnement: {
    label: 'Étonnement',
    emoji: '😮',
    description: 'Quelque chose dans le post surprend',
    pilier: 'exclamative',
    systemPrompt: `Tu commentes sur LinkedIn sous forme exclamative. Ton commentaire exprime une réaction, un ressenti

Quelque chose dans le post te surprend. Tu exprimes cet étonnement et tu expliques pourquoi

Tu identifies précisément ce qui te surprend. Un chiffre, une affirmation, un retournement, une contradiction avec ce que tu observes

Ton étonnement est authentique et argumenté. Tu ne fais pas semblant d'être surpris pour flatter l'auteur

Si ton commentaire ne précise pas ce qui te surprend et pourquoi, il sera rejeté

Si ton étonnement est générique et ne cible rien de spécifique dans le post, il sera rejeté`
  },
  enthousiasme: {
    label: 'Enthousiasme',
    emoji: '🚀',
    description: 'Une idée du post mérite d\'être amplifiée',
    pilier: 'exclamative',
    systemPrompt: `Tu commentes sur LinkedIn sous forme exclamative. Ton commentaire exprime une réaction, un ressenti

Une idée spécifique du post te semble particulièrement forte. Tu l'amplifie en expliquant pourquoi elle compte

Tu cibles un élément précis du post, pas le post dans son ensemble. Ton enthousiasme est chirurgical

Tu expliques l'impact ou la portée de cette idée. Pourquoi elle change quelque chose, pourquoi elle mérite attention

Si ton commentaire est un compliment général sur le post, il sera rejeté. L'enthousiasme porte sur une idée précise

Si tu n'expliques pas pourquoi cette idée est forte, le commentaire sera rejeté`
  },
  defi: {
    label: 'Défi',
    emoji: '🎯',
    description: 'Lancer un challenge concret lié au sujet',
    pilier: 'imperative',
    systemPrompt: `Tu commentes sur LinkedIn sous forme impérative. Ton commentaire pousse à l'action

Tu lances un défi concret en lien avec le sujet du post. Le défi est actionnable et spécifique

Ton défi découle directement du contenu du post. Il pousse l'auteur ou les lecteurs à tester, expérimenter, ou vérifier quelque chose

Le défi est réaliste et faisable. Pas un idéal abstrait, une action que quelqu'un peut entreprendre

Si ton défi est vague ou pourrait s'appliquer à n'importe quel sujet, le commentaire sera rejeté

Si ton défi n'a pas de lien direct avec le contenu du post, le commentaire sera rejeté`
  },
  recommandation: {
    label: 'Recommandation',
    emoji: '📌',
    description: 'Pousser vers une ressource, une méthode, un essai',
    pilier: 'imperative',
    systemPrompt: `Tu commentes sur LinkedIn sous forme impérative. Ton commentaire pousse à l'action

Tu recommandes quelque chose de concret en lien avec le sujet du post. Un outil, un livre, une méthode, un framework, une pratique

Ta recommandation est spécifique et nommée. Pas un concept générique, quelque chose qu'on peut chercher et utiliser

Tu expliques en quoi cette recommandation est pertinente par rapport au contenu du post

N'invente jamais une ressource qui n'existe pas. Une recommandation fictive et le commentaire sera rejeté

Si ta recommandation est vague ou pourrait accompagner n'importe quel post, le commentaire sera rejeté`
  },
  appel: {
    label: 'Appel',
    emoji: '📢',
    description: 'Inviter l\'auteur ou les lecteurs à faire quelque chose',
    pilier: 'imperative',
    systemPrompt: `Tu commentes sur LinkedIn sous forme impérative. Ton commentaire pousse à l'action

Tu invites l'auteur ou les lecteurs à faire quelque chose de précis. Une réflexion à mener, une habitude à adopter, une expérience à tenter

Ton appel est ancré dans le contenu du post. Il prolonge le propos en direction concrète

L'action que tu proposes est claire et immédiate. Quelqu'un qui lit ton commentaire sait exactement quoi faire

Si ton appel est une généralité motivationnelle sans lien avec le post, le commentaire sera rejeté

Si l'action proposée est vague ou abstraite, le commentaire sera rejeté`
  }
};

function getWordCount(text) {
  return text.trim().split(/\s+/).filter(function(w) { return w.length > 0; }).length;
}

function getExamplesWordStats(examples) {
  var counts = examples.map(function(ex) { return getWordCount(ex); });
  var min = Math.min.apply(null, counts);
  var max = Math.max.apply(null, counts);
  var avg = Math.round(counts.reduce(function(a, b) { return a + b; }, 0) / counts.length);
  return { min: min, max: max, avg: avg };
}

function buildPrompt(type, postContent, voice, polarity, examples, wordCount) {
  var category = COMMENT_CATEGORIES[type];
  if (!category) return null;

  var systemParts = [];

  // Word count FIRST — highest priority
  if (wordCount && wordCount > 0) {
    systemParts.push("RÈGLE ABSOLUE. Le commentaire fait au maximum " + wordCount + " mots. Cette limite est non négociable. Ignore la longueur des exemples ci-dessous, ils servent uniquement de référence de style. Seule la limite de " + wordCount + " mots compte");
  }

  if (examples && examples.length > 0) {
    var examplesBlock = "RÉFÉRENCE DE STYLE. Les commentaires ci-dessous illustrent ta voix. Inspire-toi uniquement de leur ton, leur registre de langue, leurs tournures d'ouverture et leur degré de familiarité. Ignore leur longueur\n\nReprends le registre de langue exact. Si les exemples sont familiers, sois familier. Si les exemples sont soutenus, sois soutenu. Un écart de registre et le commentaire sera rejeté\n\n" + examples.map(function(ex, i) { return "Exemple " + (i + 1) + "\n" + ex; }).join("\n\n") + "\n\nNe recopie aucune phrase exacte de ces exemples. Le contenu est original, la voix est identique";
    systemParts.push(examplesBlock);
  }

  systemParts.push(category.systemPrompt);

  if (voice === 'neutre') {
    systemParts.push("VOIX NEUTRE. N'utilise jamais \"je\", \"j'\", \"me\", \"m'\", \"moi\", \"mon\", \"ma\", \"mes\" dans le commentaire. Formulations impersonnelles et observations détachées. Si le commentaire contient une de ces formes, il sera rejeté");
  } else {
    systemParts.push("VOIX PERSONNELLE. Utilise \"je\" naturellement. Le commentaire est ta réaction en première personne");
  }

  if (polarity === 'negative') {
    systemParts.push("FORME NÉGATIVE. Chaque phrase de ton commentaire est construite à la forme négative. Tu nies, tu contestes, tu réfutes. Si une seule phrase est à la forme affirmative, le commentaire sera rejeté");
  } else {
    systemParts.push("FORME AFFIRMATIVE. Chaque phrase de ton commentaire est construite à la forme affirmative. Tu affirmes, tu poses, tu constates. Si une seule phrase est à la forme négative, le commentaire sera rejeté");
  }

  // Repeat word count at end for maximum enforcement
  if (wordCount && wordCount > 0) {
    systemParts.push("RAPPEL LIMITE DE MOTS. Maximum " + wordCount + " mots. Compte chaque mot. Si le commentaire dépasse " + wordCount + " mots, il sera rejeté");
  }

  var user = "Post LinkedIn\n\n---\n" + postContent + "\n---\n\nCommente dans la langue du post.\n\nRetourne UNIQUEMENT le commentaire final. Rien d'autre.";

  return {
    system: systemParts.join('\n\n'),
    user: user
  };
}

var buildResizePrompt = function(direction, comment) {
  if (direction === 'shorter') {
    var system = 'Raccourcis ce commentaire LinkedIn. Chaque phrase dit la même chose en moins de mots. Tu peux fusionner des phrases si c\'est plus naturel\n\nSi une idée du commentaire original disparaît, le commentaire sera rejeté\n\nZéro hashtag. Zéro émoji. Zéro tiret cadratin. Zéro tiret demi-cadratin. Zéro deux-points. Un seul de ces caractères et le commentaire sera rejeté\n\nMême ton, même registre. Retour à la ligne entre chaque phrase';
    var user = "Commentaire à raccourcir\n\n" + comment + "\n\nRetourne UNIQUEMENT le commentaire raccourci.";
    return { system: system, user: user };
  }

  var system = 'Développe ce commentaire LinkedIn. Chaque phrase peut être plus détaillée, plus aérée. Tu peux découper une phrase dense en deux si c\'est plus naturel\n\nSi tu ajoutes une idée qui n\'était pas dans le commentaire original, le commentaire sera rejeté\n\nZéro hashtag. Zéro émoji. Zéro tiret cadratin. Zéro tiret demi-cadratin. Zéro deux-points. Un seul de ces caractères et le commentaire sera rejeté\n\nMême ton, même registre. Retour à la ligne entre chaque phrase';
  var user = "Commentaire à développer\n\n" + comment + "\n\nRetourne UNIQUEMENT le commentaire développé.";

  return { system: system, user: user };
};
