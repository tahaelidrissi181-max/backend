const express = require('express');
const app = express();
const cors = require('cors');
const helmet = require('helmet');
const mysql = require("mysql2/promise");
const jwt = require("jsonwebtoken");
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const fs = require('fs');
require('dotenv').config();
const PORT = process.env.PORT || 5000;
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
})); 
const sql = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
/*{
  origin:  'https://your-frontend-domain.com',
  credentials: true
}*/

// Middleware to parse JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

app.use('/uploads', express.static('uploads'));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/ouvriers');
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueName + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only images allowed'));
    }
  }
});

app.post('/ouvriers', upload.single('photo'), async (req, res) => {
  try {
    const {
      nom_complet,
      phone,
      email,
      localisation,
      specialite,
      ranking,
      languages,
      competences,
      education,
      experience,
      status
    } = req.body;

    // Check email
    if (email) {
      const [existingEmail] = await sql.query(
        'SELECT id, nom_complet FROM ouvriers WHERE email = ?',
        [email]
      );
      if (existingEmail.length > 0) {
        return res.status(400).json({
          message: `Cet email est déjà utilisé par "${existingEmail[0].nom_complet}".`,
          field: 'email'
        });
      }
    }
    if (phone) {
      const [existingPhone] = await sql.query(
        'SELECT id, nom_complet FROM ouvriers WHERE phone = ?',
        [phone]
      );
      if (existingPhone.length > 0) {
        return res.status(400).json({
          message: `Ce numéro est déjà utilisé par "${existingPhone[0].nom_complet}".`,
          field: 'phone'
        });
      }
    }
const photoPath = req.file ? req.file.path.replace(/\\/g, '/') : null;
    const [result] = await sql.query(
      `INSERT INTO ouvriers 
      (photo, nom_complet, phone, email, localisation, specialite, education, competence, experience, langues, ranking, status, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        photoPath,
        nom_complet,
        phone,
        email,
        localisation,
        specialite,
        education,
        competences,  // maps to competence
        experience,
        languages,    // maps to langues
        ranking,
        status
      ]
    );

    res.status(201).json({
      message: 'Ouvrier créé',
      id: result.insertId,
      photoPath
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.post('/demandes', async (req, res) => {
  try {
    const {entreprise,poste,competences_requises,type_contrat,salaire_min,salaire_max,description,nombre_postes,date_entretien,lieu_entretien } = req.body;
    await sql.query(`INSERT INTO demandes(entrepriseID, poste,NumPostes, competence, contrat, min, max, description, dateEntretien, localEntretien, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,[entreprise,poste,nombre_postes,competences_requises,type_contrat,salaire_min,salaire_max,description,date_entretien,lieu_entretien]);

    res.status(201).json({ message: 'Demande created successfully' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Insert failed' });
  }
});

app.put('/demandes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {poste,competences_requises,type_contrat,salaire_min,salaire_max,status,description,nombre_postes,date_entretien,lieu_entretien } = req.body;
    const [result] = await sql.query(
      `UPDATE demandes SET poste = ?,competence = ?,contrat = ?,NumPostes = ?,min = ?,max = ?,status = ?,description = ?,dateEntretien = ?,localEntretien = ?,updated_at = NOW() WHERE id = ?`,[poste,competences_requises,type_contrat,nombre_postes,salaire_min,salaire_max,status,description,date_entretien,lieu_entretien,id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Demande not found" });
    }

    res.json({ message: "Demande updated successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Update failed" });
  }
});

app.delete('/demandes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await sql.query(
      `DELETE FROM demandes WHERE id = ?`,
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Demande introuvable" });
    }
    res.json({ message: "Demande supprimée avec succès" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la suppression" });
  }
});


app.put('/status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {status} = req.body;

    const [result] = await sql.query(`UPDATE demandes SET status = ? WHERE id = ?`,[status,id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Demande not found" });
    }

    res.json({ message: "Demande updated successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Update failed" });
  }
});

const indexRoutes = require('./routes/index');

app.use('/', indexRoutes);
const auth= (req, res, next) => {
  const token = req.headers['access_token'];
  if (!token) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { userId: ... }
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid token" });
  }
};

app.get("/me", auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const rows = await sql.query(
      "SELECT id,name, email, role, created_at FROM users WHERE id = ?",
      [userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json({
    user: rows[0]
})
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
  /*return res.json({
    message: "Authenticated",
    user: req.user,
});*/
});

app.get('/ouvriers', async (req, res) => {
  try {
    const [rows] = await sql.query(
      'SELECT * FROM ouvriers ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching workers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching workers',
      error: error.message
    });
  }
});

