# Migração Base UI - LeftSideBar

## Status Atual

✅ **Concluído:**
1. Base UI instalado
2. CSS configurado para portals
3. Componentes Base UI criados:
   - `base-ui-dialog.tsx` - Dialog component
   - `base-ui-menu.tsx` - Menu component
4. Imports atualizados no LeftSideBar
5. Workspace selector dropdown menu convertido para Base UI
6. Edit Workspace Dialog convertido para Base UI
7. Delete Workspace Dialog convertido para Base UI

❌ **Pendente - Dialogs que precisam conversão:**
1. Line 971-1030: **Project dropdown menu** (DropdownMenu -> Menu)
2. Line 1080-1190: **Create Workspace Dialog** (DialogContent -> DialogPortal/DialogBackdrop/DialogPopup)
3. Line 1353-1448: **Rename Project Dialog** (DialogContent -> DialogPortal/DialogBackdrop/DialogPopup)
4. Line 1450-1524: **Change Icon Dialog** (DialogContent -> DialogPortal/DialogBackdrop/DialogPopup)
5. Line 1526-1619: **Create Project Dialog** (DialogContent -> DialogPortal/DialogBackdrop/DialogPopup)
6. Line 1621-1658: **Delete Project AlertDialog** (AlertDialog -> Dialog with Base UI)

## Próximos Passos

Para completar a migração, todos os dialogs e menus restantes precisam ser convertidos seguindo o padrão já estabelecido nos dialogs de workspace.

### Padrão de Conversão

**Radix UI Dialog:**
```tsx
<Dialog>
  <DialogContent>
    <DialogHeader>...</DialogHeader>
    {/* conteúdo */}
    <DialogFooter>...</DialogFooter>
  </DialogContent>
</Dialog>
```

**Base UI Dialog:**
```tsx
<Dialog>
  <DialogPortal>
    <DialogBackdrop />
    <DialogPopup>
      <DialogHeader>...</DialogHeader>
      {/* conteúdo */}
      <DialogFooter>...</DialogFooter>
    </DialogPopup>
  </DialogPortal>
</Dialog>
```

**Radix UI DropdownMenu:**
```tsx
<DropdownMenu>
  <DropdownMenuTrigger>...</DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>...</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Base UI Menu:**
```tsx
<Menu>
  <MenuTrigger>...</MenuTrigger>
  <MenuPortal>
    <MenuPositioner>
      <MenuPopup>
        <MenuItem>...</MenuItem>
      </MenuPopup>
    </MenuPositioner>
  </MenuPortal>
</Menu>
```
