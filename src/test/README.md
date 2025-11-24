# Test Suite

Este diretório contém a suíte de testes para o projeto Modulo. Os testes são escritos usando **Vitest** com **React Testing Library**.

## Estrutura dos Testes

```
src/test/
├── README.md                    # Esta documentação
├── setup.ts                     # Configuração global dos testes
├── test-utils.tsx              # Utilitários para testes
├── example.test.ts             # Exemplo de teste
├── hooks/                      # Testes de hooks personalizados
│   ├── useWorkspaceStatus.test.ts
│   ├── useTaskStats.test.ts
│   └── useGlobalSearch.test.ts
├── components/                 # Testes de componentes
│   ├── EmptyOnboarding.test.tsx
│   ├── NewUserOnboarding.test.tsx
│   └── Dashboard.test.tsx
└── e2e/                        # Testes end-to-end
    └── dashboard.e2e.test.tsx
```

## Executando os Testes

### Comandos Disponíveis

```bash
# Executar todos os testes
npm test

# Executar testes em modo watch (desenvolvimento)
npm run test

# Executar testes uma única vez (CI/CD)
npm run test:run

# Executar testes com interface visual
npm run test:ui

# Executar testes com cobertura
npm run test:coverage

# Executar todos os checks (inclui testes)
npm run check:all
```

### Execução Específica

```bash
# Testar apenas um arquivo
npm test src/test/hooks/useWorkspaceStatus.test.ts

# Testar com filtro de nome
npm test -- EmptyOnboarding

# Executar em modo watch
npm test -- --watch
```

## Estratégia de Testes

### 1. Testes de Hooks (`hooks/`)

Testam a lógica de negócio dos hooks personalizados:

- **useWorkspaceStatus**: Verifica detecção de workspace vazio/populado
- **useTaskStats**: Testa carregamento de estatísticas
- **useGlobalSearch**: Valida funcionamento da busca global

### 2. Testes de Componentes (`components/`)

Testam a renderização e interação dos componentes React:

- **EmptyOnboarding**: Componente para workspace vazio
- **NewUserOnboarding**: Dicas para novos usuários
- **Dashboard**: Dashboard principal com onboarding condicional

### 3. Testes End-to-End (`e2e/`)

Simulam fluxos completos do usuário:

- Fluxo de onboarding (vazio → novo usuário → ativo)
- Interação com busca global
- Navegação por keyboard shortcuts

## Boas Práticas

### 1. Organização

- Um arquivo de teste por módulo/componente
- Descritivos: `Componente.test.tsx` ou `useHook.test.ts`
- Agrupar testes relacionados com `describe()`

### 2. Nomeação

- **describe**: Nome do componente/hook em português
- **it/test**: Comportamento esperado em português
- Exemplo:
  ```typescript
  describe('useWorkspaceStatus', () => {
    it('should return empty state when no boards exist', () => { ... })
  })
  ```

### 3. Mocking

Use mocks para dependências externas:

```typescript
// Mock de módulos Tauri
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

// Mock de hooks
vi.mock('@/hooks/useWidgetLayout', () => ({
  useWidgetLayout: () => ({
    widgets: [],
    reorderWidgets: vi.fn(),
  }),
}))
```

### 4. Testing Library

Preferir queries por texto/role ao invés de seletor CSS:

```typescript
// ✅ BOM
expect(screen.getByText('Welcome')).toBeInTheDocument()
expect(screen.getByRole('button', { name: /submit/i }))

// ❌ RUIM
expect(screen.getByTestId('submit-button')).toBeInTheDocument()
```

### 5. Async Testing

Usar `waitFor` para operações assíncronas:

```typescript
// ✅ Para hooks assíncronos
await waitFor(() => {
  expect(result.current.isLoading).toBe(false)
})

// ✅ Para eventos assíncronos
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument()
})
```

### 6. Coverage

Alvos de cobertura:

- **Hooks**: > 90%
- **Componentes**: > 80%
- **Utilitários**: > 95%

## Testes Implementados

### ✅ Hooks

- [x] useWorkspaceStatus
- [x] useTaskStats
- [x] useGlobalSearch

### ✅ Componentes

- [x] EmptyOnboarding
- [x] NewUserOnboarding
- [x] Dashboard (com onboarding condicional)

### ✅ E2E

- [x] Fluxo de workspace vazio
- [x] Fluxo de novo usuário
- [x] Fluxo de workspace ativo
- [x] Integração com busca
- [x] Estados de loading

## Próximos Testes

- [ ] Testes para seções do Dashboard (Overview, QuickActions, etc.)
- [ ] Testes para componentes de cards (StatsCard, ProjectCard, etc.)
- [ ] Testes para hooks restantes (useFavoriteBoards, useRecentActivity, etc.)
- [ ] Testes de integração com backend (Tauri commands)
- [ ] Testes de accessibility

## Debugging

### Visualizar Output Detalhado

```bash
npm test -- --reporter=verbose
```

### Executar Apenas um Teste

```typescript
it.only('should do something specific', () => { ... })
```

### Skip Temporário

```typescript
it.skip('should do something', () => { ... })
```

### Debug com Console

```typescript
it('should debug', () => {
  console.log('Debug info:', data)
  // Visualize no terminal
})
```

## Recursos

- [Vitest Docs](https://vitest.dev/)
- [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [React Testing Cheatsheet](https://react-testing-library.com/)
- [Vitest Coverage Guide](https://vitest.dev/guide/coverage.html)

## Troubleshooting

### Testes Falhando com Erro de Import

Verifique se o `tsconfig.json` tem path aliases configurados e se o `vitest.config.ts` tem os aliases corretos.

### Timeouts em Testes Async

Aumente o timeout ou use `waitFor`:

```typescript
it('should timeout', async () => {
  await waitFor(
    () => {
      expect(screen.getByText('Loaded')).toBeInTheDocument()
    },
    { timeout: 5000 }
  )
}, 10000) // 10s timeout
```

### Mock de Framer Motion

Os testesmockam `framer-motion` para evitar warnings:

```typescript
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))
```

---

**Lembrete**: Mantenha os testes atualizados quando修改ificar componentes ou hooks!
