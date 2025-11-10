# 🏠 Home Screen Redesign - Sugestões

> Documento de planejamento para redesign da tela inicial do Modulo/Modulo

## 📋 Visão Geral

Transformar a home screen atual (que mostra apenas cards estáticos de features) em um **dashboard produtivo e interativo** que mostra informações reais e relevantes para o usuário.

---

## 🎯 Objetivos do Redesign

1. **Mostrar dados reais** do workspace do usuário
2. **Facilitar acesso rápido** às funcionalidades principais
3. **Exibir atividade recente** para contexto imediato
4. **Personalização** conforme necessidades do usuário
5. **Onboarding inteligente** para novos usuários

---

## 🏗️ Estrutura Proposta

### 1. Dashboard com Métricas e Atividades Recentes

Em vez de apenas cards estáticos de features, transformar a home em um **dashboard produtivo**:

#### **Seção "At a Glance" (Visão Geral)**
Exibir métricas chave do workspace:

- **Total de projetos ativos** (com gráfico simples ou ícone)
- **Tarefas pendentes hoje** (count com link direto)
- **Tarefas completadas esta semana** (progress bar animado)
- **Projetos favoritos** (quick access com ícones personalizados)

**Exemplo visual:**
```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  📊 12      │  │  📝 8       │  │  ✅ 5       │  │  ⭐ 3       │
│  Projects   │  │  Tasks      │  │  Completed  │  │  Favorites  │
│  Active     │  │  Today      │  │  This Week  │  │  Boards     │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
```

#### **Seção "Recent Activity"**
Timeline de atividades recentes no workspace:

- Últimas 5-10 tarefas criadas/modificadas/completadas
- Timestamp relativo ("2 hours ago", "Yesterday")
- Avatar/ícone do projeto
- Link direto para o board/task
- Filtros opcionais (hoje, esta semana, este mês)

**Exemplo:**
```
📝 Recent Activity
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• [🎨 Design Project] Task "Create mockups" moved to Done
  2 hours ago → View Board

• [💻 Dev Sprint] New task "Fix login bug" added to Backlog
  5 hours ago → View Task

• [📊 Marketing] Task "Launch campaign" deadline updated
  Yesterday → View Board
```

#### **Seção "Quick Actions"**
Botões maiores e mais visuais para ações frequentes:

- ➕ **New Board** → Abre dialog de criar projeto
- 📝 **New Task** → Quick add em qualquer board (com seletor)
- 📊 **View All Boards** → Navega para /boards
- ⭐ **Favorites** → Navega para /projects/favorites
- 🔍 **Search** → Abre Command Palette (Cmd+K)
- 📁 **Browse Projects** → Navega para /projects/all

**Design sugerido:**
- Cards grandes e clicáveis
- Ícones lucide-react
- Hover effects com animação
- Keyboard shortcuts visíveis

---

### 2. Widgets Personalizáveis

Sistema modular onde usuário escolhe o que ver:

#### **Calendar Widget**
- Mini calendário do mês atual
- Próximas deadlines destacadas
- Due dates das tarefas
- Click para ver detalhes

#### **Notes Widget**
- Últimas 3-5 notas criadas
- Preview do conteúdo (truncado)
- Link para abrir nota completa
- Busca rápida de notas

#### **Draws Widget**
- Thumbnails dos últimos desenhos tldraw
- Preview on hover
- Link direto para editar

#### **Stats Widget**
- Gráficos de produtividade
- Tarefas completadas: semanal/mensal
- Comparação com período anterior
- Streak counter (dias consecutivos trabalhando)

#### **Upcoming Deadlines Widget**
- Lista de tarefas com deadline próximo
- Ordenado por urgência
- Color coding (vermelho = vencido, amarelo = próximo)

**Implementação:**
- Usar drag-and-drop para reordenar widgets
- Salvar preferências no SQLite
- Toggle visibility de cada widget
- Opção de reset para layout padrão

---

### 3. Busca Global Prominente

Search bar grande e acessível no topo da home:

**Features:**
- Placeholder: "Search tasks, boards, notes..."
- Atalho visual: Badge com `Cmd+K` / `Ctrl+K`
- Busca em tempo real (debounced)
- Categorização de resultados:
  - 📊 Boards
  - 📝 Tasks
  - 📄 Notes
  - ✏️ Draws