app.delete('/ouvrier/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await sql.query(`DELETE FROM ouvriers WHERE id=?`,[id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Demande introuvable" });
    }
    res.json({ message: "Demande supprimée avec succès" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la suppression" });
  }
});

app.put('/ouvrier/:id', upload.single('photo'), async (req, res) => {
  const { id } = req.params;
  const {
    nom_complet,
    phone,
    email,
    localisation,
    specialite,
    education,
    competence,
    experience,
    langues,
    ranking,
    status
  } = req.body;

  try {
    // ✅ 1. FIRST: Get existing ouvrier from database
    const [rows] = await sql.query('SELECT * FROM ouvriers WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Ouvrier non trouvé' });
    }

    const existing = rows[0];

    // ✅ 2. THEN: Validate email uniqueness (if email is being changed)
    if (email && email !== existing.email) {
      const [existingEmail] = await sql.query(
        'SELECT id, nom_complet FROM ouvriers WHERE email = ? AND id != ?',
        [email, id]
      );
      
      if (existingEmail.length > 0) {
        return res.status(400).json({ 
          message: `Cet email est déjà utilisé par "${existingEmail[0].nom_complet}".`,
          field: 'email'
        });
      }
    }

    // ✅ 3. Validate phone uniqueness (if phone is being changed)
    if (phone && phone !== existing.phone) {
      const [existingPhone] = await sql.query(
        'SELECT id, nom_complet FROM ouvriers WHERE phone = ? AND id != ?',
        [phone, id]
      );
      
      if (existingPhone.length > 0) {
        return res.status(400).json({ 
          message: `Ce numéro de téléphone est déjà utilisé par "${existingPhone[0].nom_complet}".`,
          field: 'phone'
        });
      }
    }

    // ✅ 4. Handle photo upload
    let photoPath = existing.photo;
    if (req.file) {
      if (existing.photo && fs.existsSync(existing.photo)) {
        fs.unlinkSync(existing.photo);
      }
photoPath = req.file.path.replace(/\\/g, '/');
    }

    // ✅ 5. Update the ouvrier
    await sql.query(
      `UPDATE ouvriers SET 
        photo = ?,
        nom_complet = ?,
        phone = ?,
        email = ?,
        localisation = ?,
        specialite = ?,
        education = ?,
        competence = ?,
        experience = ?,
        langues = ?,
        ranking = ?,
        status = ?,
        updated_at = NOW() 
      WHERE id = ?`,
      [
        photoPath,
        nom_complet ?? existing.nom_complet,
        phone ?? existing.phone,
        email ?? existing.email,
        localisation ?? existing.localisation,
        specialite ?? existing.specialite,
        education ?? existing.education,
        competence ?? existing.competence,
        experience ?? existing.experience,
        langues ?? existing.langues,
        ranking ?? existing.ranking,
        status ?? existing.status,
        id
      ]
    );

    // ✅ 6. Return updated ouvrier
    const [updated] = await sql.query('SELECT * FROM ouvriers WHERE id = ?', [id]);
    return res.status(200).json({ 
      message: 'Ouvrier mis à jour avec succès', 
      ouvrier: updated[0] 
    });

  } catch (err) {
    console.error('Error updating ouvrier:', err);
    return res.status(500).json({ 
      message: 'Erreur serveur', 
      error: err.message 
    });
  }
});

app.get('/ouvrier/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const rows= await sql.query(
      'SELECT * FROM ouvriers WHERE id = ?',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ouvrier not found'
      });
    }
    res.json({worker:rows[0]});
  } catch (error) {
    console.error('Error fetching worker:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching worker',
      error: error.message
    });
  }
});

app.get('/entreprises', async (req, res) => {
  try {
    const [rows] = await sql.query(
      'SELECT e.*, a.id AS abonnement_id,a.type AS abonnement_type,a.price AS abonnement_price,a.created_at AS abonnement_created_at,a.updated_at AS abonnement_updated_at FROM entreprise e LEFT JOIN abonnement a ON a.id = e.abonnementID ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching workers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching workers',
      error: error.message
    });
  }
});

