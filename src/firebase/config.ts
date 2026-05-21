
/**
 * CONFIGURAÇÃO DO FIREBASE
 * 
 * Para conectar seu app, siga estes passos:
 * 1. Vá para o Console do Firebase (https://console.firebase.google.com/)
 * 2. Selecione seu projeto.
 * 3. Clique no ícone de engrenagem (Configurações do Projeto) > Geral.
 * 4. Role até "Seus aplicativos" e selecione seu Web App (ou crie um se não existir).
 * 5. Copie os valores do objeto 'firebaseConfig' e cole abaixo.
 */

export const firebaseConfig = {
  // SUBSTITUA OS VALORES ABAIXO:
  apiKey: "COLE_AQUI_SUA_API_KEY",
  authDomain: "COLE_AQUI_SEU_AUTH_DOMAIN",
  projectId: "COLE_AQUI_SEU_PROJECT_ID",
  storageBucket: "COLE_AQUI_SEU_STORAGE_BUCKET",
  messagingSenderId: "COLE_AQUI_SEU_SENDER_ID",
  appId: "COLE_AQUI_SEU_APP_ID",
};

// Log de segurança para verificar se o desenvolvedor esqueceu de configurar
if (typeof window !== 'undefined' && firebaseConfig.apiKey === "COLE_AQUI_SUA_API_KEY") {
  console.warn(
    "⚠️ ATENÇÃO: Você ainda não configurou suas chaves do Firebase em src/firebase/config.ts. " +
    "O sistema não funcionará até que você insira as credenciais do seu projeto."
  );
}