- Navegação por teclado (↑↓ arrows, Enter)
- Highlight de texto matched

**Design:**
```
┌────────────────────────────────────────────────────────┐
│  🔍  Search tasks, boards, notes...          [⌘K]     │
└────────────────────────────────────────────────────────┘
```

---

### 4. Onboarding Condicional

Experiência adaptada ao estado do workspace:

#### **Usuário Novo (sem projetos)**
- Welcome message personalizada
- Wizard de criação de primeiro board
- Tutorial interativo (opcional)
- Sugestões de templates:
  - 🎯 Personal Goals
  - 💻 Software Development
  - 🎨 Design Projects
  - 📚 Learning Tracker
  - 🏠 Home Organization

#### **Usuário com Projetos**
- Dashboard completo com dados reais
- Sugestão de funcionalidades não utilizadas
- Tips & tricks contextuais

#### **Transição suave:**
```typescript
const isEmpty = projects.length === 0 && tasks.length === 0

return isEmpty ? <OnboardingView /> : <DashboardView />
```

---

### 5. Design e UX Melhorado

#### **Layout Proposto:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Welcome back, User! 👋                    [Settings] [Profile] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🔍  Search anything...                              [Cmd+K]    │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  📊 Overview                                                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │
│  │  📊 12       │ │  📝 8 Tasks  │ │  ✅ 5 Done   │           │
│  │  Projects    │ │  Due Today   │ │  This Week   │           │
│  │  Active      │ │              │ │              │           │
│  └──────────────┘ └──────────────┘ └──────────────┘           │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  ⚡ Quick Actions                                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ ➕ New   │ │ 📝 New   │ │ 📊 View  │ │ ⭐ Fav   │          │
│  │ Board    │ │ Task     │ │ Boards   │ │ Projects │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  ⭐ Favorite Projects                        [View All →]      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐│
│  │ 🎨 Design       │  │ 💻 Dev Sprint   │  │ 📊 Marketing    ││
│  │ 8 tasks • 60%   │  │ 12 tasks • 40%  │  │ 5 tasks • 80%   ││
│  │ ▓▓▓▓▓▓▓░░░      │  │ ▓▓▓▓░░░░░░      │  │ ▓▓▓▓▓▓▓▓░░      ││
│  └─────────────────┘  └─────────────────┘  └─────────────────┘│
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  📝 Recent Activity                          [View All →]      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ • Task "Fix login bug" moved to Done                     │  │
│  │   [💻 Dev Sprint] → 2 hours ago                          │  │
│  │                                                            │  │
│  │ • New board "Q1 2025 Goals" created                       │  │
│  │   [🎯 Personal] → Yesterday at 3:42 PM                    │  │
│  │                                                            │  │
│  │ • Task "Review mockups" assigned to you                   │  │
│  │   [🎨 Design] → 2 days ago                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  🗓️ Upcoming Deadlines                      [View All →]      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 🔴 OVERDUE: "Submit proposal" in Marketing (2 days late) │  │
│  │ 🟡 TODAY: "Finish designs" in Design Project             │  │
│  │ 🟢 Tomorrow: "Code review" in Dev Sprint                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

#### **Princípios de Design:**

1. **Hierarchy Visual Clara**
   - Títulos grandes para seções
   - Uso consistente de ícones
   - Whitespace adequado

2. **Color Coding Semântico**
   - Verde: completed/success
   - Amarelo: warning/pending
   - Vermelho: overdue/error
   - Azul: informativo
   - Cinza: neutro/desabilitado

3. **Animações Suaves** (Framer Motion)
   - Fade in de cards
   - Hover effects
   - Loading states
   - Micro-interactions

4. **Responsive Design**
   - Mobile: stack vertical
   - Tablet: 2 colunas
   - Desktop: 3-4 colunas

5. **Dark Mode Friendly**
   - Contraste adequado
   - Colors ajustados
   - Transparência para glassmorphism

---

## 🛠️ Implementação Técnica

### Estrutura de Arquivos Sugerida

