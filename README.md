# Interclasses

## Executar localmente

1. Instale o Node.js 18 ou superior.
2. No terminal, entre nesta pasta e execute:

```powershell
$env:ADMIN_TOKEN="uma-chave-secreta"
npm start
```

3. Abra `http://localhost:3000/` para o placar público.
4. Abra `http://localhost:3000/admin.html` para o painel de organização e informe a mesma chave.

O placar público é somente leitura. O painel usa `GET /api/championship` para consultar os dados e exige o cabeçalho `x-admin-token` para criar, editar, remover ou restaurar eventos. Os dados ficam no servidor em `data/championship.json`.

Em produção, defina `ADMIN_TOKEN` no ambiente da hospedagem e use HTTPS. Não publique a chave no código-fonte.

## Publicar no Netlify

1. Crie um repositório no GitHub e envie todos os arquivos deste projeto.
2. No Netlify, escolha **Add new site > Import an existing project** e selecione o repositório.
3. Use estas configurações de build:
	- **Build command:** deixe vazio.
	- **Publish directory:** `.`
	- **Functions directory:** `netlify/functions`.
4. Em **Site configuration > Environment variables**, adicione `ADMIN_TOKEN` com uma chave longa e secreta.
5. Faça um novo deploy e abra `https://seu-site.netlify.app/admin.html` para administrar.

O arquivo `netlify.toml` já configura a Function e encaminha `/api/*` para ela. Em produção, os dados são armazenados no Netlify Blobs, não no arquivo local. Para testar o ambiente Netlify localmente, instale a CLI e rode `npm install` e `npm run dev:netlify`.