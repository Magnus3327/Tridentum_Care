// API Administrative

const express = require('express');
const bcrypt = require('bcryptjs');
const { ObjectId } = require('mongodb');
const authMiddleware = require('../middleware/auth');
const { generatePassword } = require('../utils/password');
const { ROLES, AUTH_LVL } = require('../../config/constants');

const router = express.Router();

router.use(authMiddleware);

function getEffectiveAuthLevel(user) {
  if (!user) return -1;
  return typeof user.authLvl === 'number' ? user.authLvl : 0;
}

function toPublicUser(user) {
  if (!user) return null;

  const publicUser = { ...user };
  publicUser.id = publicUser._id.toString();
  delete publicUser._id;
  delete publicUser.password;

  return publicUser;
}

async function getAdminUser(req) {
  const db = req.app.locals.db;
  if (!db) {
    return { error: 'Database non connesso', statusCode: 500 };
  }

  if (!ObjectId.isValid(req.user.userId)) {
    return { error: 'Utente non valido', statusCode: 400 };
  }

  const user = await db.collection('users').findOne({ _id: new ObjectId(req.user.userId) });
  if (!user) {
    return { error: 'Utente non trovato', statusCode: 404 };
  }

  if (getEffectiveAuthLevel(user) < AUTH_LVL.MODERATOR) {
    return { error: 'Accesso negato: permessi insufficienti', statusCode: 403 };
  }

  return { db, user };
}

async function getTargetUser(db, userId) {
  if (!ObjectId.isValid(userId)) {
    return null;
  }

  return db.collection('users').findOne({ _id: new ObjectId(userId) });
}

async function promoteVolunteer(req, res) {
  try {
    const userId = req.params.userId || req.body.userId || req.body.volunteerId;
    if (!userId) {
      return res.status(400).json({ error: 'userId obbligatorio' });
    }

    const targetLevel = req.body.targetLevel !== undefined ? parseInt(req.body.targetLevel, 10) : AUTH_LVL.ADMIN;
    
    if (targetLevel !== AUTH_LVL.ADMIN && targetLevel !== AUTH_LVL.MODERATOR) {
      return res.status(400).json({ error: 'Livello di promozione non valido' });
    }

    const db = req.app.locals.db;
    if (!db) return res.status(500).json({ error: 'Database non connesso' });

    const actorAuthLevel = getEffectiveAuthLevel(req.adminUser);
    if (actorAuthLevel < AUTH_LVL.ADMIN) {
      return res.status(403).json({ error: 'Accesso negato: permessi insufficienti per promuovere un utente' });
    }

    const targetUser = await getTargetUser(db, userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    if (targetUser.role !== ROLES.VOLUNTEER) {
      return res.status(400).json({ error: 'Puoi promuovere solo utenti con ruolo volontario' });
    }

    if (typeof targetUser.authLvl === 'number' && targetUser.authLvl >= targetLevel) {
      return res.status(400).json({ error: 'Questo utente possiede già questo livello o superiore' });
    }

    await db.collection('users').updateOne(
      { _id: targetUser._id },
      {
        $set: {
          authLvl: targetLevel,
          promotedAt: new Date(),
          promotedBy: req.user.userId,
          updatedAt: new Date()
        }
      }
    );

    const promotedUser = await db.collection('users').findOne({ _id: targetUser._id });
    const roleName = targetLevel === AUTH_LVL.ADMIN ? 'amministratore' : 'moderatore';

    return res.status(200).json({
      message: `Utente promosso a ${roleName} con successo`,
      user: toPublicUser(promotedUser)
    });
  } catch (error) {
    console.error('Errore promozione admin:', error);
    return res.status(500).json({ error: 'Errore interno del server' });
  }
}

async function createPartnerUser(req, res) {
  try {
    const actorAuthLevel = getEffectiveAuthLevel(req.adminUser);
    if (actorAuthLevel < AUTH_LVL.ADMIN) {
      return res.status(403).json({ error: 'Accesso negato: permessi insufficienti per creare un partner' });
    }

    const { legalForm, email, name, surname, phone, address } = req.body;

    if (!legalForm || !email) {
      return res.status(400).json({ error: 'Tutti i campi obbligatori devono essere compilati' });
    }

    const db = req.app.locals.db;
    if (!db) return res.status(500).json({ error: 'Database non connesso' });

    const normalizedEmail = email.toLowerCase();
    const existingUser = await db.collection('users').findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ error: 'Questa email è già registrata' });
    }

    const temporaryPassword = generatePassword(12);
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    const newPartner = {
      role: ROLES.PARTNER,
      legalForm,
      name: name || legalForm,
      surname: surname || '',
      email: normalizedEmail,
      password: hashedPassword,
      phone: phone || '',
      address: address || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('users').insertOne(newPartner);

    return res.status(201).json({
      message: 'Partner creato con successo',
      temporaryPassword,
      user: toPublicUser({ ...newPartner, _id: result.insertedId })
    });
  } catch (error) {
    console.error('Errore creazione partner:', error);
    return res.status(500).json({ error: 'Errore interno durante la creazione del partner' });
  }
}

