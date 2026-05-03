# Relatório Técnico de Migração — Supabase → PHP/MySQL

---

## 1. Mapeamento de Funcionalidades

| Módulo | Descrição | Dependências |
|---|---|---|
| **Autenticação Multi-tenant** | Login isolado por estabelecimento. Email interno `user__slug@domain.com`, validação de vínculo `establishment_id`. Signup, login, reset de senha, logout. | `auth.users`, `profiles`, `establishment_members` |
| **Gerenciamento de Estabelecimentos** | CRUD de tenants, criação via Edge Function com rollback manual, provisioning de settings padrão. | `establishments`, `establishment_settings`, `establishment_members`, `plans` |
| **Catálogo (Produtos/Marcas/Categorias)** | CRUD com imagens múltiplas, variantes, filtros por categoria/marca, produtos em destaque/promoção. | `products`, `product_images`, `product_variants`, `brands`, `product_categories` |
| **Carrinho & Checkout** | Carrinho client-side (Context), checkout multi-step com cálculo de taxa dinâmica, cupons, endereço de entrega. | `orders`, `order_items`, `coupons`, `platform_fees` |
| **Sistema de Pedidos** | Kanban de status, vínculo por tenant, seller_id para PDV, notas. | `orders`, `order_items` |
| **Eventos & Ingressos** | CRUD de eventos, lotes, tipos de ingresso, venda com QR code, validação/scanner. | `events`, `ticket_batches`, `ticket_types`, `ticket_sales`, `tickets` |
| **Financeiro** | Carteira (wallet), entradas/saídas manuais, despesas, relatório consolidado, saques. | `wallet_transactions`, `manual_entries`, `expenses`, `withdrawal_requests` |
| **Taxas da Plataforma** | Configuração granular de taxas por método de pagamento (Pix, Crédito 1x-12x), log de alterações. | `platform_fees`, `platform_fee_logs` |
| **Banners** | CRUD com ordenação, agendamento (starts_at/ends_at), link para produto/categoria. | `banners` |
| **Cupons** | CRUD com validação de uso máximo, valor mínimo, validade. | `coupons` |
| **Favoritos** | Toggle por usuário autenticado. | `favorites` |
| **Perfil de Usuário** | Edição de dados pessoais, endereço estruturado, avatar, pontos. | `profiles` |
| **Roles & Permissões** | Enum `admin/moderator/user`, função `has_role()`, hierarquia: Master > Admin Loja > Funcionário > Usuário. | `user_roles`, `establishment_members` |
| **Logs & Sessões** | Activity logs, sessões ativas com heartbeat, alertas de segurança, auditoria de acesso. | `activity_logs`, `user_sessions`, `security_alerts`, `logs_access_audit` |
| **Planos & Assinaturas** | Controle de features por plano, vencimento (`due_date`), suspensão de inadimplentes. | `plans`, `establishments` |
| **Landing Page** | Configuração dinâmica de todas as seções (hero, pricing, CTA, etc). | `landing_page_settings` |
| **Storage** | Upload de imagens para produtos, banners, logos, eventos. 6 buckets públicos. | Buckets: `products`, `banners`, `brand-logos`, `store-assets`, `establishment-logos`, `events` |

---

## 2. Dicionário de Endpoints (API REST PHP)

### Auth
| Método | Endpoint | Descrição |
|---|---|---|
| POST | `/api/auth/login` | Login isolado por tenant (email original → email interno) |
| POST | `/api/auth/register` | Registro vinculado a establishment via slug |
| POST | `/api/auth/logout` | Encerrar sessão |
| POST | `/api/auth/forgot-password` | Enviar email de reset |
| POST | `/api/auth/reset-password` | Atualizar senha com token |
| GET | `/api/auth/me` | Dados do usuário logado + roles + establishment |

### Establishments
| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/establishments` | Listar todos (master) |
| GET | `/api/establishments/:slug` | Dados públicos por slug |
| POST | `/api/establishments` | Criar (master) — substitui Edge Function `create-establishment` |
| PUT | `/api/establishments/:id` | Atualizar |
| DELETE | `/api/establishments/:id` | Deletar em cascata — substitui `delete_establishment_cascade()` |
| PUT | `/api/establishments/:id/suspend` | Suspender inadimplente |
| PUT | `/api/establishments/:id/activate` | Reativar |

### Establishment Settings
| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/establishments/:id/settings` | Obter configurações |
| PUT | `/api/establishments/:id/settings` | Atualizar configurações |