app.get('/entreprises/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await sql.query('SELECT e.*, a.id   AS abonnement_id,a.type AS abonnement_type,a.price AS abonnement_price,a.created_at AS abonnement_created_at,a.updated_at AS abonnement_updated_at FROM entreprise e LEFT JOIN abonnement a ON a.id = e.abonnementID WHERE e.id = ?', [id]);
    const results = rows[0]; // actual array of rows
    if (!results || results.length === 0) {
      return res.status(404).json({ success: false, message: 'Entreprise introuvable' });
    }
    res.json({ entreprise: results[0] }); // ✅ send first (and only) object
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
});


app.delete('/entreprise/:id', async (req, res) => {
  const connection = await sql.getConnection();
  try {
    const { id } = req.params;

    await connection.beginTransaction();
    await connection.query(
      `DELETE FROM demandes WHERE entrepriseID = ?`,
      [id]
    );

    const [result] = await connection.query(
      `DELETE FROM entreprise WHERE id = ?`,
      [id]
    );
    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Entreprise introuvable" });
    }
    await connection.commit();
    res.json({ message: "Entreprise et ses demandes supprimées avec succès" });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la suppression" });
  } finally {
    connection.release();
  }
});


app.get('/demandes', async (req, res) => {
  try {
    const [rows] = await sql.query('SELECT d.id,d.entrepriseID,d.poste,d.competence,d.contrat,d.NumPostes,d.min,d.max,d.status,d.description,d.dateEntretien,d.localEntretien,d.created_at,d.updated_at,e.logo,e.nom,e.phone1,e.phone2,e.location,e.email,e.secteur FROM demandes d JOIN entreprise e ON e.id = d.entrepriseID and d.status!="Traité" ORDER BY d.created_at DESC;');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching workers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching workers',
      error: error.message
    });
  }
});

app.get('/demande/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const rows= await sql.query(
      'SELECT d.id,d.entrepriseID,d.poste,d.competence,d.contrat,d.NumPostes,d.min,d.max,d.status,d.description,d.reunion,d.dateEntretien,d.localEntretien,d.created_at,d.updated_at,e.logo,e.nom,e.phone1,e.phone2,e.location,e.email,e.secteur FROM demandes d JOIN entreprise e ON e.id = d.entrepriseID WHERE d.id = ?',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ouvrier not found'
      });
    }
    res.json({demande:rows[0]});
  } catch (error) {
    console.error('Error fetching worker:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching worker',
      error: error.message
    });
  }
});

app.get('/abonnement', async (req, res) => {
  try {
    const [rows] = await sql.query('SELECT * FROM abonnement');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching workers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching workers',
      error: error.message
    });
  }
});

app.post('/login',async (req, res) => {
    const { email, password } = req.body;
    try {
      const [rows] = await sql.query('SELECT * FROM users WHERE email = ?', [email]);
      if (rows.length === 0) return res.status(401).json({ message: 'Invalid credentials' });

      const user = rows[0];
      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(401).json({ message: 'Invalid credentials',user });
      

      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: "360m" }
      );

      res.json({ message: 'Login successful!', token,user });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

const stokage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/entreprises');
  },
  filename: function (req, file, cb) {
    const uniqueName =
      Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueName + path.extname(file.originalname));
  }
});

