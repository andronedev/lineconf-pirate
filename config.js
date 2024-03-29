// FICHIER DE CONFIGURATION
// NOTE: Le jeu n'a pas été testé avec d'autres configurations que celles-ci. 

var config = {
    // Taille de la carte
    // ATTENTION ! : POUR MODIFIER LA TAILLE DE LA CARTE VEUILLEZ MODIFIER LES VALEURS DE LA VARIABLE "MAP" DANS LE FICHIER "main.js" DU DOSSIER "public/js"
    // Note : La taille de la carte est définie en pixels.
    MAP: {
        width: 2000,
        height: 2000
    },
    // Si le nombre de bateau est inferieur a MAX_BOATS_IA alors on creer des bateaux IA
    MAX_BOATS_IA: 4,
    // Au dela de MAX_BOATS_IA le bateau a perdu (pour eviter que les IA gagne en boucle)
    MAX_SIZE_IA: 400,
    // Mise a jour de la carte (image de fond)
    BACKGROUND_UPDATE_TIME: 120000,
    // Nombre de Nourriture max (feed / rum)
    FEED_NUMBER: 25,
    // Nombre de Poison max (poison / rum)
    POISON_NUMBER: 35,
    // Nom des bateaux pour les IA
    BOATS_NAME_IA: [
        "Pierre",
        "Julie",
        "Yvan",
        "Pétronille",
        "Madeleine",
        "Géraldine",
        "Yves",
        "Paul",
        "Hugues",
        "Jean-Eudes",
        "Clitorine",
        "Gertrude",
        "Jenifaëlle",
        "Raymond",
        "Joseph",
        "Germaine",
        "Henri",
        "Marcel",
        "Georges",
        "Suzanne",
        "François",
        "Jean-Baptiste",
        "Emile",
        "Maurice",
        "Albert",
        "Alban",
        "Eugène",
        "Leon",
        "Lucien",
        "Auguste",
        "Georgette",
        "Robert",
        "Roger",
        "Eléonore",
        "Odénie",
        "Agathe",
        "Hector",
        "Hubert",
        "Gilles",
        "Ernest",
        "Adolphe",
        "Lucas la grosse merde",
        "Théo le BG interplanétaire",
        "Lennie la Blg"
    ]

} 
module.exports = config;