```
src/components/home/
├── HomeWelcome.tsx              # Container principal
├── sections/
│   ├── OverviewSection.tsx      # Métricas principais
│   ├── QuickActionsSection.tsx  # Botões de ação rápida
│   ├── FavoritesSection.tsx     # Projetos favoritos
│   ├── ActivitySection.tsx      # Timeline de atividades
│   ├── DeadlinesSection.tsx     # Tarefas com deadline
│   └── SearchSection.tsx        # Busca global
├── widgets/
│   ├── CalendarWidget.tsx
│   ├── NotesWidget.tsx
│   ├── DrawsWidget.tsx
│   ├── StatsWidget.tsx
│   └── WidgetContainer.tsx      # Wrapper genérico
├── cards/
│   ├── StatsCard.tsx            # Card de métrica
│   ├── ProjectCard.tsx          # Card de projeto
│   ├── ActivityItem.tsx         # Item de atividade
│   └── QuickActionCard.tsx      # Card de ação rápida
└── hooks/
    ├── useRecentActivity.ts     # Hook para atividades
    ├── useTaskStats.ts          # Hook para estatísticas
    ├── useFavoriteBoards.ts     # Hook para favoritos
    ├── useUpcomingDeadlines.ts  # Hook para deadlines
    └── useHomeData.ts           # Hook agregador
```

### Hooks Personalizados

#### `useHomeData.ts` - Hook agregador
```typescript
export function useHomeData() {
  const { data: stats, isLoading: statsLoading } = useTaskStats()
  const { data: activity, isLoading: activityLoading } = useRecentActivity()
  const { data: favorites, isLoading: favoritesLoading } = useFavoriteBoards()
  const { data: deadlines, isLoading: deadlinesLoading } = useUpcomingDeadlines()

  return {
    stats,
    activity,
    favorites,
    deadlines,
    isLoading: statsLoading || activityLoading || favoritesLoading || deadlinesLoading
  }
}
```

#### `useTaskStats.ts` - Estatísticas de tarefas
```typescript
export interface TaskStats {
  totalProjects: number
  activeProjects: number
  tasksToday: number
  tasksThisWeek: number
  completedToday: number
  completedThisWeek: number
  overdueTasks: number
}

export function useTaskStats() {
  return useQuery({
    queryKey: ['home', 'stats'],
    queryFn: async () => {
      // Invoke Tauri commands para buscar stats do SQLite
      const stats = await invoke<TaskStats>('get_task_statistics')
      return stats
    }
  })
}
```

#### `useRecentActivity.ts` - Atividades recentes
```typescript
export interface Activity {
  id: string
  type: 'task_created' | 'task_updated' | 'task_completed' | 'board_created'
  title: string
  boardName: string
  boardIcon?: string
  timestamp: string
  entityId: string
  entityType: 'task' | 'board'
}

export function useRecentActivity(limit = 10) {
  return useQuery({
    queryKey: ['home', 'activity', limit],
    queryFn: async () => {
      const activities = await invoke<Activity[]>('get_recent_activity', { limit })
      return activities
    }
  })
}
```

#### `useFavoriteBoards.ts` - Projetos favoritos
```typescript
export function useFavoriteBoards() {
  return useQuery({
    queryKey: ['home', 'favorites'],
    queryFn: async () => {
      const boards = await invoke<Board[]>('get_favorite_boards')
      // Adicionar progresso para cada board
      const boardsWithProgress = await Promise.all(
        boards.map(async (board) => {
          const stats = await invoke<BoardStats>('get_board_stats', { 
            boardId: board.id 
          })
          return { ...board, ...stats }
        })
      )
      return boardsWithProgress
    }
  })
}
```

#### `useUpcomingDeadlines.ts` - Deadlines próximas
```typescript
export interface TaskWithDeadline {
  id: string
  title: string
  deadline: string
  boardName: string
  boardId: string
  isOverdue: boolean
  daysUntil: number
}

export function useUpcomingDeadlines(days = 7) {
  return useQuery({
    queryKey: ['home', 'deadlines', days],
    queryFn: async () => {
      const tasks = await invoke<TaskWithDeadline[]>('get_upcoming_deadlines', { 
        daysAhead: days 
      })
      return tasks.sort((a, b) => {
        // Overdue primeiro, depois por data
        if (a.isOverdue && !b.isOverdue) return -1
        if (!a.isOverdue && b.isOverdue) return 1
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      })
    }
  })
}
```

### Componentes Principais

