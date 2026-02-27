# Guia de Deploy Passo a Passo - Sistema AGM (Vercel)

Este guia explica como colocar seu sistema na internet usando a **Vercel**. É a forma mais rápida de compartilhar seu progresso com outras pessoas.

---

## Passo 1: Baixar o Código
1. No topo direito do AI Studio, clique no ícone de **Download** (setinha para baixo).
2. Salve o arquivo `.zip` e extraia os arquivos em uma pasta no seu computador.

---

## Passo 2: Criar uma conta no GitHub
O GitHub é essencial para conectar com a Vercel.
1. Acesse [github.com](https://github.com) e crie sua conta.
2. Clique no botão **"+"** -> **New repository**.
3. Nomeie como `sistema-agm` e clique em **Create repository**.
4. Clique em **"uploading an existing file"**.
5. Arraste todos os arquivos da sua pasta (exceto `node_modules`) para a página.
6. Clique em **Commit changes**.

---

## Passo 3: Publicar na Vercel
1. Acesse [vercel.com](https://vercel.com) e entre com sua conta do GitHub.
2. Clique em **Add New...** -> **Project**.
3. Clique em **Import** ao lado do repositório `sistema-agm`.
4. **Não altere nenhuma configuração.** Eu já deixei um arquivo `vercel.json` pronto no seu código que faz tudo sozinho.
5. Clique em **Deploy**.

---

## Passo 4: Entendendo o Banco de Dados (SQLite)
Seu sistema usa o SQLite, que salva os dados em um arquivo. Na Vercel:
*   O sistema é ótimo para **demonstração e testes**.
*   **Atenção:** Se você cadastrar um instrumento novo, ele pode sumir depois de algumas horas ou dias, pois a Vercel "limpa" os arquivos temporários de tempos em tempos.
*   Para um sistema de produção real que nunca perde dados, no futuro ajudarei você a configurar um banco de dados persistente.

---

## Passo 5: Compartilhar
1. Após o Deploy, a Vercel te dará um link (ex: `sistema-agm.vercel.app`).
2. Envie esse link para quem você quiser!

---
*Dúvidas? É só me chamar!*
