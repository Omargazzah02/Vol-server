 // Configuration
 const express = require("express")
const app = express();
const port = 8080;
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');



app.use(cors());



const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://vol-project-b1f97-default-rtdb.firebaseio.com'
  });

  app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));





app.get('/', (req, res) => {
    res.send('Hello World');
  });
// Route pour l'inscription des passagers
app.post('/signup', (req, res) => {
    const { email, password, name, role } = req.body;

    if (email == null || password == null || name == null || role == null) {
        res.status(500).json({ error: "Vous devez remplir tous les champs" });
    } else {
        admin.firestore().collection("users").add({ email: email, password: password, name: name, role: role })
            .then(() => {
                res.status(200).json({ message: "Vous avez inscrit avec succès" });
            })
            .catch((err) => {
                res.status(500).json({ error: err });
            });
    }
});


//se connecter
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "L'email ou le mot de passe est vide" });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: "Le mot de passe est trop court" });
    }

    try {
        const userQuery = await admin.firestore().collection('users').where('email', '==', email).limit(1).get();

        if (userQuery.empty) {
            console.log('Utilisateur non existant.');
            return res.status(404).json({ error: "Utilisateur non existant" });
        }

        const userData = userQuery.docs[0].data();
        const storedPassword = userData.password;
        const userId = userQuery.docs[0].id; // Récupérer l'ID du document

        if (password !== storedPassword) {
            console.log('Mot de passe incorrect.');
            return res.status(401).json({ error: "Mot de passe incorrect" });
        }

        console.log('Mot de passe correct.');
        
        const token = jwt.sign({ id: userId, role: userData.role, name: userData.name }, 'azertyuop', { expiresIn: '1h' });
        return res.status(200).json({ token: token });
    } catch (error) {
        console.error('Erreur lors de l\'authentification:', error);
        return res.status(500).json({ error: 'Une erreur est survenue lors de l\'authentification' });
    }
});




// Middleware pour vérifier le rôle de l'utilisateur passager
const authorizePassenger = (req, res, next) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({ error: 'Token non fourni' });
    }
    jwt.verify(token, "azertyuop", (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Token invalide' });
        }
        if (decoded.role !== 'passager') {
            return res.status(403).json({ error: 'Accès non autorisé - Vous devez être un passager'  });
        }
        console.log(decoded.role);
        res.status(200).json({ message: "Vous avez connecté avec succès" });
        next();
    });
};





// Middleware pour vérifier le rôle de l'utilisateur compagnie
const authorizeCompany = (req, res, next) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({ error: 'Token non fourni' });
    }
    jwt.verify(token, "azertyuop", (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Token invalide' });
        }
        if (decoded.role !== 'compagne') {
            return res.status(403).json({ error: 'Accès non autorisé - Vous devez être un passager'  });
        }
        console.log(decoded.role);
        res.status(200).json({ message: "Vous avez connecté avec succès" });
        next();
    });
   
};





// les routes de compagne 
//add avion

app.post('/add_avion' , async (req, res) => {
    try {
        const { modele ,numeroSerie , capacite  ,poidsMax , id_compagne } = req.body;

        // Ajouter le vol à la collection 'flights' dans Firestore
        const flightRef = await admin.firestore().collection('avions').add({
          modele , numeroSerie , capacite  ,poidsMax , id_compagne

        });

        res.json({ message: 'Vol ajouté avec succès', flightId: flightRef.id });
    } catch (error) {
        console.error('Erreur lors de l\'ajout du vol:', error.message);
        res.status(500).json({ error: 'Erreur lors de l\'ajout du vol' });
    }
});


// Route pour récupérer tous les avions
app.get('/planes',  async (req, res) => {
    try {
        const snapshot = await admin.firestore().collection('avions').get();
        const avions = snapshot.docs.map(doc => doc.data());
        res.json(avions);
    } catch (error) {
        console.error('Erreur lors de la récupération des avions:', error.message);
        res.status(500).json({ error: 'Erreur lors de la récupération des avions' });
    }
});