#### `OverviewSection.tsx`
```typescript
export function OverviewSection() {
  const { stats, isLoading } = useTaskStats()

  if (isLoading) return <OverviewSkeleton />

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Overview</h2>
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <StatsCard
          icon={FolderKanban}
          label="Active Projects"
          value={stats.activeProjects}
          total={stats.totalProjects}
        />
        <StatsCard
          icon={CheckSquare}
          label="Tasks Today"
          value={stats.tasksToday}
          variant="primary"
        />
        <StatsCard
          icon={CheckCheck}
          label="Completed This Week"
          value={stats.completedThisWeek}
          variant="success"
        />
        <StatsCard
          icon={AlertCircle}
          label="Overdue"
          value={stats.overdueTasks}
          variant="danger"
        />
      </div>
    </section>
  )
}
```

#### `QuickActionsSection.tsx`
```typescript
export function QuickActionsSection() {
  const navigate = useNavigate()
  const { mutate: createBoard } = useCreateBoard()

  const actions = [
    {
      icon: Plus,
      label: 'New Board',
      shortcut: 'Cmd+N',
      onClick: () => {/* Open create dialog */}
    },
    {
      icon: FileText,
      label: 'New Task',
      onClick: () => {/* Open quick add */}
    },
    {
      icon: LayoutGrid,
      label: 'View Boards',
      onClick: () => navigate('/boards')
    },
    {
      icon: Star,
      label: 'Favorites',
      onClick: () => navigate('/projects/favorites')
    }
  ]

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Quick Actions</h2>
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {actions.map((action) => (
          <QuickActionCard key={action.label} {...action} />
        ))}
      </div>
    </section>
  )
}
```

#### `StatsCard.tsx`
```typescript
interface StatsCardProps {
  icon: LucideIcon
  label: string
  value: number
  total?: number
  variant?: 'default' | 'primary' | 'success' | 'danger'
}

export function StatsCard({ 
  icon: Icon, 
  label, 
  value, 
  total,
  variant = 'default' 
}: StatsCardProps) {
  const percentage = total ? (value / total) * 100 : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border bg-card p-4 space-y-2"
    >
      <div className="flex items-center justify-between">
        <Icon className={cn("h-5 w-5", variantClasses[variant])} />
        {percentage !== null && (
          <span className="text-xs text-muted-foreground">
            {percentage.toFixed(0)}%
          </span>
        )}
      </div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
      {total !== null && (
        <Progress value={percentage} className="h-1" />
      )}
    </motion.div>
  )
}
```

### Backend (Tauri Commands)

Adicionar em `src-tauri/src/lib.rs` ou arquivo separado:

```rust
#[tauri::command]
async fn get_task_statistics(
    state: State<'_, AppState>
) -> Result<TaskStats, String> {
    let conn = state.db.lock().await;
    
    // Query SQLite para stats
    let stats = sqlx::query_as!(
        TaskStats,
        r#"
        SELECT 
            COUNT(DISTINCT b.id) as total_projects,
            COUNT(DISTINCT CASE WHEN b.archived = 0 THEN b.id END) as active_projects,
            COUNT(CASE WHEN date(t.due_date) = date('now') THEN 1 END) as tasks_today,
            COUNT(CASE WHEN date(t.due_date) >= date('now', '-7 days') THEN 1 END) as tasks_this_week,
            COUNT(CASE WHEN t.completed = 1 AND date(t.completed_at) = date('now') THEN 1 END) as completed_today,
            COUNT(CASE WHEN t.completed = 1 AND date(t.completed_at) >= date('now', '-7 days') THEN 1 END) as completed_this_week,
            COUNT(CASE WHEN t.due_date < datetime('now') AND t.completed = 0 THEN 1 END) as overdue_tasks
        FROM boards b
        LEFT JOIN tasks t ON t.board_id = b.id
        "#
    )
    .fetch_one(&*conn)
    .await
    .map_err(|e| e.to_string())?;
    
    Ok(stats)
}

#[tauri::command]
async fn get_recent_activity(
    state: State<'_, AppState>,
    limit: i32
) -> Result<Vec<Activity>, String> {
    // Query para atividades recentes
    // Pode usar tabela de audit log ou timestamps das entidades
}

#[tauri::command]
async fn get_favorite_boards(
    state: State<'_, AppState>
) -> Result<Vec<Board>, String> {
    // Query boards com is_favorite = 1
}

#[tauri::command]
async fn get_upcoming_deadlines(
    state: State<'_, AppState>,
    days_ahead: i32
) -> Result<Vec<TaskWithDeadline>, String> {
    // Query tasks com deadline nos próximos N dias
}
```

