# 🇺🇸 US Mailbox - Sistema de E-mails Aleatórios Americanos (@sapokas.com)

Sistema pessoal para geração de e-mails aleatórios com **nomes reais americanos**, **identificadores dos EUA** (estados, siglas, anos e IDs) terminando em `@sapokas.com`, com painel web dedicado para **receber e ler e-mails de confirmação e códigos de verificação (OTPs)** de serviços como Steam, Discord, Google, Epic Games, Netflix, etc.

---

## 🚀 Como Iniciar

### Opção 1: Clique Duplo (Windows)
Basta dar dois cliques no arquivo **`start.bat`**.  
Ele iniciará o servidor e abrirá o painel no seu navegador automaticamente em `http://localhost:3000`.

### Opção 2: Pelo Terminal
```bash
npm start
```
Abra o navegador em: [http://localhost:3000](http://localhost:3000)

---

## 🛠️ Principais Recursos

1. **Links Permanentes de Acesso (Nunca Expira / Nunca se Perde)**:
   - Todo e-mail gerado ganha um **Link de Acesso Permanente exclusivo** (ex: `http://localhost:3000/?inbox=nome@inboxkitten.com`).
   - Você pode salvar esse link nos favoritos ou no seu bloco de notas: ao abrir o link, aquela conta específica é restaurada com todos os e-mails e códigos recebidos preservados.
   - Botão **"Minhas Caixas Salvas"** no topo para você ver e alternar entre todos os e-mails americanos que você já gerou, sem risco de perder nenhum.

2. **Armazenamento Permanente no Banco Local (SQLite)**:
   - Os e-mails e contas **não são apagados automaticamente**. Eles ficam salvos no seu banco de dados local (`emails.db`).

3. **Gerador de Identidades Reais dos EUA**:
   - Nomes e sobrenomes autênticos norte-americanos (ex: *David Miller*, *Sarah Jenkins*, *Ethan Cooper*).
   - Formatos realistas de e-mail:
     - `firstname.lastname.us{ano/num}@sapokas.com`
     - `firstname.lastname.{estado}{num}@sapokas.com`
     - `firstname{ano}.lastname@sapokas.com`
     - `firstname.lastname.id{num}@sapokas.com`
   - Perfil auxiliar completo (Cidade, Estado dos EUA, CEP/ZIP, Telefone `+1`) para cadastros que exigem endereço americano.
   - Botão de **1 clique para copiar o e-mail** diretamente para a área de transferência.

2. **Leitor de E-mails e Extrator Automático de Códigos OTP**:
   - Destaca códigos de verificação (4 a 8 dígitos, códigos do Google `G-XXXXXX`, códigos do Steam, Discord, etc.) em um **card verde gigante** com botão direto **"Copiar Código"**.
   - Lista rápida que permite copiar o código diretamente da listagem sem precisar abrir o e-mail.
   - Leitor com alternador entre **HTML Formatado** (com sandbox seguro) e **Texto Puro**.

3. **Duas Formas de Recebimento de E-mail**:
   - **Modo Domínio Próprio (@sapokas.com)**:
     - **Servidor SMTP Embutido**: Escuta na porta `2525` (ou porta `25`).
     - **Webhook Catch-all**: Endpoint `/api/webhook/email` compatível com Cloudflare Email Workers, Mailgun, SendGrid ou túneis (ngrok / Cloudflare Tunnel).
   - **Modo Nuvem Imediato (Mail.tm)**:
     - Para quem ainda não comprou ou configurou o domínio `sapokas.com` e quer receber códigos reais da internet hoje mesmo!
     - Cria um e-mail temporário ativo com o mesmo nome americano e recebe códigos de sites reais instantaneamente.

4. **Simulador de Teste Embutido**:
   - Permite testar o recebimento com simulações de e-mails do Steam Guard, Discord, Google e Netflix em 1 clique.

---

## 🌐 Como Conectar o Domínio `sapokas.com` na Internet (100% Grátis)

Para receber e-mails enviados por sites da internet (como Discord, Steam, Google, etc.) para qualquer endereço aleatório `@sapokas.com`:

1. Adicione o domínio `sapokas.com` na **Cloudflare** (plano gratuito).
2. No menu lateral, acesse **Email Routing** (Roteamento de E-mail) e ative o serviço (ele cria os registros MX automaticamente).
3. Vá em **Email Routing &rarr; Email Workers** e crie um Worker com o script fornecido no botão *"Guia de Conexão DNS"* do painel.
4. Em **Routing Rules**, ative a regra **Catch-all** para enviar qualquer e-mail `*@sapokas.com` para esse Worker.
5. Pronto! Qualquer e-mail gerado receberá mensagens e códigos instantaneamente no seu painel.

---

## 📂 Estrutura de Arquivos

- `server.js` - Servidor principal (API REST + SSE + Servidor SMTP).
- `src/generator.js` - Gerador de identidades e e-mails americanos.
- `src/otp-extractor.js` - Mecanismo inteligente de extração de códigos OTP / PINs.
- `src/smtp-server.js` - Servidor SMTP para recepção direta de e-mails MIME.
- `src/database.js` - Banco de dados SQLite de alta performance (`node:sqlite`).
- `src/cloud-mail.js` - Conexão para caixas temporárias ativas na web.
- `public/` - Interface web moderna (HTML, CSS e JavaScript).
- `start.bat` - Inicializador rápido para Windows.