async function deleteLowerPrivilegeUser(req, res) {
  try {
    const userId = req.params.userId || req.body.userId;
    if (!userId) {
      return res.status(400).json({ error: 'userId obbligatorio' });
    }

    const db = req.app.locals.db;
    if (!db) return res.status(500).json({ error: 'Database non connesso' });

    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'ID utente non valido' });
    }

    const targetUser = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!targetUser) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    const actorAuthLevel = getEffectiveAuthLevel(req.adminUser);
    const targetAuthLevel = getEffectiveAuthLevel(targetUser);

    if (targetUser.role === ROLES.PARTNER && actorAuthLevel < AUTH_LVL.ADMIN) {
      return res.status(403).json({ error: 'Puoi eliminare partner solo se sei un amministratore' });
    }

    if (targetAuthLevel >= actorAuthLevel) {
      return res.status(403).json({ error: 'Puoi eliminare solo utenti con privilegi inferiori ai tuoi' });
    }

    const targetObjectId = targetUser._id;

    if (targetUser.role === ROLES.VOLUNTEER) {
      await db.collection('requests').updateMany(
        { volunteerId: targetObjectId.toString(), status: 'In Corso' },
        { $set: { status: 'In Attesa di Volontario', volunteerId: null } }
      );

      await db.collection('requests').updateMany(
        { volunteerId: targetObjectId.toString() },
        { $set: { volunteerId: null } }
      );
    }

    if (targetUser.role === ROLES.REQUESTER) {
      await db.collection('requests').deleteMany({ userId: targetObjectId });
    }

    const deletionResult = await db.collection('users').deleteOne({ _id: targetObjectId });
    if (deletionResult.deletedCount === 0) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    return res.json({
      message: 'Utente eliminato con successo',
      deletedUserId: userId
    });
  } catch (error) {
    console.error('Errore eliminazione utente:', error);
    return res.status(500).json({ error: 'Errore interno del server' });
  }
}

async function listUsersForAdmin(req, res) {
  try {
    const db = req.app.locals.db;
    if (!db) return res.status(500).json({ error: 'Database non connesso' });

    const { q = '', role = '' } = req.query;
    const trimmedQuery = String(q).trim();

    const filter = {};
    if (role && Object.values(ROLES).includes(role)) {
      filter.role = role;
    }

    if (trimmedQuery) {
      const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escapedQuery, 'i');
      filter.$or = [
        { name: searchRegex },
        { surname: searchRegex },
        { email: searchRegex },
        { legalForm: searchRegex },
        { _id: ObjectId.isValid(trimmedQuery) ? new ObjectId(trimmedQuery) : undefined }
      ].filter(Boolean);
    }

    const users = await db.collection('users')
      .find(filter, {
        projection: {
          password: 0
        }
      })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    return res.json(users.map(toPublicUser));
  } catch (error) {
    console.error('Errore elenco utenti admin:', error);
    return res.status(500).json({ error: 'Errore interno del server' });
  }
}

router.use(async (req, res, next) => {
  try {
    const context = await getAdminUser(req);
    if (context.error) {
      return res.status(context.statusCode).json({ error: context.error });
    }

    req.adminUser = context.user;
    return next();
  } catch (error) {
    console.error('Errore middleware amministrativo:', error);
    return res.status(500).json({ error: 'Errore interno del server' });
  }
});

router.put('/admin', promoteVolunteer);
router.put('/volunteers/:userId/admin', promoteVolunteer);

router.post('/partner', createPartnerUser);
router.post('/partners', createPartnerUser);

router.delete('/users/:userId', deleteLowerPrivilegeUser);
router.get('/users', listUsersForAdmin);

module.exports = router;