---

## 🎨 Temas Visuais

### Variantes de Cards

```typescript
const variantClasses = {
  default: 'text-muted-foreground',
  primary: 'text-blue-500',
  success: 'text-green-500',
  danger: 'text-red-500',
  warning: 'text-yellow-500'
}
```

### Animações

```typescript
// Fade in cards sequencialmente
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

// Hover effects
const hoverScale = {
  scale: 1.02,
  transition: { duration: 0.2 }
}
```

---

## 📊 Métricas e Analytics

### Eventos a Trackear

Para entender uso da home screen:

- Click em quick actions
- Views de seções (scroll tracking)
- Click em projetos favoritos
- Click em atividades recentes
- Uso da busca
- Tempo na home screen

### Implementação

```typescript
// Simple analytics (sem tracking externo)
const trackHomeInteraction = (action: string, metadata?: object) => {
  // Log local para análise
  logger.info('home_interaction', { action, ...metadata })
}
```

---

## 🚀 Fases de Implementação

### Phase 1: Foundation (MVP)
- [ ] Overview section com stats básicos
- [ ] Quick actions section
- [ ] Onboarding condicional (empty vs. populated)
- [ ] Layout responsivo básico

### Phase 2: Core Features
- [ ] Favorite projects section com progress
- [ ] Recent activity feed
- [ ] Upcoming deadlines section
- [ ] Global search integration

### Phase 3: Enhancement
- [ ] Widgets personalizáveis
- [ ] Drag & drop para reordenar seções
- [ ] Animações e micro-interactions
- [ ] Dark mode refinement

### Phase 4: Polish
- [ ] Loading states e skeletons
- [ ] Error boundaries
- [ ] Performance optimization
- [ ] Accessibility (a11y)

---

## 🧪 Testing Strategy

### Unit Tests
- Test hooks individuais
- Test componentes isolados
- Test cálculos de stats

### Integration Tests
- Test fluxo completo de criação
- Test navegação entre seções
- Test sincronização de dados

### E2E Tests
- Test jornada do usuário novo
- Test jornada do usuário existente
- Test performance com muitos dados

---

## 🔍 Considerações de Performance

1. **Lazy Loading**
   - Widgets não visíveis carregam on-demand
   - Imagens lazy loaded

2. **Memoization**
   - Memoizar cálculos pesados
   - Use `useMemo` e `useCallback`

3. **Virtualization**
   - Se activity feed ficar grande, usar react-virtual

4. **Caching**
   - React Query cache por 5 minutos
   - Invalidate on mutations

5. **Debouncing**
   - Search input debounced (300ms)
   - Resize handlers debounced

---

## 🎯 Success Metrics

Como medir sucesso do redesign:

1. **Engagement**
   - Tempo médio na home screen
   - Click-through rate em quick actions
   - Uso de favoritos vs. navegação manual

2. **Produtividade**
   - Redução de cliques para tarefas comuns
   - Tempo até primeira ação (TTFA)

3. **Satisfação**
   - User feedback (se houver sistema)
   - Bounce rate da home

---

## 📚 Referências e Inspiração

### Design Systems
- Linear (clean dashboard)
- Notion (personalization)
- Asana (overview cards)
- Height (keyboard-first)

### Patterns
- Dashboard patterns: https://dashboarddesignpatterns.github.io/
- Card patterns: https://ui-patterns.com/patterns/cards
- Empty states: https://emptystat.es/

---

## 🔄 Próximos Passos

1. **Decisão**: Escolher quais features implementar primeiro
2. **Mockups**: Criar protótipos visuais (Figma?)
3. **Backend**: Adicionar Tauri commands necessários
4. **Frontend**: Implementar componentes
5. **Testing**: Testar com dados reais
6. **Refinement**: Iterar baseado em feedback

---

## 💬 Notas

- Manter consistência com design system existente (shadcn/ui)
- Usar ícones do lucide-react para consistência
- Garantir acessibilidade (WCAG AA)
- Suportar keyboard navigation
- Considerar modo offline (já que app é offline-first)

---

**Documento criado em:** 2025-01-XX  
**Última atualização:** 2025-01-XX  
**Status:** Proposta em análise