### Establishment Members
| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/establishments/:id/members` | Listar membros |
| POST | `/api/establishments/:id/members` | Adicionar membro |
| PUT | `/api/establishments/:id/members/:memberId` | Alterar role |
| DELETE | `/api/establishments/:id/members/:memberId` | Remover |

### Users / Profiles
| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/users` | Listar (master/admin) |
| GET | `/api/users/:id` | Perfil completo |
| PUT | `/api/users/:id` | Atualizar perfil |
| PUT | `/api/users/:id/password` | Alterar senha — substitui Edge Function `update-establishment-password` |
| PUT | `/api/users/:id/role` | Alterar role — substitui Edge Function `manage-user` |

### Products
| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/establishments/:id/products` | Listar com filtros (categoria, marca, busca, destaque, promoção) |
| GET | `/api/products/:id` | Detalhes com imagens e variantes |
| POST | `/api/establishments/:id/products` | Criar |
| PUT | `/api/products/:id` | Atualizar |
| DELETE | `/api/products/:id` | Deletar |
| POST | `/api/products/:id/images` | Upload de imagens |
| DELETE | `/api/products/:id/images/:imageId` | Remover imagem |
| GET/POST/PUT/DELETE | `/api/products/:id/variants` | CRUD variantes |

### Categories
| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/establishments/:id/categories` | Listar |
| POST/PUT/DELETE | `/api/categories/:id` | CRUD |

### Brands
| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/establishments/:id/brands` | Listar |
| POST/PUT/DELETE | `/api/brands/:id` | CRUD |

### Orders
| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/establishments/:id/orders` | Listar (admin) |
| GET | `/api/users/:id/orders` | Listar (cliente) |
| GET | `/api/orders/:id` | Detalhes com items |
| POST | `/api/orders` | Criar pedido + items (transação) |
| PUT | `/api/orders/:id/status` | Atualizar status (kanban) |

### Banners
| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/establishments/:id/banners` | Listar (filtro ativo/agendado) |
| POST/PUT/DELETE | `/api/banners/:id` | CRUD |

### Coupons
| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/establishments/:id/coupons` | Listar |
| POST | `/api/coupons/validate` | Validar código (uso, validade, valor mínimo) |
| POST/PUT/DELETE | `/api/coupons/:id` | CRUD |

### Events & Tickets
| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/establishments/:id/events` | Listar eventos |
| POST/PUT/DELETE | `/api/events/:id` | CRUD evento |
| GET/POST/PUT/DELETE | `/api/events/:id/batches` | CRUD lotes |
| GET/POST/PUT/DELETE | `/api/events/:id/ticket-types` | CRUD tipos de ingresso |
| POST | `/api/ticket-sales` | Comprar ingressos (gerar QR codes) |
| GET | `/api/users/:id/tickets` | Meus ingressos |
| POST | `/api/tickets/:id/validate` | Validar QR code (scanner) |

### Financeiro
| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/establishments/:id/wallet` | Saldo + transações |
| POST | `/api/establishments/:id/wallet/transactions` | Registrar transação |
| GET/POST/PUT/DELETE | `/api/establishments/:id/expenses` | CRUD despesas |
| GET/POST/PUT/DELETE | `/api/establishments/:id/manual-entries` | CRUD entradas manuais |
| GET | `/api/establishments/:id/financial-report` | Relatório consolidado |
| GET | `/api/establishments/:id/financial-report/export` | Exportar CSV |
| POST | `/api/establishments/:id/withdrawals` | Solicitar saque |
| GET/PUT | `/api/withdrawals` | Listar/processar (master) |

### Platform Fees
| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/platform-fees` | Obter taxas ativas |
| PUT | `/api/platform-fees` | Atualizar (com log automático) |
| GET | `/api/platform-fees/logs` | Histórico de alterações |

### Plans
| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/plans` | Listar planos ativos |
| POST/PUT/DELETE | `/api/plans/:id` | CRUD (master) |

