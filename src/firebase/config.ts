
/**
 * IMPORTANTE: Substitua os valores abaixo pelos dados do seu projeto no Console do Firebase.
 * Vá em Configurações do Projeto > Geral > Seus aplicativos > Configuração do SDK.
 */
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "placeholder-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "placeholder-auth-domain",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "placeholder-project-id",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "placeholder-storage-bucket",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "placeholder-sender-id",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "placeholder-app-id",
};

// Log de aviso se os placeholders ainda estiverem presentes
if (typeof window !== 'undefined' && firebaseConfig.apiKey === "placeholder-api-key") {
  console.warn(
    "⚠️ FIREBASE: A API Key não foi configurada. O login não funcionará até que você preencha src/firebase/config.ts ou as variáveis de ambiente."
  );
}
