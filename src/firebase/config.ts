
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
  apiKey: "AIzaSyD2T0mMbtMwhAvJJIY5GkxuMngCExgLZTU",
  authDomain: "studio-8557738711-78949.firebaseapp.com",
  projectId: "studio-8557738711-78949",
  storageBucket: "studio-8557738711-78949.firebasestorage.app",
  messagingSenderId: "426680204892",
  appId: "1:426680204892:web:06664f860f8c1189acf099",
};

// Log de segurança para verificar se o desenvolvedor esqueceu de configurar
if (typeof window !== 'undefined' && firebaseConfig.apiKey === "COLE_AQUI_SUA_API_KEY") {
  console.warn(
    "⚠️ ATENÇÃO: Você ainda não configurou suas chaves do Firebase em src/firebase/config.ts. " +
    "O sistema não funcionará até que você insira as credenciais do seu projeto."
  );
}