### Favorites
| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/users/:id/favorites` | Listar |
| POST/DELETE | `/api/favorites/:productId` | Toggle |

### Logs & Monitoring (Master)
| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/activity-logs` | Listar com filtros |
| POST | `/api/activity-logs` | Registrar atividade |
| GET | `/api/sessions` | Sessões ativas |
| POST | `/api/sessions/heartbeat` | Heartbeat |
| GET | `/api/security-alerts` | Listar alertas |
| PUT | `/api/security-alerts/:id/resolve` | Resolver |

### Landing Page
| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/landing-settings` | Obter configurações |
| PUT | `/api/landing-settings` | Atualizar |

### Upload
| Método | Endpoint | Descrição |
|---|---|---|
| POST | `/api/upload/:bucket` | Upload genérico (products, banners, logos, events) |
| DELETE | `/api/upload/:bucket/:filename` | Remover arquivo |

### Import
| Método | Endpoint | Descrição |
|---|---|---|
| POST | `/api/establishments/:id/import-menu` | Importar cardápio — substitui Edge Function `import-menu` |

---

## 3. Lógica de Negócio (Edge Functions → PHP)

### Edge Functions a migrar:

| Função | Lógica | Complexidade |
|---|---|---|
| **`create-establishment`** | Cria auth user com email isolado, establishment, profile, member, settings em sequência com rollback manual. Requer `service_role`. | 🔴 Alta |
| **`update-establishment-password`** | Altera senha via `admin.updateUserById()`. | 🟡 Média |
| **`manage-user`** | Altera role do usuário, atualiza `establishment_members`. | 🟡 Média |
| **`import-menu`** | Importa cardápio (parse de dados externos → products). | 🟡 Média |
| **`update-customer`** | Atualiza dados do cliente. | 🟢 Baixa |

### Lógica no Frontend que deve migrar para PHP:

| Lógica | Onde está | Recomendação |
|---|---|---|
| **Cálculo de taxas dinâmicas** (checkout) | `PaymentCheckout.tsx` — busca `platform_fees` e calcula por parcela | Mover para endpoint `POST /api/orders` |
| **Validação de cupons** | Frontend valida uso, validade, valor mínimo | Endpoint `POST /api/coupons/validate` |
| **Geração de QR codes** | `ticketUtils.ts` — gera no client | Gerar no PHP ao confirmar venda |
| **Cálculo de saldo wallet** | Frontend soma transações `available_at <= now()` | View ou procedure MySQL |
| **Isolamento de email** | `createIsolatedEmail()` no frontend + edge function | Centralizar no PHP |
| **Cálculo de dias restantes do plano** | `PlanExpirationBanner.tsx` | Pode ficar no frontend, mas validar no backend |

### Database Functions a recriar como Stored Procedures MySQL:

| Função | Descrição |
|---|---|
| `has_role(user_id, role)` | Verifica se usuário tem role específica |
| `is_establishment_member(user_id, est_id)` | Verifica vínculo |
| `is_establishment_owner(user_id, est_id)` | Verifica propriedade |
| `get_user_establishment_id(user_id)` | Retorna establishment_id |
| `delete_establishment_cascade(est_id)` | Deleção em cascata de ~20 tabelas |
| `update_product_sales_count()` (trigger) | Incrementa `sales_count` ao inserir `order_item` |
| `handle_new_user()` (trigger) | Auto-cria profile ao registrar |
| `update_updated_at_column()` (trigger) | Auto-atualiza `updated_at` |

---

## 4. Estrutura de Banco de Dados MySQL

```sql
-- =============================================
-- USERS & AUTH
-- =============================================

CREATE TABLE users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email_confirmed BOOLEAN DEFAULT FALSE,
    user_metadata JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE profiles (
    id CHAR(36) PRIMARY KEY,
    email VARCHAR(255) DEFAULT NULL,
    original_email VARCHAR(255) DEFAULT NULL,
    full_name VARCHAR(255) DEFAULT NULL,
    phone VARCHAR(50) DEFAULT NULL,
    avatar_url TEXT DEFAULT NULL,
    address TEXT DEFAULT NULL,
    street VARCHAR(255) DEFAULT NULL,
    number VARCHAR(20) DEFAULT NULL,
    neighborhood VARCHAR(255) DEFAULT NULL,
    city VARCHAR(255) DEFAULT NULL,
    state VARCHAR(50) DEFAULT NULL,
    cep VARCHAR(20) DEFAULT NULL,
    points INT DEFAULT 0,
    establishment_id CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE SET NULL
);