app.post('/add_flight', async (req, res) => {
    try {
        const { avion, passagers, date, destination, heure_depart, heure_arrivee, duree , id_compagne ,nom_compagne } = req.body;

        // Ajouter le vol à la collection 'flights' dans Firestore
        const flightRef = await admin.firestore().collection('flights').add({
            avion: avion,
            date: date,
            destination: destination,
            heure_depart: heure_depart,
            heure_arrivee: heure_arrivee,
            duree: duree,
            id_compagne : id_compagne, 
            nom_compagne

        });

        res.json({ message: 'Vol ajouté avec succès', flightId: flightRef.id });
    } catch (error) {
        console.error('Erreur lors de l\'ajout du vol:', error.message);
        res.status(500).json({ error: 'Erreur lors de l\'ajout du vol' });
    }
});

// Route pour récupérer tous les vols
app.get('/flights/:id_compagne' ,  async (req, res) => {
    try {
        const idCompagne = req.params.id_compagne;

        const snapshot = await admin.firestore().collection('flights').where('id_compagne', '==', idCompagne).get();
        const flights = [];
        snapshot.forEach(doc => {
            flights.push({ id: doc.id, ...doc.data() }); // Ajouter l'ID du document dans la réponse
        });
        res.json(flights);
    } catch (error) {
        console.error('Erreur lors de la récupération des vols par id_compagne:', error.message);
        res.status(500).json({ error: 'Erreur lors de la récupération des vols par id_compagne' });
    }
});


// Route pour récupérer tous les vols
app.get('/flights', async (req, res) => {
    try {
        const snapshot = await admin.firestore().collection('flights').get();
        const flights = [];
        snapshot.forEach(doc => {
            flights.push({ id: doc.id, ...doc.data() }); // Ajouter l'ID du document dans la réponse
        });
        res.json(flights);
    } catch (error) {
        console.error('Erreur lors de la récupération des vols:', error.message);
        res.status(500).json({ error: 'Erreur lors de la récupération des vols' });
    }
});





// Endpoint pour créer une relation entre un vol et un passager
app.post('/relation-vol-passager',async (req, res) => {
    try {
        const { id_vol, id_passager } = req.body;

        // Référence à la collection de relations vol-passager
        const relationsRef = admin.firestore().collection('relations_vol_passager');
        
        // Ajout d'un document représentant la relation entre le vol et le passager
        await relationsRef.add({
            id_vol: id_vol,
            id_passager: id_passager
        });

        res.status(200).json({ message: 'Relation vol-passager ajoutée avec succès.' });
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la relation vol-passager:', error.message);
        res.status(500).json({ error: 'Erreur lors de l\'ajout de la relation vol-passager.' });
    }
});


//récupere toutes les vols d'un utilisateur 
app.get('/vols-utilisateur/:id_utilisateur', async (req, res) => {
    try {
        const idUtilisateur = req.params.id_utilisateur;

        // Récupérer tous les documents de la collection relations_vol_passager pour l'utilisateur spécifié
        const relationsSnapshot = await admin.firestore().collection('relations_vol_passager').where('id_passager', '==', idUtilisateur).get();

        if (relationsSnapshot.empty) {
            // Si aucune relation vol-passager n'est trouvée pour cet utilisateur, renvoyer une réponse vide
            res.json([]);
            return;
        }

        const vols = [];

        // Pour chaque relation vol-passager trouvée, récupérer les informations du vol associé
        for (const doc of relationsSnapshot.docs) {
            const idVol = doc.data().id_vol;
            const volSnapshot = await admin.firestore().collection('flights').doc(idVol).get();

            if (volSnapshot.exists) {
                const volData = volSnapshot.data();
                vols.push(volData);
            } else {
                console.warn(`Aucun vol trouvé avec l'ID ${idVol}`);
            }
        }

        res.json(vols);
    } catch (error) {
        console.error('Erreur lors de la récupération des vols de l\'utilisateur:', error.message);
        res.status(500).json({ error: 'Erreur lors de la récupération des vols de l\'utilisateur.' });
    }
});






























app.listen(process.env.PORT , () => {
    console.log(`Server is listening at http://localhost:${port}`);
});