const uploader = multer({
  storage: stokage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

app.post('/entreprises', uploader.fields([{ name: 'logo', maxCount: 1 },{ name: 'contrat', maxCount: 1 }]), async (req, res) => {
  try {
    const { nom, phone1, phone2, email, location, responsable, type_abonnement, rating, secteur } = req.body;

    // ✅ Vérifier si l'email existe déjà
    if (email) {
      const [existingEmail] = await sql.query(
        'SELECT id, nom FROM entreprise WHERE email = ?',
        [email]
      );
      
      if (existingEmail.length > 0) {
        return res.status(400).json({ 
          message: `Cet email est déjà utilisé par l'entreprise "${existingEmail[0].nom}".`,
          field: 'email'
        });
      }
    }

    // ✅ Vérifier si le téléphone existe déjà
    if (phone1) {
      const [existingPhone] = await sql.query(
        'SELECT id, nom FROM entreprise WHERE phone1 = ?',
        [phone1]
      );
      
      if (existingPhone.length > 0) {
        return res.status(400).json({ 
          message: `Ce numéro de téléphone est déjà utilisé par l'entreprise "${existingPhone[0].nom}".`,
          field: 'phone1'
        });
      }
    }

    // Si validation OK, procéder à l'insertion
    const logoPath = req.files?.logo?.[0]?.path.replace(/\\/g, '/') || null;
    const contratPath = req.files?.contrat?.[0]?.path.replace(/\\/g, '/') || null;
    
    const [result] = await sql.query(
      `INSERT INTO entreprise 
      (nom, phone1, phone2, email, location, responsable, abonnementId, rating, secteur, logo, contrat) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nom, phone1, phone2, email, location, responsable, type_abonnement, rating, secteur, logoPath, contratPath]
    );

    return res.status(201).json({
      message: 'Entreprise créée avec succès',
      id: result.insertId,
      logoPath: logoPath,
      contratPath: contratPath
    });

  } catch (err) {
    console.error('Error creating entreprise:', err);
    res.status(500).json({ message: 'Erreur lors de la création de l\'entreprise' });
  }
});


app.put('/entreprise/:id', uploader.fields([{ name: 'logo', maxCount: 1 }, { name: 'contrat', maxCount: 1 }]), async (req, res) => {
  
  const { id } = req.params;
  const { nom_entreprise, secteur_activite, responsable, localisation, phone1, phone2, email, abonnement, ranking, status } = req.body;

  try {
    const [duplicates] = await sql.query(
      'SELECT id, email, phone1, phone2 FROM entreprise WHERE (email = ? OR phone1 = ? OR phone2 = ?) AND id != ?',
      [email, phone1, phone1, id]
    );
    if (duplicates.length > 0) {
      const dup = duplicates[0];
      if (dup.email === email) return res.status(409).json({ field: 'email', message: 'Cet email est déjà utilisé par une autre entreprise.' });
      if (dup.phone1 === phone1 || dup.phone2 === phone1) return res.status(409).json({ field: 'phone1', message: 'Ce numéro est déjà utilisé par une autre entreprise.' });
    }
    const [rows] = await sql.query('SELECT * FROM entreprise WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Entreprise non trouvée' });
    const existing = rows[0];

    // Handle logo
    let logoPath = existing.logo;
    if (req.files?.logo?.[0]) {
      if (existing.logo && fs.existsSync(existing.logo)) fs.unlinkSync(existing.logo);
        logoPath = req.files.logo[0].path.replace(/\\/g, '/');
    }

    // Handle contrat
    let contratPath = existing.contrat;
    if (req.files?.contrat?.[0]) {
      if (existing.contrat && fs.existsSync(existing.contrat)) fs.unlinkSync(existing.contrat);
contratPath = req.files.contrat[0].path.replace(/\\/g, '/');
    }

    await sql.query(
      `UPDATE entreprise SET
        nom           = ?,
        secteur       = ?,
        responsable   = ?,
        location      = ?,
        phone1        = ?,
        phone2        = ?,
        email         = ?,
        abonnementID  = ?,
        rating        = ?,
        status        = ?,
        logo          = ?,
        contrat       = ?,
        updated_at    = NOW()
      WHERE id = ?`,
      [
        nom_entreprise   || existing.nom,
        secteur_activite || existing.secteur,
        responsable      || existing.responsable,
        localisation     || existing.location,
        phone1           || existing.phone1,
        phone2           ?? existing.phone2,
        email            || existing.email,
        abonnement       || existing.abonnementID,
        ranking          || existing.rating,
        status           || existing.status,
        logoPath,
        contratPath,
        id
      ]
    );

    const [updated] = await sql.query('SELECT * FROM entreprise WHERE id = ?', [id]);
    return res.status(200).json({ message: 'Entreprise mise à jour avec succès', entreprise: updated[0] });

  } catch (err) {
    console.error('Error updating entreprise:', err);
    return res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
});

app.get('/users', async (req, res) => {
  try {
    const [rows] = await sql.query('SELECT * FROM users ORDER BY created_at DESC;');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
});


app.post('/users', async (req, res) => {
  try {
    const { name, email, password, role, status } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        message: "Name, email, password and role are required"
      });
    }
    const [existing] = await sql.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    if (existing.length > 0) {
      return res.status(409).json({
        message: "Email already exists"
      });
    }
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const [result] = await sql.query(
      `INSERT INTO users (name,email,password,role,status,created_at,updated_at)
       VALUES (?,?,?,?,?,NOW(),NOW())`,[name,email,hashedPassword,role,status ]
    );
    return res.status(201).json({
      message: "User created successfully",
      userId: result.insertId
    });
  } catch (err) {
    console.error("Error creating user:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
});



app.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, password, role, status } = req.body;

  try {
    // Check if user exists
    const [rows] = await sql.query(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const existingUser = rows[0];

    // If password is provided → hash it
    let hashedPassword = existingUser.password;
    if (password && password.trim() !== '') {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    await sql.query(
      `UPDATE users SET
        name = ?,
        email = ?,
        password = ?,
        role = ?,
        status = ?,
        updated_at = NOW()
       WHERE id = ?`,
      [
        name ?? existingUser.name,
        email ?? existingUser.email,
        hashedPassword,
        role ?? existingUser.role,
        status ?? existingUser.status,
        id
      ]
    );

    res.json({ message: 'Utilisateur mis à jour avec succès' });

  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.delete('/user/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await sql.query(
      `DELETE FROM users WHERE id = ?`,
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "user introuvable" });
    }
    res.json({ message: "user supprimée avec succès" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la suppression" });
  }
});

app.get('/reunions', async (req, res) => {
  try {
    const [rows] = await sql.query('SELECT d.id,d.entrepriseID,d.poste,d.competence,d.contrat,d.NumPostes,d.min,d.max,d.status,d.description,d.dateEntretien,d.localEntretien,d.reunion,d.created_at,d.updated_at,e.logo,e.nom,e.phone1,e.phone2,e.location,e.email,e.secteur FROM demandes d JOIN entreprise e ON e.id = d.entrepriseID and d.status="Traité" ORDER BY d.created_at DESC;');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching workers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching workers',
      error: error.message
    });
  }
});

app.put('/reunion/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {reunion} = req.body;

    const [result] = await sql.query(`UPDATE demandes SET reunion = ? WHERE id = ?`,[reunion,id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Demande not found" });
    }

    res.json({ message: "Demande updated successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Update failed" });
  }
});

app.get('/mise', async (req, res) => {
  try {
    const [rows] = await sql.query(`
      SELECT 
        d.id,
        d.entrepriseID,
        d.poste,
        d.competence,
        d.contrat,
        d.NumPostes,
        d.min,
        d.max,
        d.status,
        d.description,
        d.dateEntretien,
        d.localEntretien,
        d.reunion,
        d.created_at,
        d.updated_at,
        e.logo,
        e.nom,
        e.phone1,
        e.phone2,
        e.location,
        e.email,
        e.secteur,
        COUNT(m.id) AS totalMises
      FROM demandes d
      JOIN entreprise e 
        ON e.id = d.entrepriseID
      LEFT JOIN mise m 
        ON m.demandeID = d.id
      WHERE d.status = "Traité"
        AND d.reunion = "Traité"
      GROUP BY d.id
      ORDER BY d.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching demandes:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des demandes',
      error: error.message
    });
  }
});

app.post('/mise', async (req, res) => {
  try {
    const { ouvrierID, demandeID } = req.body;

    const [existing] = await sql.query(
      'SELECT id FROM mise WHERE ouvrierID = ? AND demandeID = ?',
      [ouvrierID, demandeID]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "This ouvrier is already assigned to this demande"
      });
    }
    const [result] = await sql.query(
      `INSERT INTO mise (ouvrierID, demandeID, created_at)
       VALUES (?, ?, NOW())`,
      [ouvrierID, demandeID]
    );

    res.status(201).json({
      success: true,
      message: "Mise added successfully",
      id: result.insertId
    });

  } catch (error) {
    console.error("Error adding mise:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});


app.get('/countmises/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await sql.query(`SELECT COUNT(m.id) AS total_mise FROM mise m JOIN demandes d ON demandeID = d.id WHERE d.entrepriseID =?`,[id]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching workers:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des ouvriers',
      error: error.message
    });
  }
});
app.get('/mises/count/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await sql.query(`
      SELECT 
        d.NumPostes,
        COUNT(m.id) AS totalMises
      FROM demandes d
      JOIN entreprise e 
        ON e.id = d.entrepriseID
      LEFT JOIN mise m 
        ON m.demandeID = d.id
      WHERE d.id = ?
        AND d.status = "Traité"
        AND d.reunion = "Traité"
      GROUP BY d.id
    `, [id]);
    res.json(rows[0]);

  } catch (error) {
    console.error("Error counting mises:", error);
    res.status(500).json({
      message: "Erreur lors du comptage des mises"
    });
  }
});

app.get('/mises/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await sql.query(
      `SELECT m.id AS mise_id,m.ouvrierID,m.demandeID,m.created_at AS mise_created_at,o.id AS ouvrier_id,o.nom_complet,o.phone,o.email,o.localisation,o.specialite,o.ranking,o.status AS ouvrier_status FROM mise m JOIN ouvriers o ON o.id = m.ouvrierID WHERE m.demandeID = ? ORDER BY m.created_at DESC`,[id]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching workers:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des ouvriers',
      error: error.message
    });
  }
});

app.delete('/mise/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await sql.query(
      `DELETE FROM mise WHERE id = ?`,
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Mise introuvable" });
    }
    res.json({ message: "Mise supprimée avec succès" });
  } catch (err) {
    console.error("Error deleting mise:", err);
    res.status(500).json({ message: "Erreur lors de la suppression de la mise" });
  }
});



app.get('/insc', async (req, res) => {
  try {
    const [rows] = await sql.query('SELECT i.id,i.entrepriseID,i.abonnementID,i.month,i.year,i.price,i.created_at,i.updated_at,e.logo,e.nom,e.status,e.secteur,e.id as entid FROM entreprise e LEFT JOIN (SELECT i1.* FROM inscription i1 INNER JOIN (SELECT entrepriseID, MAX(id) AS last_id FROM inscription GROUP BY entrepriseID) latest ON i1.id = latest.last_id) i ON e.id = i.entrepriseID ORDER BY e.created_at DESC;');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching workers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching workers',
      error: error.message
    });
  }
});

app.get('/insc/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await sql.query('SELECT i.id AS inscription_id,i.entrepriseID,i.abonnementID,i.month,i.year,i.price,i.created_at AS inscription_created_at,i.updated_at AS inscription_updated_at,a.id AS abonnement_id,a.type AS abonnement_type,a.price AS abonnement_price FROM inscription i JOIN abonnement a ON i.abonnementID = a.id WHERE i.entrepriseID = ? ORDER BY i.created_at DESC',
      [id]
    );
    const results = rows[0]; 
    res.json({ inscriptions: rows[0] ?? [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }})

app.delete('/insc/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await sql.query(
      `DELETE FROM inscription WHERE id = ?`,
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Demande introuvable" });
    }
    res.json({ message: "Demande supprimée avec succès" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la suppression" });
  }
});

app.post('/insc', async (req, res) => {
  try {
    const {entrepriseID,abonnementID,month,year,price} = req.body;
  sql.query(`INSERT INTO inscription (entrepriseID, abonnementID, month, year, price, created_at, updated_at) VALUES (?, ?, ?, ?, ?, now(), now())`,
    [entrepriseID, abonnementID, month, year, price])

    res.status(201).json({ message: 'success' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Insert failed' });
  }
});

app.get('/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const [[counts]] = await sql.query(
      `SELECT 
        (SELECT COUNT(*) FROM entreprise 
         WHERE created_at BETWEEN ? AND ?) AS total_entreprises,
        (SELECT COUNT(*) FROM ouvriers 
         WHERE created_at BETWEEN ? AND ?) AS total_ouvriers,
        (SELECT COUNT(*) FROM demandes 
         WHERE status != 'Traité' AND created_at BETWEEN ? AND ?) AS total_demandes,
        (SELECT COUNT(*) FROM demandes 
         WHERE status = 'Traité' AND created_at BETWEEN ? AND ?) AS total_reunions,
        (SELECT COUNT(*) FROM mise 
         WHERE created_at BETWEEN ? AND ?) AS total_mise,
        (SELECT COALESCE(SUM(price), 0) FROM inscription 
         WHERE created_at BETWEEN ? AND ?) AS total_insc,
        (SELECT COUNT(*) FROM entreprise e
         LEFT JOIN (
           SELECT i1.* FROM inscription i1
           INNER JOIN (
             SELECT entrepriseID, MAX(id) AS last_id FROM inscription GROUP BY entrepriseID
           ) latest ON i1.id = latest.last_id
         ) i ON e.id = i.entrepriseID
         WHERE i.id IS NULL
           OR (i.year < YEAR(CURDATE()))
           OR (i.year = YEAR(CURDATE()) AND i.month < MONTH(CURDATE()))
        ) AS inscriptions_limitees`,
      [startDate, endDate, startDate, endDate, startDate, endDate,
       startDate, endDate, startDate, endDate, startDate, endDate]
    );

    res.json(counts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