CREATE TABLE user_roles (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    role ENUM('admin', 'moderator', 'user') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_role (user_id, role),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE user_sessions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    session_token VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    browser VARCHAR(100) DEFAULT NULL,
    os VARCHAR(100) DEFAULT NULL,
    device_type VARCHAR(50) DEFAULT NULL,
    user_email VARCHAR(255) DEFAULT NULL,
    location_city VARCHAR(100) DEFAULT NULL,
    location_state VARCHAR(100) DEFAULT NULL,
    establishment_id CHAR(36) DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE SET NULL
);

-- =============================================
-- PLANS
-- =============================================

CREATE TABLE plans (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    promo_price DECIMAL(10,2) DEFAULT NULL,
    promo_period VARCHAR(50) DEFAULT NULL,
    billing_cycle VARCHAR(50) NOT NULL DEFAULT 'monthly',
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    show_on_landing BOOLEAN DEFAULT FALSE,
    features JSON DEFAULT NULL,
    landing_features JSON DEFAULT NULL,
    cta_text VARCHAR(255) DEFAULT NULL,
    cta_link TEXT DEFAULT NULL,
    max_products INT DEFAULT 50,
    max_categories INT DEFAULT 10,
    max_brands INT DEFAULT 10,
    has_overview BOOLEAN DEFAULT TRUE,
    has_products BOOLEAN DEFAULT TRUE,
    has_brands BOOLEAN DEFAULT TRUE,
    has_categories BOOLEAN DEFAULT TRUE,
    has_banners BOOLEAN DEFAULT TRUE,
    has_coupons BOOLEAN DEFAULT TRUE,
    has_orders BOOLEAN DEFAULT TRUE,
    has_customers BOOLEAN DEFAULT TRUE,
    has_settings BOOLEAN DEFAULT TRUE,
    has_virtual_store BOOLEAN DEFAULT TRUE,
    has_catalog_only BOOLEAN DEFAULT FALSE,
    has_pdv BOOLEAN DEFAULT FALSE,
    has_events BOOLEAN DEFAULT FALSE,
    has_financial BOOLEAN DEFAULT FALSE,
    has_service_notes BOOLEAN DEFAULT FALSE,
    has_reports BOOLEAN DEFAULT FALSE,
    has_wallet BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =============================================
-- ESTABLISHMENTS
-- =============================================

CREATE TABLE establishments (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT DEFAULT NULL,
    logo_url TEXT DEFAULT NULL,
    email VARCHAR(255) DEFAULT NULL,
    cnpj_cpf VARCHAR(20) DEFAULT NULL,
    owner_id CHAR(36) DEFAULT NULL,
    plan_id CHAR(36) DEFAULT NULL,
    status VARCHAR(50) DEFAULT 'active',
    is_active BOOLEAN DEFAULT TRUE,
    due_date DATE DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE SET NULL
);

CREATE TABLE establishment_members (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    establishment_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_member (establishment_id, user_id),
    FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE establishment_settings (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    establishment_id CHAR(36) NOT NULL UNIQUE,
    primary_color VARCHAR(20) DEFAULT '#3834ED',
    secondary_color VARCHAR(20) DEFAULT NULL,
    default_theme VARCHAR(20) DEFAULT 'system',
    delivery_fee DECIMAL(10,2) DEFAULT 5.00,
    free_delivery_threshold DECIMAL(10,2) DEFAULT 100.00,
    minimum_order_value DECIMAL(10,2) DEFAULT NULL,
    show_age_restriction BOOLEAN DEFAULT FALSE,
    phone VARCHAR(50) DEFAULT NULL,
    whatsapp VARCHAR(50) DEFAULT NULL,
    email VARCHAR(255) DEFAULT NULL,
    address TEXT DEFAULT NULL,
    delivery_cep VARCHAR(20) DEFAULT NULL,
    delivery_city VARCHAR(100) DEFAULT NULL,
    delivery_state VARCHAR(50) DEFAULT NULL,
    opening_hours JSON DEFAULT NULL,
    instagram_url TEXT DEFAULT NULL,
    facebook_url TEXT DEFAULT NULL,
    tiktok_url TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE CASCADE
);

-- =============================================
-- CATALOG
-- =============================================

CREATE TABLE product_categories (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(100) DEFAULT NULL,
    display_order INT DEFAULT 0,
    establishment_id CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE CASCADE
);

CREATE TABLE brands (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    logo_url TEXT DEFAULT NULL,
    establishment_id CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE CASCADE
);

CREATE TABLE products (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    price DECIMAL(10,2) NOT NULL,
    sale_price DECIMAL(10,2) DEFAULT NULL,
    cost_price DECIMAL(10,2) DEFAULT NULL,
    is_on_sale BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    stock INT DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0,
    reviews_count INT DEFAULT 0,
    sales_count INT DEFAULT 0,
    image_url TEXT DEFAULT NULL,
    alcohol_content VARCHAR(50) DEFAULT NULL,
    volume VARCHAR(50) DEFAULT NULL,
    brand_id CHAR(36) DEFAULT NULL,
    category_id CHAR(36) DEFAULT NULL,
    establishment_id CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE SET NULL,
    FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE CASCADE
);

CREATE TABLE product_images (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    product_id CHAR(36) NOT NULL,
    image_url TEXT NOT NULL,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE product_variants (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    product_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    options JSON DEFAULT NULL,
    is_required BOOLEAN DEFAULT FALSE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- =============================================
-- ORDERS
-- =============================================

CREATE TABLE orders (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) DEFAULT NULL,
    establishment_id CHAR(36) DEFAULT NULL,
    seller_id CHAR(36) DEFAULT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    payment_method VARCHAR(50) DEFAULT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    discount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    cash_amount DECIMAL(10,2) DEFAULT NULL,
    delivery_address JSON DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE SET NULL
);

CREATE TABLE order_items (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    order_id CHAR(36) NOT NULL,
    product_id CHAR(36) DEFAULT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_image TEXT DEFAULT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- =============================================
-- COUPONS & BANNERS & FAVORITES
-- =============================================

CREATE TABLE coupons (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    code VARCHAR(100) NOT NULL,
    description TEXT DEFAULT NULL,
    discount_type VARCHAR(50) DEFAULT 'percentage',
    discount_value DECIMAL(10,2) NOT NULL,
    minimum_order_value DECIMAL(10,2) DEFAULT NULL,
    max_uses INT DEFAULT NULL,
    current_uses INT DEFAULT 0,
    valid_from TIMESTAMP DEFAULT NULL,
    valid_until TIMESTAMP DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    establishment_id CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE CASCADE
);

CREATE TABLE banners (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255) DEFAULT NULL,
    image_url TEXT NOT NULL,
    link_url TEXT DEFAULT NULL,
    link_type VARCHAR(50) DEFAULT 'none',
    link_id VARCHAR(255) DEFAULT NULL,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    starts_at TIMESTAMP DEFAULT NULL,
    ends_at TIMESTAMP DEFAULT NULL,
    establishment_id CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE CASCADE
);

CREATE TABLE favorites (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_favorite (user_id, product_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- =============================================
-- EVENTS & TICKETS
-- =============================================

CREATE TABLE events (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    location VARCHAR(255) DEFAULT NULL,
    image_url TEXT DEFAULT NULL,
    map_image_url TEXT DEFAULT NULL,
    youtube_url TEXT DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    establishment_id CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE CASCADE
);

CREATE TABLE ticket_batches (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    event_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE TABLE ticket_types (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    event_id CHAR(36) NOT NULL,
    batch_id CHAR(36) DEFAULT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    quantity_available INT NOT NULL DEFAULT 0,
    quantity_sold INT NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES ticket_batches(id) ON DELETE SET NULL
);

CREATE TABLE ticket_sales (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    event_id CHAR(36) NOT NULL,
    ticket_type_id CHAR(36) NOT NULL,
    establishment_id CHAR(36) DEFAULT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) DEFAULT 0,
    fee_amount DECIMAL(10,2) DEFAULT 0,
    total_price DECIMAL(10,2) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id) ON DELETE CASCADE,
    FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE SET NULL
);

CREATE TABLE tickets (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    ticket_sale_id CHAR(36) NOT NULL,
    ticket_type_id CHAR(36) NOT NULL,
    event_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    qr_code TEXT NOT NULL,
    is_validated BOOLEAN DEFAULT FALSE,
    validated_at TIMESTAMP DEFAULT NULL,
    validated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_sale_id) REFERENCES ticket_sales(id) ON DELETE CASCADE,
    FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- FINANCIAL
-- =============================================

CREATE TABLE wallet_transactions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    establishment_id CHAR(36) NOT NULL,
    type VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT DEFAULT NULL,
    reference_id CHAR(36) DEFAULT NULL,
    available_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE CASCADE
);

CREATE TABLE withdrawal_requests (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    establishment_id CHAR(36) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    recipient_name VARCHAR(255) DEFAULT NULL,
    pix_key VARCHAR(255) DEFAULT NULL,
    pix_key_type VARCHAR(50) DEFAULT NULL,
    document VARCHAR(50) DEFAULT NULL,
    bank_name VARCHAR(255) DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP DEFAULT NULL,
    processed_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE CASCADE
);

CREATE TABLE expenses (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    establishment_id CHAR(36) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    category VARCHAR(100) DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    expense_date DATE NOT NULL DEFAULT (CURDATE()),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE CASCADE
);

CREATE TABLE manual_entries (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    establishment_id CHAR(36) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    category VARCHAR(100) DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    entry_date DATE NOT NULL DEFAULT (CURDATE()),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE CASCADE
);

-- =============================================
-- PLATFORM FEES
-- =============================================

CREATE TABLE platform_fees (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    is_active BOOLEAN DEFAULT TRUE,
    gateway_credit_percentage DECIMAL(5,2) DEFAULT 5.99,
    gateway_credit_fixed DECIMAL(5,2) DEFAULT 0.99,
    gateway_pix_percentage DECIMAL(5,2) DEFAULT 0,
    gateway_pix_fixed DECIMAL(5,2) DEFAULT 0,
    customer_product_percentage DECIMAL(5,2) DEFAULT 0,
    customer_product_fixed DECIMAL(5,2) DEFAULT 0,
    customer_ticket_percentage DECIMAL(5,2) DEFAULT 10,
    customer_ticket_minimum DECIMAL(5,2) DEFAULT 2.50,
    customer_pix_percentage DECIMAL(5,2) DEFAULT 0,
    customer_pix_fixed DECIMAL(5,2) DEFAULT 0,
    -- Crédito parcelado: gateway_credit_1x a 12x (_percentage e _fixed)
    -- Crédito parcelado: customer_credit_1x a 12x (_percentage e _fixed)
    -- (omitidas por brevidade — replicar as 48 colunas de parcelas)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE platform_fee_logs (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    field_changed VARCHAR(100) NOT NULL,
    old_value DECIMAL(10,2) DEFAULT NULL,
    new_value DECIMAL(10,2) DEFAULT NULL,
    changed_by CHAR(36) NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (changed_by) REFERENCES users(id)
);

-- =============================================
-- LOGS & MONITORING
-- =============================================

CREATE TABLE activity_logs (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) DEFAULT NULL,
    user_email VARCHAR(255) DEFAULT NULL,
    user_role VARCHAR(50) DEFAULT NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) DEFAULT NULL,
    resource_id VARCHAR(255) DEFAULT NULL,
    resource_name VARCHAR(255) DEFAULT NULL,
    result VARCHAR(50) DEFAULT NULL,
    error_message TEXT DEFAULT NULL,
    details JSON DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    browser VARCHAR(100) DEFAULT NULL,
    os VARCHAR(100) DEFAULT NULL,
    device_type VARCHAR(50) DEFAULT NULL,
    location_city VARCHAR(100) DEFAULT NULL,
    location_state VARCHAR(100) DEFAULT NULL,
    location_country VARCHAR(100) DEFAULT NULL,
    establishment_id CHAR(36) DEFAULT NULL,
    establishment_name VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE SET NULL
);

CREATE TABLE security_alerts (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) DEFAULT NULL,
    user_email VARCHAR(255) DEFAULT NULL,
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) DEFAULT 'medium',
    description TEXT NOT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    location VARCHAR(255) DEFAULT NULL,
    metadata JSON DEFAULT NULL,
    establishment_id CHAR(36) DEFAULT NULL,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by CHAR(36) DEFAULT NULL,
    resolved_at TIMESTAMP DEFAULT NULL,
    resolved_note TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE SET NULL
);

