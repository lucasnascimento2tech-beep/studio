import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

/**
 * SCRIPT PARA CRIAÇÃO DE ADMINISTRADOR MASTER
 * 
 * Instruções:
 * 1. Exporte a variável de ambiente: 
 *    export GOOGLE_APPLICATION_CREDENTIALS="./service-account-key.json"
 * 2. Configure ADMIN_EMAIL, ADMIN_PASSWORD e ADMIN_NAME no seu arquivo .env
 * 3. Execute: npm run create:admin
 */

dotenv.config();

try {
  const app = initializeApp({
    credential: applicationDefault(),
  });

  const auth = getAuth(app);
  const db = getFirestore(app);

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME;

  async function run() {
    if (!email || !password || !name) {
      console.error('ERRO: Defina ADMIN_EMAIL, ADMIN_PASSWORD e ADMIN_NAME no arquivo .env');
      process.exit(1);
    }

    console.log(`Iniciando configuração para: ${email}...`);

    try {
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(email);
        console.log('- Usuário já existe no Authentication.');
      } catch (e) {
        userRecord = await auth.createUser({
          email,
          password,
          displayName: name,
        });
        console.log('- Usuário criado com sucesso no Authentication.');
      }

      const uid = userRecord.uid;

      // Definir Custom Claims (opcional mas recomendado para segurança extra no backend)
      await auth.setCustomUserClaims(uid, {
        admin: true,
        globalRole: 'admin_2tech',
      });
      console.log('- Custom claims definidos (admin: true).');

      // Firestore Record
      await db.collection('users').doc(uid).set({
        uid,
        name,
        email,
        globalRole: 'admin_2tech',
        active: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      console.log('✅ SUCESSO! Admin configurado e liberado.');
      process.exit(0);
    } catch (error) {
      console.error('❌ Erro durante o processo:', error);
      process.exit(1);
    }
  }

  run();
} catch (e) {
  console.error('❌ Erro de inicialização do Firebase Admin. Verifique se GOOGLE_APPLICATION_CREDENTIALS está definida e o arquivo .json existe.');
  process.exit(1);
}
