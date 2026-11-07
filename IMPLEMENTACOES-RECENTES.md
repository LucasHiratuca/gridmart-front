# 🚀 Implementações Recentes no GridMart Front (Últimos 2 Dias)

> **Período de Referência:** 03 a 05 de Novembro de 2026  
> **Repositório:** `gridmart-front`  
> **Escopo:** Novas funcionalidades no Painel Administrativo, Identidade Visual Oficial, Padronização de Catálogo e Melhorias de Arquitetura.

---

## 📑 Sumário Executivo

Nos últimos 2 dias, o frontend do **GridMart** evoluiu significativamente, saindo de um modelo básico de CRUD para uma suíte de varejo inteligente e de alta fidelidade visual, com foco em ergonomia operacional, governança de catálogo e consistência de marca.

---

## 1. 🏷️ Cadastro de Produto em 4 Passos com Geração Automática de Nome

*Commit:* `5a76d6c` (`feat(admin): cadastro de produto em 4 passos com nome gerado`)  
*Arquivos:* [`src/features/admin/AdminProductsPage.tsx`](file:///C:/Users/Usuario/gridmart-front/src/features/admin/AdminProductsPage.tsx), [`src/lib/product-name.ts`](file:///C:/Users/Usuario/gridmart-front/src/lib/product-name.ts), [`src/lib/types.ts`](file:///C:/Users/Usuario/gridmart-front/src/lib/types.ts), [`src/lib/api.ts`](file:///C:/Users/Usuario/gridmart-front/src/lib/api.ts)

### Principais Inovações:
- **Assistente Guiado (Wizard em 4 Etapas)** para eliminar erros manuais de cadastro:
  1. **Passo 1 (Identificação):** Leitura ou digitação do código de barras (EAN-13/UPC) com validação imediata de unicidade.
  2. **Passo 2 (Classificação):** Seleção de Departamento e Categoria/Tipo de produto via dropdowns sincronizados com o catálogo central.
  3. **Passo 3 (Marca & Embalagem):** Seleção de marca existente com funcionalidade integrada de **criar nova marca inline**, além da definição do tipo de embalagem (lata, garrafa, pacote, pote, etc.).
  4. **Passo 4 (Variação, Medidas e Preço):** Definição de variante (ex: *Zero Açúcar*, *Original*, *Sem Lactose* com botões de sugestões rápidas), conteúdo líquido + unidade de medida (`ml`, `l`, `g`, `kg`, `un`) e preço em centavos (`priceInCents`).
- **Geração Automática de Nome Comercial (`buildProductName`)**:
  - Implementado em [`src/lib/product-name.ts`](file:///C:/Users/Usuario/gridmart-front/src/lib/product-name.ts), espelhando o algoritmo da API.
  - Concatena e normaliza: `[Pack Nx] + Categoria + Marca + Variante + Embalagem + Conteúdo` (ex: *"Refrigerante Coca-Cola Zero Lata 350 ml"*).
  - Inclui caixa de **Pré-visualização Dinâmica em Tempo Real** do nome final antes de salvar.
- **Normalização e Busca Avançada**:
  - Tratamento fonético e remoção de diacríticos/acentos (`normalizeText`) para filtros ágeis (busca por "cafe" encontra "Café").
  - Suporte a produtos inativos e alternador de status (Ativo/Inativo).

---

## 2. 💰 Gestão Avançada de Grupos de Preço

*Commit:* `cf3db38` (`feat(admin): página de grupos de preço com seleção de produtos`)  
*Arquivos:* [`src/features/admin/AdminPriceGroupsPage.tsx`](file:///C:/Users/Usuario/gridmart-front/src/features/admin/AdminPriceGroupsPage.tsx), [`src/features/admin/AdminProductsPage.tsx`](file:///C:/Users/Usuario/gridmart-front/src/features/admin/AdminProductsPage.tsx), [`src/lib/api.ts`](file:///C:/Users/Usuario/gridmart-front/src/lib/api.ts), [`src/lib/types.ts`](file:///C:/Users/Usuario/gridmart-front/src/lib/types.ts), [`src/App.tsx`](file:///C:/Users/Usuario/gridmart-front/src/App.tsx)

### Principais Inovações:
- **Nova Tela Administrativa (`/admin/precos`)**:
  - Permite criar políticas de preço unificadas para conjuntos de produtos (ex.: *"Todas as Cervejas Long Neck R$ 8,90"*, *"Salgadinhos Linha A R$ 5,00"*).
  - Exibe cartões informativos com o valor do grupo, quantidade de produtos associados e atalhos rápidos.
- **Seleção em Lote de Produtos (Sincronização em Massa)**:
  - Modal interativo com lista paginada e filtrável de todos os produtos do catálogo.
  - Seleção por checkbox para vincular ou desvincular múltiplos produtos instantaneamente.
  - Integração com o endpoint `PUT /admin/price-groups/:id/products` via `adminSyncPriceGroupProducts`.
- **Reflexo Direto na Página de Produtos**:
  - Identificação visual e badge indicando a qual grupo de preço o produto pertence, facilitando o gerenciamento de margens e promoções.

---

## 3. 📂 Estruturação e Manutenção de Categorias & Departamentos

*Commit:* `f4c43f5` (`feat(admin): página de categorias com modal de tipo e edição`)  
*Arquivos:* [`src/features/admin/AdminCategoriesPage.tsx`](file:///C:/Users/Usuario/gridmart-front/src/features/admin/AdminCategoriesPage.tsx), [`src/lib/api.ts`](file:///C:/Users/Usuario/gridmart-front/src/lib/api.ts), [`src/lib/types.ts`](file:///C:/Users/Usuario/gridmart-front/src/lib/types.ts), [`src/App.tsx`](file:///C:/Users/Usuario/gridmart-front/src/App.tsx)

### Principais Inovações:
- **Nova Tela Administrativa (`/admin/categorias`)**:
  - Visualização hierárquica dividida por Departamentos (ex.: *Bebidas*, *Alimentos*, *Snacks*, *Higiene*, *Utilidades*).
  - Listagem dos Tipos/Categorias pertencentes a cada departamento, com contagem de produtos associados.
- **Modais Completos de Criação e Edição**:
  - Criação rápida de novas categorias definindo nome, departamento correspondente, slug e ícone.
  - Edição in-place com atualização imediata via TanStack Query (`invalidateQueries`).
  - Prevenção de exclusão acidental quando existem produtos atrelados à categoria.

---

## 4. 🎨 Aplicação da Identidade Visual Oficial (Branding & Performance)

*Commits:* `a9356c0` (`feat(brand): aplica a logo oficial no site, totem, acesso e admin`) e `cf92b95` (`perf(brand): usa versão otimizada da logo no site e no favicon`)  
*Arquivos:* [`src/components/brand-logo.tsx`](file:///C:/Users/Usuario/gridmart-front/src/components/brand-logo.tsx), [`public/brand/`](file:///C:/Users/Usuario/gridmart-front/public/brand), [`index.html`](file:///C:/Users/Usuario/gridmart-front/index.html), [`src/features/home/HomePage.tsx`](file:///C:/Users/Usuario/gridmart-front/src/features/home/HomePage.tsx), [`src/features/totem/TotemPage.tsx`](file:///C:/Users/Usuario/gridmart-front/src/features/totem/TotemPage.tsx), [`src/features/access/AccessPage.tsx`](file:///C:/Users/Usuario/gridmart-front/src/features/access/AccessPage.tsx), [`src/features/admin/AdminLayout.tsx`](file:///C:/Users/Usuario/gridmart-front/src/features/admin/AdminLayout.tsx)

### Principais Inovações:
- **Componente Centralizado `BrandLogo`**:
  - Componente reutilizável com controle semântico de tamanhos (`sm`, `md`, `lg`, `xl`) e modos (ícone quadrado ou marca horizontal com tipografia).
  - Implementado nas 4 frentes: **Home Portal**, **Totem Kiosk**, **Terminal da Porta** e **Sidebar Administrativa**.
- **Otimização de Assets para Web e Mobile**:
  - Geração e inclusão das versões otimizadas `logo-256.png` e `logo-512.png`, substituindo arquivos pesados de alta resolução na renderização inicial.
  - Atualização do favicon no `index.html` com a versão otimizada de 256px, garantindo nitidez sem lentidão no carregamento.

---

## 5. 🏗️ Modernização da Stack e Experiência do Desenvolvedor

- **React 19 + TypeScript**: Adoção das versões mais recentes do ecossistema React.
- **Tailwind CSS v4 + Radix UI / shadcn/ui**: Estilização ultrarrápida, design system consistente baseado na paleta `neutral` e suporte completo a acessibilidade (WAI-ARIA).
- **TanStack Query v5**: Gerenciamento robusto de cache de rede, mutações otimistas e polling assíncrono para status de vendas Pix.
- **Oxlint**: Linter de altíssima performance para garantia de qualidade estática de código.
- **Tratamento de Sessão Admin**: Armazenamento seguro de token de acesso administrativo via `localStorage` com envio automático via cabeçalho `x-admin-token` em rotas protegidas.

---

## 📊 Matriz de Rotas Atualizada

Com as adições dos últimos 2 dias, o painel administrativo passou a contemplar **7 visões operacionais completas**:

| Rota | Tipo | Status | Descrição |
|---|---|---|---|
| `/` | Pública | Atualizada | Portal com logos oficiais e atalhos para os módulos |
| `/totem` | Totem | Atualizada | Kiosk com Pix Mercado Pago e QR temporizado de saída |
| `/acesso` | Porta/Celular | Atualizada | Leitor de CPF na entrada e saída automatizada via URL |
| `/admin/produtos` | Admin | **Aprimorada** | Catálogo completo com Wizard de 4 passos e nome gerado |
| `/admin/categorias` | Admin | **Nova (Últimos 2 dias)** | Gestão de Departamentos e Tipos de Produtos |
| `/admin/precos` | Admin | **Nova (Últimos 2 dias)** | Gestão de Grupos de Preço e sincronização em massa |
| `/admin/vendas` | Admin | Estável | Monitoramento de pedidos e baixa manual Pix |
| `/admin/visitas` | Admin | Estável | Controle de clientes em loja e encerramento de visitas |
| `/admin/usuarios` | Admin | Estável | Base de clientes e controle de bloqueio |
| `/admin/auditoria` | Admin | Estável | Logs de eventos de porta (entrada/saída e autorização) |