CREATE TABLE logs_access_audit (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    user_email VARCHAR(255) DEFAULT NULL,
    action VARCHAR(100) NOT NULL,
    filters_applied JSON DEFAULT NULL,
    records_accessed INT DEFAULT 0,
    ip_address VARCHAR(45) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- =============================================
-- LANDING PAGE & STORE SETTINGS (LEGACY)
-- =============================================

CREATE TABLE landing_page_settings (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
    logo_url TEXT DEFAULT NULL,
    -- Hero
    hero_visible BOOLEAN DEFAULT TRUE,
    hero_badge_text VARCHAR(255) DEFAULT NULL,
    hero_title TEXT DEFAULT NULL,
    hero_subtitle TEXT DEFAULT NULL,
    hero_cta_text VARCHAR(255) DEFAULT NULL,
    hero_cta_link TEXT DEFAULT NULL,
    hero_secondary_btn_visible BOOLEAN DEFAULT TRUE,
    hero_secondary_btn_text VARCHAR(255) DEFAULT NULL,
    hero_secondary_btn_link TEXT DEFAULT NULL,
    hero_trust1 VARCHAR(255) DEFAULT NULL,
    hero_trust2 VARCHAR(255) DEFAULT NULL,
    hero_trust3 VARCHAR(255) DEFAULT NULL,
    -- Navbar
    navbar_cta_text VARCHAR(255) DEFAULT NULL,
    navbar_cta_link TEXT DEFAULT NULL,
    -- Banner
    banner_enabled BOOLEAN DEFAULT FALSE,
    banner_title VARCHAR(255) DEFAULT NULL,
    banner_description TEXT DEFAULT NULL,
    banner_button_text VARCHAR(255) DEFAULT NULL,
    banner_button_link TEXT DEFAULT NULL,
    banner_image_url TEXT DEFAULT NULL,
    banner_mobile_image_url TEXT DEFAULT NULL,
    -- Pain Points
    painpoints_visible BOOLEAN DEFAULT TRUE,
    painpoints_badge VARCHAR(255) DEFAULT NULL,
    painpoints_title VARCHAR(255) DEFAULT NULL,
    painpoints_subtitle TEXT DEFAULT NULL,
    painpoints_solution_title VARCHAR(255) DEFAULT NULL,
    painpoints_solution_subtitle TEXT DEFAULT NULL,
    painpoints_cards JSON DEFAULT NULL,
    -- Benefits
    benefits_visible BOOLEAN DEFAULT TRUE,
    benefits_badge VARCHAR(255) DEFAULT NULL,
    benefits_title VARCHAR(255) DEFAULT NULL,
    benefits_subtitle TEXT DEFAULT NULL,
    benefits_cards JSON DEFAULT NULL,
    -- Features
    features_visible BOOLEAN DEFAULT TRUE,
    features_badge VARCHAR(255) DEFAULT NULL,
    features_title VARCHAR(255) DEFAULT NULL,
    features_subtitle TEXT DEFAULT NULL,
    features_cards JSON DEFAULT NULL,
    -- Pricing
    pricing_visible BOOLEAN DEFAULT TRUE,
    pricing_badge VARCHAR(255) DEFAULT NULL,
    pricing_title VARCHAR(255) DEFAULT NULL,
    pricing_promo_text TEXT DEFAULT NULL,
    -- CTA
    cta_visible BOOLEAN DEFAULT TRUE,
    cta_title VARCHAR(255) DEFAULT NULL,
    cta_subtitle TEXT DEFAULT NULL,
    cta_button_text VARCHAR(255) DEFAULT NULL,
    cta_button_link TEXT DEFAULT NULL,
    cta_social_proof TEXT DEFAULT NULL,
    -- Footer
    footer_visible BOOLEAN DEFAULT TRUE,
    footer_description TEXT DEFAULT NULL,
    footer_instagram_url TEXT DEFAULT NULL,
    footer_facebook_url TEXT DEFAULT NULL,
    footer_linkedin_url TEXT DEFAULT NULL,
    footer_terms_url TEXT DEFAULT NULL,
    footer_privacy_url TEXT DEFAULT NULL,
    footer_help_url TEXT DEFAULT NULL,
    footer_contact_url TEXT DEFAULT NULL,
    --
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE store_settings (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    store_name VARCHAR(255) DEFAULT 'Moonky',
    store_description TEXT DEFAULT NULL,
    store_logo_url TEXT DEFAULT NULL,
    phone VARCHAR(50) DEFAULT NULL,
    whatsapp VARCHAR(50) DEFAULT NULL,
    email VARCHAR(255) DEFAULT NULL,
    address TEXT DEFAULT NULL,
    primary_color VARCHAR(20) DEFAULT '#3834ED',
    secondary_color VARCHAR(20) DEFAULT NULL,
    default_theme VARCHAR(20) DEFAULT 'system',
    delivery_fee DECIMAL(10,2) DEFAULT 5.00,
    free_delivery_threshold DECIMAL(10,2) DEFAULT 100.00,
    minimum_order_value DECIMAL(10,2) DEFAULT NULL,
    show_age_restriction BOOLEAN DEFAULT TRUE,
    delivery_cep VARCHAR(20) DEFAULT NULL,
    delivery_city VARCHAR(100) DEFAULT NULL,
    delivery_state VARCHAR(50) DEFAULT NULL,
    opening_hours JSON DEFAULT NULL,
    instagram_url TEXT DEFAULT NULL,
    facebook_url TEXT DEFAULT NULL,
    tiktok_url TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =============================================
-- STORED PROCEDURES
-- =============================================

DELIMITER //

CREATE FUNCTION has_role(p_user_id CHAR(36), p_role VARCHAR(20))
RETURNS BOOLEAN
DETERMINISTIC
READS SQL DATA
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role = p_role
    );
END //

CREATE FUNCTION is_establishment_member(p_user_id CHAR(36), p_establishment_id CHAR(36))
RETURNS BOOLEAN
DETERMINISTIC
READS SQL DATA
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM establishment_members WHERE user_id = p_user_id AND establishment_id = p_establishment_id
    );
END //

CREATE FUNCTION is_establishment_owner(p_user_id CHAR(36), p_establishment_id CHAR(36))
RETURNS BOOLEAN
DETERMINISTIC
READS SQL DATA
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM establishments WHERE id = p_establishment_id AND owner_id = p_user_id
    );
END //

-- Trigger: auto-increment sales_count
CREATE TRIGGER after_order_item_insert
AFTER INSERT ON order_items
FOR EACH ROW
BEGIN
    UPDATE products SET sales_count = COALESCE(sales_count, 0) + NEW.quantity WHERE id = NEW.product_id;
END //

DELIMITER ;

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_profiles_establishment ON profiles(establishment_id);
CREATE INDEX idx_products_establishment ON products(establishment_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_orders_establishment ON orders(establishment_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_events_establishment ON events(establishment_id);
CREATE INDEX idx_activity_logs_establishment ON activity_logs(establishment_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at);
CREATE INDEX idx_wallet_establishment ON wallet_transactions(establishment_id);
CREATE INDEX idx_banners_establishment ON banners(establishment_id);
CREATE INDEX idx_coupons_establishment ON coupons(establishment_id);
CREATE INDEX idx_est_members_user ON establishment_members(user_id);
CREATE INDEX idx_est_members_establishment ON establishment_members(establishment_id);
```

---

## Resumo da Migração

| Item | Quantidade |
|---|---|
| Tabelas MySQL | 27 |
| Endpoints REST PHP | ~80 |
| Edge Functions → PHP | 5 |
| Stored Procedures/Functions | 3 |
| Triggers MySQL | 1 |
| Storage Buckets → Diretórios/S3 | 6 |

### Pontos Críticos

1. **RLS → Middleware PHP**: MySQL não possui Row Level Security. Toda a lógica de autorização (has_role, is_establishment_member, isolamento multi-tenant) deve ser implementada como middleware PHP em cada endpoint.

2. **Auth Multi-tenant**: O sistema de email isolado (`user__slug@domain.com`) precisa ser replicado na camada PHP. O JWT/session deve carregar `establishment_id` e `roles`.

3. **Realtime**: Se o projeto usa Supabase Realtime (WebSockets), será necessário implementar polling ou WebSocket server (ex: Ratchet, Pusher) no PHP.

4. **Storage**: Os 6 buckets públicos precisam de equivalente (diretório local com URL pública ou S3/MinIO).

5. **Cascade Delete**: A função `delete_establishment_cascade` toca ~20 tabelas. Com `ON DELETE CASCADE` no MySQL, boa parte é automática, mas tabelas com referências cruzadas precisam de atenção.
