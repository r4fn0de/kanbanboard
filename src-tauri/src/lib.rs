use anyhow::anyhow;
use base64::{Engine as _, engine::general_purpose};
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use sqlx::{
    QueryBuilder, Row, Sqlite, Transaction,
    sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePool, SqlitePoolOptions, SqliteRow},
};
use std::collections::{BTreeSet, HashMap};
use std::fs;
use std::path::PathBuf;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};
use tauri::{AppHandle, Emitter, Manager, State};

const KANBAN_SCHEMA: &str = include_str!("../schema/kanban.sql");
const DATABASE_FILE: &str = "flowspace.db";
const DEFAULT_BOARD_ICON: &str = "Folder";
const DEFAULT_WORKSPACE_ID: &str = "workspace-default";
const DEFAULT_WORKSPACE_NAME: &str = "Default Workspace";
const DEFAULT_WORKSPACE_COLOR: &str = "#6366F1";
const WORKSPACE_ICON_DIR: &str = "workspace-icons";
const ALLOWED_BOARD_ICONS: &[&str] = &[
    "Folder",
    "LayoutDashboard",
    "Layers",
    "Briefcase",
    "ClipboardList",
    "CalendarDays",
    "BarChart3",
    "Target",
    "Users",
    "MessagesSquare",
    "LifeBuoy",
    "Lightbulb",
    "Rocket",
    "Package",
    "Palette",
    "PenTool",
];

const DEFAULT_COLUMN_ICON: &str = "Circle";
const ALLOWED_COLUMN_ICONS: &[&str] = &[
    "Circle",
    "Play",
    "CheckCircle",
    "Loader",
    "AlarmClock",
    "Bolt",
    "Sparkles",
    "Target",
    "CalendarCheck",
    "ClipboardList",
    "Lightbulb",
    "Flag",
    "Timer",
    "Ship",
    "Kanban",
    "TrendingUp",
    "Zap",
    "Rocket",
    "BadgeCheck",
];

type DbPool = SqlitePool;

async fn establish_pool(app: &AppHandle) -> Result<DbPool, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {e}"))?;

    fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data directory: {e}"))?;

    let db_path = app_data_dir.join(DATABASE_FILE);

    let mut options = SqliteConnectOptions::new()
        .filename(&db_path)
        .create_if_missing(true)
        .foreign_keys(true);

    options = options.journal_mode(SqliteJournalMode::Wal);

    options = options.busy_timeout(Duration::from_secs(5));

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await
        .map_err(|e| format!("Failed to create SQLite pool: {e}"))?;

    Ok(pool)
}

#[derive(Debug, Deserialize)]
struct UpdateCardArgs {
    id: String,
    board_id: String,
    #[serde(default)]
    title: Option<String>,
    #[serde(default)]
    description: Option<Option<String>>,
    #[serde(default)]
    priority: Option<String>,
    #[serde(default)]
    due_date: Option<Option<String>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateTagArgs {
    id: String,
    board_id: String,
    label: String,
    #[serde(default)]
    color: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateColumnArgs {
    id: String,
    board_id: String,
    #[serde(default)]
    title: Option<String>,
    #[serde(default)]
    color: Option<Option<String>>,
    #[serde(default)]
    icon: Option<Option<String>>,
    #[serde(default)]
    is_enabled: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateTagArgs {
    id: String,
    board_id: String,
    #[serde(default)]
    label: Option<String>,
    #[serde(default)]
    color: Option<Option<String>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SetCardTagsArgs {
    card_id: String,
    board_id: String,
    tag_ids: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DeleteTagArgs {
    id: String,
    board_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateWorkspaceArgs {
    id: String,
    name: String,
    #[serde(default)]
    color: Option<String>,
    #[serde(default)]
    icon_path: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateWorkspaceArgs {
    id: String,
    #[serde(default)]
    name: Option<String>,
    #[serde(default)]
    color: Option<Option<String>>,
}

#[tauri::command]
async fn update_card(pool: State<'_, DbPool>, args: UpdateCardArgs) -> Result<(), String> {
    log::info!(
        "Attempting to update card with id: {}, board_id: {}",
        args.id,
        args.board_id
    );

    if args.title.as_ref().is_some_and(|t| t.trim().is_empty()) {
        return Err("O título do cartão não pode ser vazio.".to_string());
    }

    if let Some(ref priority) = args.priority {
        validate_priority(priority)?;
    }

    let mut tx = pool
        .begin()
        .await
        .map_err(|e| format!("Falha ao abrir transação: {e}"))?;

    let existing = sqlx::query_as::<_, (String, String)>(
        "SELECT board_id, column_id FROM kanban_cards WHERE id = ?",
    )
    .bind(&args.id)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| format!("Falha ao carregar cartão: {e}"))?;

    let Some((board_id_db, _column_id)) = existing else {
        return Err("Cartão não encontrado.".to_string());
    };

    if board_id_db != args.board_id {
        return Err("O cartão não pertence ao quadro informado.".to_string());
    }

    let builder = QueryBuilder::<Sqlite>::new(
        "UPDATE kanban_cards SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
    );
    let mut has_changes = false;

    // Build the SQL query manually
    let mut sql =
        String::from("UPDATE kanban_cards SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')");

    // Handle title update
    if let Some(ref title) = args.title {
        let trimmed = title.trim().to_string();
        if trimmed.is_empty() {
            return Err("O título do cartão não pode ser vazio.".to_string());
        }
        log::info!(
            "Updating title to: '{}' (length: {})",
            trimmed,
            trimmed.len()
        );
        validate_string_input(&trimmed, 200, "Título do cartão")?;
        sql.push_str(&format!(", title = '{}'", trimmed.replace('\'', "''")));
        has_changes = true;
    }

    // Handle description update
    if let Some(ref description) = args.description {
        let normalized = match description {
            Some(value) => normalize_optional_text(Some(value.clone())),
            None => None,
        };
        let desc_str = normalized.unwrap_or_default().replace('\'', "''");
        sql.push_str(&format!(", description = '{}'", desc_str));
        has_changes = true;
    }

    // Handle priority update
    if let Some(ref priority) = args.priority {
        sql.push_str(&format!(", priority = '{}'", priority));
        has_changes = true;
    }

    // Handle due date update
    if let Some(ref due_date) = args.due_date {
        let normalized = match due_date {
            Some(value) => {
                let trimmed = value.trim();
                if trimmed.is_empty() {
                    None
                } else {
                    Some(trimmed.to_string())
                }
            }
            None => None,
        };
        let date_str = normalized.unwrap_or_default().replace('\'', "''");
        sql.push_str(&format!(", due_date = '{}'", date_str));
        has_changes = true;
    }

    if !has_changes {
        return Ok(());
    }

    sql.push_str(&format!(" WHERE id = '{}'", args.id.replace('\'', "''")));

    log::info!("Executing SQL: {}", sql);

    // Execute the query
    let result = sqlx::query(&sql).execute(&mut *tx).await.map_err(|e| {
        log::error!("Failed to execute update query: {}", e);
        format!("Falha ao atualizar cartão: {e}")
    })?;

    log::info!("Update affected {} rows", result.rows_affected());

    tx.commit().await.map_err(|e| {
        log::error!("Failed to commit transaction: {}", e);
        format!("Falha ao confirmar transação: {e}")
    })?;

    log::info!("Card update completed successfully");
    Ok(())
}

#[tauri::command]
async fn move_column(
    pool: State<'_, DbPool>,
    board_id: String,
    column_id: String,
    target_index: i64,
) -> Result<(), String> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|e| format!("Falha ao abrir transação: {e}"))?;

    let columns = sqlx::query_as::<_, (String,)>(
        "SELECT id FROM kanban_columns WHERE board_id = ? ORDER BY position ASC, created_at ASC",
    )
    .bind(&board_id)
    .fetch_all(&mut *tx)
    .await
    .map_err(|e| format!("Falha ao carregar colunas: {e}"))?;

    if columns.is_empty() {
        return Err("Nenhuma coluna encontrada para o quadro informado.".to_string());
    }

    let current_index = columns
        .iter()
        .position(|(id,)| id == &column_id)
        .ok_or_else(|| "Coluna não encontrada.".to_string())?;

    let mut ids: Vec<String> = columns.into_iter().map(|(id,)| id).collect();
    let removed_id = ids.remove(current_index);

    let mut clamped_index = target_index;
    if clamped_index < 0 {
        clamped_index = 0;
    }
    if clamped_index as usize > ids.len() {
        clamped_index = ids.len() as i64;
    }

    ids.insert(clamped_index as usize, removed_id.clone());

    for (index, id) in ids.iter().enumerate() {
        sqlx::query(
            "UPDATE kanban_columns SET position = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
        )
        .bind(index as i64)
        .bind(id)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Falha ao atualizar posições das colunas: {e}"))?;
    }

    tx.commit()
        .await
        .map_err(|e| format!("Falha ao confirmar transação: {e}"))?;

    Ok(())
}

#[tauri::command]
async fn move_card(
    pool: State<'_, DbPool>,
    board_id: String,
    card_id: String,
    from_column_id: String,
    to_column_id: String,
    target_index: i64,
) -> Result<(), String> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|e| format!("Falha ao abrir transação: {e}"))?;

    let card_info = sqlx::query_as::<_, (String, String)>(
        "SELECT column_id, board_id FROM kanban_cards WHERE id = ?",
    )
    .bind(&card_id)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| format!("Falha ao carregar cartão: {e}"))?;

    let (current_column_id, card_board_id) =
        card_info.ok_or_else(|| "Cartão não encontrado.".to_string())?;

    if card_board_id != board_id {
        return Err("O cartão não pertence ao quadro informado.".to_string());
    }

    if current_column_id != from_column_id {
        return Err("O cartão não pertence à coluna de origem informada.".to_string());
    }

    let target_column_board =
        sqlx::query_scalar::<_, Option<String>>("SELECT board_id FROM kanban_columns WHERE id = ?")
            .bind(&to_column_id)
            .fetch_one(&mut *tx)
            .await
            .map_err(|e| format!("Falha ao carregar coluna de destino: {e}"))?
            .ok_or_else(|| "Coluna de destino não encontrada.".to_string())?;

    if target_column_board != board_id {
        return Err("A coluna de destino não pertence ao quadro informado.".to_string());
    }

    let mut source_cards = sqlx::query_as::<_, (String,)>(
        "SELECT id FROM kanban_cards WHERE column_id = ? ORDER BY position ASC, created_at ASC",
    )
    .bind(&from_column_id)
    .fetch_all(&mut *tx)
    .await
    .map_err(|e| format!("Falha ao carregar cartões da coluna de origem: {e}"))?;

    let current_index = source_cards
        .iter()
        .position(|(id,)| id == &card_id)
        .ok_or_else(|| "Cartão não encontrado na coluna de origem.".to_string())?;

    source_cards.remove(current_index);

    if from_column_id == to_column_id {
        let mut reordered: Vec<String> = source_cards.into_iter().map(|(id,)| id).collect();
        let mut clamped = target_index;
        if clamped < 0 {
            clamped = 0;
        }
        if clamped as usize > reordered.len() {
            clamped = reordered.len() as i64;
        }
        reordered.insert(clamped as usize, card_id.clone());

        for (index, id) in reordered.iter().enumerate() {
            sqlx::query(
                "UPDATE kanban_cards SET position = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
            )
            .bind(index as i64)
            .bind(id)
            .execute(&mut *tx)
            .await
            .map_err(|e| format!("Falha ao atualizar posições dos cartões: {e}"))?;
        }
    } else {
        // Atualiza posições na coluna de origem após remover o cartão
        for (index, (id,)) in source_cards.iter().enumerate() {
            sqlx::query(
                "UPDATE kanban_cards SET position = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
            )
            .bind(index as i64)
            .bind(id)
            .execute(&mut *tx)
            .await
            .map_err(|e| format!("Falha ao atualizar posições na coluna de origem: {e}"))?;
        }

        let target_cards = sqlx::query_as::<_, (String,)>(
            "SELECT id FROM kanban_cards WHERE column_id = ? ORDER BY position ASC, created_at ASC",
        )
        .bind(&to_column_id)
        .fetch_all(&mut *tx)
        .await
        .map_err(|e| format!("Falha ao carregar cartões da coluna de destino: {e}"))?;

        let mut clamped = target_index;
        if clamped < 0 {
            clamped = 0;
        }
        if clamped as usize > target_cards.len() {
            clamped = target_cards.len() as i64;
        }

        let mut reordered: Vec<String> = target_cards.into_iter().map(|(id,)| id).collect();
        reordered.insert(clamped as usize, card_id.clone());

        sqlx::query(
            "UPDATE kanban_cards SET column_id = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
        )
        .bind(&to_column_id)
        .bind(&card_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Falha ao mover cartão para coluna de destino: {e}"))?;

        for (index, id) in reordered.iter().enumerate() {
            sqlx::query(
                "UPDATE kanban_cards SET position = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
            )
            .bind(index as i64)
            .bind(id)
            .execute(&mut *tx)
            .await
            .map_err(|e| format!("Falha ao atualizar posições na coluna de destino: {e}"))?;
        }
    }

    tx.commit()
        .await
        .map_err(|e| format!("Falha ao confirmar transação: {e}"))?;

    Ok(())
}

async fn initialize_schema(pool: &DbPool) -> Result<(), String> {
    for statement in KANBAN_SCHEMA.split(';') {
        let sql = statement.trim();
        if sql.is_empty() {
            continue;
        }

        sqlx::query(sql)
            .execute(pool)
            .await
            .map_err(|e| format!("Failed to execute schema statement `{sql}`: {e}"))?;
    }

    ensure_workspace_support(pool).await?;
    ensure_board_icon_column(pool).await?;
    ensure_card_attachments_column(pool).await?;
    ensure_column_customization_columns(pool).await?;
    ensure_notes_board_id_column(pool).await?;

    Ok(())
}

async fn ensure_board_icon_column(pool: &DbPool) -> Result<(), String> {
    let column_exists = sqlx::query_scalar::<_, Option<i64>>(
        "SELECT 1 FROM pragma_table_info('kanban_boards') WHERE name = 'icon' LIMIT 1",
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Failed to inspect kanban_boards schema: {e}"))?
    .flatten()
    .is_some();

    if !column_exists {
        sqlx::query("ALTER TABLE kanban_boards ADD COLUMN icon TEXT")
            .execute(pool)
            .await
            .map_err(|e| format!("Failed to add icon column to kanban_boards: {e}"))?;
    }

    sqlx::query("UPDATE kanban_boards SET icon = ? WHERE icon IS NULL OR TRIM(icon) = ''")
        .bind(DEFAULT_BOARD_ICON)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to backfill board icons: {e}"))?;

    Ok(())
}

async fn ensure_card_attachments_column(pool: &DbPool) -> Result<(), String> {
    let column_exists = sqlx::query_scalar::<_, Option<i64>>(
        "SELECT 1 FROM pragma_table_info('kanban_cards') WHERE name = 'attachments' LIMIT 1",
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Failed to inspect kanban_cards schema: {e}"))?
    .flatten()
    .is_some();

    if !column_exists {
        println!("Adding attachments column to kanban_cards table");
        sqlx::query("ALTER TABLE kanban_cards ADD COLUMN attachments TEXT")
            .execute(pool)
            .await
            .map_err(|e| format!("Failed to add attachments column to kanban_cards: {e}"))?;
        println!("Attachments column added successfully");
    } else {
        println!("Attachments column already exists in kanban_cards table");
    }

    Ok(())
}

async fn ensure_column_customization_columns(pool: &DbPool) -> Result<(), String> {
    let color_exists = sqlx::query_scalar::<_, Option<i64>>(
        "SELECT 1 FROM pragma_table_info('kanban_columns') WHERE name = 'color' LIMIT 1",
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Failed to inspect kanban_columns schema: {e}"))?
    .flatten()
    .is_some();

    if !color_exists {
        sqlx::query("ALTER TABLE kanban_columns ADD COLUMN color TEXT")
            .execute(pool)
            .await
            .map_err(|e| format!("Failed to add color column to kanban_columns: {e}"))?;
    }

    let icon_exists = sqlx::query_scalar::<_, Option<i64>>(
        "SELECT 1 FROM pragma_table_info('kanban_columns') WHERE name = 'icon' LIMIT 1",
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Failed to inspect kanban_columns schema: {e}"))?
    .flatten()
    .is_some();

    if !icon_exists {
        sqlx::query("ALTER TABLE kanban_columns ADD COLUMN icon TEXT")
            .execute(pool)
            .await
            .map_err(|e| format!("Failed to add icon column to kanban_columns: {e}"))?;
    }

    let is_enabled_exists = sqlx::query_scalar::<_, Option<i64>>(
        "SELECT 1 FROM pragma_table_info('kanban_columns') WHERE name = 'is_enabled' LIMIT 1",
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Failed to inspect kanban_columns schema: {e}"))?
    .flatten()
    .is_some();

    if !is_enabled_exists {
        sqlx::query("ALTER TABLE kanban_columns ADD COLUMN is_enabled INTEGER NOT NULL DEFAULT 1")
            .execute(pool)
            .await
            .map_err(|e| format!("Failed to add is_enabled column to kanban_columns: {e}"))?;
        sqlx::query("UPDATE kanban_columns SET is_enabled = 1 WHERE is_enabled IS NULL")
            .execute(pool)
            .await
            .map_err(|e| format!("Failed to backfill is_enabled values in kanban_columns: {e}"))?;
    } else {
        sqlx::query("UPDATE kanban_columns SET is_enabled = 1 WHERE is_enabled IS NULL")
            .execute(pool)
            .await
            .map_err(|e| format!("Failed to normalize is_enabled values in kanban_columns: {e}"))?;
    }

    Ok(())
}

async fn ensure_workspace_support(pool: &DbPool) -> Result<(), String> {
    sqlx::query("CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY, name TEXT NOT NULL, color TEXT, icon_path TEXT, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')), updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')), archived_at TEXT)")
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to ensure workspaces table: {e}"))?;

    let workspace_column_exists = sqlx::query_scalar::<_, Option<i64>>(
        "SELECT 1 FROM pragma_table_info('kanban_boards') WHERE name = 'workspace_id' LIMIT 1",
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Failed to inspect kanban_boards schema: {e}"))?
    .flatten()
    .is_some();

    if !workspace_column_exists {
        sqlx::query("ALTER TABLE kanban_boards ADD COLUMN workspace_id TEXT")
            .execute(pool)
            .await
            .map_err(|e| format!("Failed to add workspace_id column to kanban_boards: {e}"))?;
    }

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_boards_workspace ON kanban_boards(workspace_id)")
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to ensure workspace index on boards: {e}"))?;

    sqlx::query("INSERT INTO workspaces (id, name, color, icon_path, created_at, updated_at) VALUES (?, ?, ?, NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) ON CONFLICT(id) DO NOTHING")
        .bind(DEFAULT_WORKSPACE_ID)
        .bind(DEFAULT_WORKSPACE_NAME)
        .bind(Some(DEFAULT_WORKSPACE_COLOR.to_string()))
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to insert default workspace: {e}"))?;

    sqlx::query("UPDATE workspaces SET name = ?, color = COALESCE(color, ?), updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? AND (name != ? OR name IS NULL)")
        .bind(DEFAULT_WORKSPACE_NAME)
        .bind(DEFAULT_WORKSPACE_COLOR)
        .bind(DEFAULT_WORKSPACE_ID)
        .bind(DEFAULT_WORKSPACE_NAME)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to normalize default workspace metadata: {e}"))?;

    sqlx::query("UPDATE kanban_boards SET workspace_id = ? WHERE workspace_id IS NULL OR TRIM(workspace_id) = ''")
        .bind(DEFAULT_WORKSPACE_ID)
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to backfill workspace ids for boards: {e}"))?;

    Ok(())
}

fn map_workspace_row(row: SqliteRow) -> Result<Value, sqlx::Error> {
    Ok(json!({
        "id": row.try_get::<String, _>("id")?,
        "name": row.try_get::<String, _>("name")?,
        "color": row.try_get::<Option<String>, _>("color")?,
        "iconPath": row.try_get::<Option<String>, _>("icon_path")?,
        "createdAt": row.try_get::<String, _>("created_at")?,
        "updatedAt": row.try_get::<String, _>("updated_at")?,
        "archivedAt": row.try_get::<Option<String>, _>("archived_at")?,
    }))
}

fn map_board_row(row: SqliteRow) -> Result<Value, sqlx::Error> {
    Ok(json!({
        "id": row.try_get::<String, _>("id")?,
        "workspaceId": row.try_get::<String, _>("workspace_id")?,
        "title": row.try_get::<String, _>("title")?,
        "description": row.try_get::<Option<String>, _>("description")?,
        "icon": row
            .try_get::<Option<String>, _>("icon")?
            .filter(|icon| !icon.trim().is_empty())
            .unwrap_or_else(|| DEFAULT_BOARD_ICON.to_string()),
        "createdAt": row.try_get::<String, _>("created_at")?,
        "updatedAt": row.try_get::<String, _>("updated_at")?,
        "archivedAt": row.try_get::<Option<String>, _>("archived_at")?,
    }))
}

fn map_column_row(row: SqliteRow) -> Result<Value, sqlx::Error> {
    Ok(json!({
        "id": row.try_get::<String, _>("id")?,
        "boardId": row.try_get::<String, _>("board_id")?,
        "title": row.try_get::<String, _>("title")?,
        "position": row.try_get::<i64, _>("position")?,
        "wipLimit": row.try_get::<Option<i64>, _>("wip_limit")?,
        "color": row.try_get::<Option<String>, _>("color")?,
        "icon": row
            .try_get::<Option<String>, _>("icon")?
            .filter(|icon| !icon.trim().is_empty())
            .unwrap_or_else(|| DEFAULT_COLUMN_ICON.to_string()),
        "isEnabled": row
            .try_get::<Option<i64>, _>("is_enabled")?
            .map(|value| value != 0)
            .unwrap_or(true),
        "createdAt": row.try_get::<String, _>("created_at")?,
        "updatedAt": row.try_get::<String, _>("updated_at")?,
        "archivedAt": row.try_get::<Option<String>, _>("archived_at")?,
    }))
}

fn map_tag_row(row: SqliteRow) -> Result<Value, sqlx::Error> {
    Ok(json!({
        "id": row.try_get::<String, _>("id")?,
        "boardId": row.try_get::<String, _>("board_id")?,
        "label": row.try_get::<String, _>("label")?,
        "color": row.try_get::<Option<String>, _>("color")?,
        "createdAt": row.try_get::<String, _>("created_at")?,
        "updatedAt": row.try_get::<String, _>("updated_at")?,
    }))
}

fn map_card_row(row: SqliteRow) -> Result<Value, sqlx::Error> {
    let attachments_json: Option<String> = row.try_get("attachments")?;
    let attachments: Option<Vec<String>> = match attachments_json {
        Some(json_str) => serde_json::from_str(&json_str).ok(),
        None => None,
    };

    let tags_json: Option<String> = row.try_get("tags_json")?;
    let tags: Vec<Value> = tags_json
        .as_deref()
        .and_then(|json_str| serde_json::from_str(json_str).ok())
        .unwrap_or_default();

    Ok(json!({
        "id": row.try_get::<String, _>("id")?,
        "boardId": row.try_get::<String, _>("board_id")?,
        "columnId": row.try_get::<String, _>("column_id")?,
        "title": row.try_get::<String, _>("title")?,
        "description": row.try_get::<Option<String>, _>("description")?,
        "position": row.try_get::<i64, _>("position")?,
        "priority": row.try_get::<String, _>("priority")?,
        "dueDate": row.try_get::<Option<String>, _>("due_date")?,
        "attachments": attachments,
        "createdAt": row.try_get::<String, _>("created_at")?,
        "updatedAt": row.try_get::<String, _>("updated_at")?,
        "archivedAt": row.try_get::<Option<String>, _>("archived_at")?,
        "tags": tags,
    }))
}

fn normalize_optional_text(value: Option<String>) -> Option<String> {
    value
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
}

fn normalize_column_color(color: Option<String>) -> Result<Option<String>, String> {
    match color {
        Some(value) => {
            let trimmed = value.trim();
            if trimmed.is_empty() {
                Ok(None)
            } else if trimmed.len() == 7
                && trimmed.starts_with('#')
                && trimmed.chars().skip(1).all(|c| c.is_ascii_hexdigit())
            {
                Ok(Some(trimmed.to_string()))
            } else {
                Err(
                    "Cor da coluna inválida. Utilize o formato hexadecimal, por exemplo #6366F1."
                        .to_string(),
                )
            }
        }
        None => Ok(None),
    }
}

fn normalize_workspace_color(color: Option<String>) -> Result<Option<String>, String> {
    match color {
        Some(value) => {
            let trimmed = value.trim();
            if trimmed.is_empty() {
                Ok(None)
            } else if trimmed.len() == 7
                && trimmed.starts_with('#')
                && trimmed.chars().skip(1).all(|c| c.is_ascii_hexdigit())
            {
                Ok(Some(trimmed.to_string()))
            } else {
                Err(
                    "Cor do workspace inválida. Utilize o formato hexadecimal, por exemplo #6366F1.".to_string(),
                )
            }
        }
        None => Ok(None),
    }
}

fn normalize_column_icon(icon: Option<String>) -> Result<Option<String>, String> {
    match icon
        .as_ref()
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
    {
        Some(value) if ALLOWED_COLUMN_ICONS.contains(&value) => Ok(Some(value.to_string())),
        Some(_) => Err("Ícone inválido para a coluna.".to_string()),
        None => Ok(None),
    }
}

fn normalize_tag_color(color: Option<String>) -> Result<Option<String>, String> {
    match color {
        Some(value) => {
            let trimmed = value.trim();
            if trimmed.is_empty() {
                Ok(None)
            } else if trimmed.len() == 7
                && trimmed.starts_with('#')
                && trimmed.chars().skip(1).all(|c| c.is_ascii_hexdigit())
            {
                Ok(Some(trimmed.to_string()))
            } else {
                Err(
                    "Cor da tag inválida. Utilize o formato hexadecimal, por exemplo #FF5733."
                        .to_string(),
                )
            }
        }
        None => Ok(None),
    }
}

fn normalize_board_icon(icon: Option<String>) -> Result<String, String> {
    match icon
        .as_ref()
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
    {
        Some(value) if ALLOWED_BOARD_ICONS.contains(&value) => Ok(value.to_string()),
        Some(_) => Err("Ícone inválido para o quadro.".to_string()),
        None => Ok(DEFAULT_BOARD_ICON.to_string()),
    }
}

fn validate_priority(priority: &str) -> Result<(), String> {
    match priority {
        "low" | "medium" | "high" => Ok(()),
        _ => Err("Prioridade inválida. Utilize 'low', 'medium' ou 'high'.".to_string()),
    }
}

async fn normalize_column_positions_tx(
    tx: &mut Transaction<'_, Sqlite>,
    board_id: &str,
) -> Result<(), sqlx::Error> {
    let column_ids = sqlx::query_as::<_, (String,)>(
        "SELECT id FROM kanban_columns WHERE board_id = ? ORDER BY position ASC, created_at ASC",
    )
    .bind(board_id)
    .fetch_all(&mut **tx)
    .await?;

    for (index, (column_id,)) in column_ids.into_iter().enumerate() {
        sqlx::query(
            "UPDATE kanban_columns SET position = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
        )
        .bind(index as i64)
        .bind(column_id)
        .execute(&mut **tx)
        .await?;
    }

    Ok(())
}

async fn normalize_card_positions_tx(
    tx: &mut Transaction<'_, Sqlite>,
    column_id: &str,
) -> Result<(), sqlx::Error> {
    let card_ids = sqlx::query_as::<_, (String,)>(
        "SELECT id FROM kanban_cards WHERE column_id = ? ORDER BY position ASC, created_at ASC",
    )
    .bind(column_id)
    .fetch_all(&mut **tx)
    .await?;

    for (index, (card_id,)) in card_ids.into_iter().enumerate() {
        sqlx::query(
            "UPDATE kanban_cards SET position = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
        )
        .bind(index as i64)
        .bind(card_id)
        .execute(&mut **tx)
        .await?;
    }

    Ok(())
}

async fn set_card_tags_tx(
    tx: &mut Transaction<'_, Sqlite>,
    card_id: &str,
    board_id: &str,
    tag_ids: &[String],
) -> Result<Vec<Value>, String> {
    let unique_ids: BTreeSet<String> = tag_ids
        .iter()
        .map(|id| id.trim().to_string())
        .filter(|id| !id.is_empty())
        .collect();
    let ordered_ids: Vec<String> = unique_ids.into_iter().collect();

    if !ordered_ids.is_empty() {
        let mut builder = QueryBuilder::new("SELECT id FROM kanban_tags WHERE board_id = ");
        builder.push_bind(board_id);
        builder.push(" AND id IN (");
        let mut separated = builder.separated(", ");
        for tag_id in &ordered_ids {
            separated.push_bind(tag_id);
        }
        builder.push(")");

        let rows = builder
            .build()
            .fetch_all(&mut **tx)
            .await
            .map_err(|e| format!("Falha ao validar tags informadas: {e}"))?;

        if rows.len() != ordered_ids.len() {
            return Err("Algumas tags informadas não existem neste quadro.".to_string());
        }
    }

    sqlx::query("DELETE FROM kanban_card_tags WHERE card_id = ?")
        .bind(card_id)
        .execute(&mut **tx)
        .await
        .map_err(|e| format!("Falha ao limpar tags do cartão: {e}"))?;

    for tag_id in &ordered_ids {
        sqlx::query("INSERT INTO kanban_card_tags (card_id, tag_id) VALUES (?, ?)")
            .bind(card_id)
            .bind(tag_id)
            .execute(&mut **tx)
            .await
            .map_err(|e| format!("Falha ao associar tag ao cartão: {e}"))?;
    }

    sqlx::query(
        "UPDATE kanban_cards SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
    )
    .bind(card_id)
    .execute(&mut **tx)
    .await
    .map_err(|e| format!("Falha ao atualizar cartão: {e}"))?;

    if ordered_ids.is_empty() {
        return Ok(Vec::new());
    }

    let mut fetch_builder = QueryBuilder::new(
        "SELECT id, board_id, label, color, created_at, updated_at FROM kanban_tags WHERE board_id = ",
    );
    fetch_builder.push_bind(board_id);
    fetch_builder.push(" AND id IN (");
    let mut separated = fetch_builder.separated(", ");
    for tag_id in &ordered_ids {
        separated.push_bind(tag_id);
    }
    fetch_builder.push(")");

    let rows = fetch_builder
        .build()
        .fetch_all(&mut **tx)
        .await
        .map_err(|e| format!("Falha ao carregar tags atualizadas: {e}"))?;

    let mut tag_map = HashMap::new();
    for row in rows {
        let value = map_tag_row(row).map_err(|e| format!("Falha ao mapear tag: {e}"))?;
        let id = value
            .get("id")
            .and_then(|v| v.as_str())
            .ok_or_else(|| "Tag inválida encontrada".to_string())?
            .to_string();
        tag_map.insert(id, value);
    }

    let mut ordered_values = Vec::with_capacity(ordered_ids.len());
    for tag_id in &ordered_ids {
        let value = tag_map
            .remove(tag_id)
            .ok_or_else(|| "Algumas tags informadas não existem neste quadro.".to_string())?;
        ordered_values.push(value);
    }

    Ok(ordered_values)
}

#[tauri::command]
async fn load_boards(pool: State<'_, DbPool>) -> Result<Vec<Value>, String> {
    sqlx::query("SELECT id, workspace_id, title, description, icon, created_at, updated_at, archived_at FROM kanban_boards ORDER BY created_at ASC")
        .try_map(map_board_row)
        .fetch_all(&*pool)
        .await
        .map_err(|e| {
            log::error!("Failed to load boards: {e}");
            e.to_string()
        })
}

#[tauri::command]
async fn rename_board(
    pool: State<'_, DbPool>,
    id: String,
    mut title: String,
    description: Option<String>,
) -> Result<(), String> {
    title = title.trim().to_string();
    if title.is_empty() {
        return Err("O nome do quadro não pode ser vazio.".to_string());
    }
    validate_string_input(&title, 200, "Nome do quadro")?;

    let normalized_description = normalize_optional_text(description);

    let result = sqlx::query(
        "UPDATE kanban_boards SET title = ?, description = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
    )
    .bind(&title)
    .bind(normalized_description)
    .bind(&id)
    .execute(&*pool)
    .await
    .map_err(|e| {
        log::error!("Failed to rename board {id}: {e}");
        e.to_string()
    })?;

    if result.rows_affected() == 0 {
        return Err("Quadro não encontrado.".to_string());
    }

    Ok(())
}

#[tauri::command]
async fn update_board_icon(
    pool: State<'_, DbPool>,
    id: String,
    icon: String,
) -> Result<(), String> {
    let normalized_icon = normalize_board_icon(Some(icon))?;

    let result = sqlx::query(
        "UPDATE kanban_boards SET icon = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
    )
    .bind(&normalized_icon)
    .bind(&id)
    .execute(&*pool)
    .await
    .map_err(|e| {
        log::error!("Failed to update board icon {id}: {e}");
        e.to_string()
    })?;

    if result.rows_affected() == 0 {
        return Err("Quadro não encontrado.".to_string());
    }

    Ok(())
}

#[tauri::command]
async fn update_board_workspace(
    pool: State<'_, DbPool>,
    board_id: String,
    workspace_id: String,
) -> Result<(), String> {
    if workspace_id.is_empty() {
        return Err("O workspace informado é inválido.".to_string());
    }

    // Verify workspace exists
    let workspace_exists =
        sqlx::query_scalar::<_, Option<i64>>("SELECT 1 FROM workspaces WHERE id = ? LIMIT 1")
            .bind(&workspace_id)
            .fetch_optional(&*pool)
            .await
            .map_err(|e| {
                log::error!("Falha ao verificar workspace: {e}");
                e.to_string()
            })?
            .is_some();

    if !workspace_exists {
        return Err("Workspace não encontrado.".to_string());
    }

    let result = sqlx::query(
        "UPDATE kanban_boards SET workspace_id = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
    )
    .bind(&workspace_id)
    .bind(&board_id)
    .execute(&*pool)
    .await
    .map_err(|e| {
        log::error!("Failed to update board workspace {board_id}: {e}");
        e.to_string()
    })?;

    if result.rows_affected() == 0 {
        return Err("Quadro não encontrado.".to_string());
    }

    Ok(())
}

#[tauri::command]
async fn delete_board(pool: State<'_, DbPool>, id: String) -> Result<(), String> {
    let result = sqlx::query("DELETE FROM kanban_boards WHERE id = ?")
        .bind(&id)
        .execute(&*pool)
        .await
        .map_err(|e| {
            log::error!("Failed to delete board {id}: {e}");
            e.to_string()
        })?;

    if result.rows_affected() == 0 {
        return Err("Quadro não encontrado.".to_string());
    }

    Ok(())
}

#[tauri::command]
async fn create_board(
    pool: State<'_, DbPool>,
    id: String,
    workspace_id: String,
    mut title: String,
    description: Option<String>,
    icon: Option<String>,
) -> Result<(), String> {
    if workspace_id.is_empty() {
        return Err("O workspace informado é inválido.".to_string());
    }

    let workspace_exists =
        sqlx::query_scalar::<_, Option<i64>>("SELECT 1 FROM workspaces WHERE id = ? LIMIT 1")
            .bind(&workspace_id)
            .fetch_optional(&*pool)
            .await
            .map_err(|e| {
                log::error!("Falha ao verificar workspace ao criar quadro: {e}");
                e.to_string()
            })?
            .is_some();

    if !workspace_exists {
        return Err("Workspace não encontrado.".to_string());
    }

    title = title.trim().to_string();
    if title.is_empty() {
        return Err("O nome do quadro não pode ser vazio.".to_string());
    }
    validate_string_input(&title, 200, "Nome do quadro")?;

    let normalized_description = normalize_optional_text(description);
    let normalized_icon = normalize_board_icon(icon)?;

    sqlx::query(
        "INSERT INTO kanban_boards (id, workspace_id, title, description, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))",
    )
    .bind(id)
    .bind(workspace_id)
    .bind(title)
    .bind(normalized_description)
    .bind(normalized_icon)
    .execute(&*pool)
    .await
    .map(|_| ())
    .map_err(|e| {
        log::error!("Failed to create board: {e}");
        e.to_string()
    })
}

#[tauri::command]
async fn load_workspaces(pool: State<'_, DbPool>) -> Result<Vec<Value>, String> {
    sqlx::query("SELECT id, name, color, icon_path, created_at, updated_at, archived_at FROM workspaces ORDER BY created_at ASC")
        .try_map(map_workspace_row)
        .fetch_all(&*pool)
        .await
        .map_err(|e| {
            log::error!("Failed to load workspaces: {e}");
            e.to_string()
        })
}

#[tauri::command]
async fn create_workspace(
    app: AppHandle,
    pool: State<'_, DbPool>,
    args: CreateWorkspaceArgs,
) -> Result<Value, String> {
    let workspace_id = args.id.trim();
    if workspace_id.is_empty() {
        return Err("Identificador do workspace inválido.".to_string());
    }

    let name = args.name.trim().to_string();
    if name.is_empty() {
        return Err("O nome do workspace não pode ser vazio.".to_string());
    }
    validate_string_input(&name, 200, "Nome do workspace")?;

    let normalized_color = normalize_workspace_color(args.color)?;

    let icon_path = match args.icon_path.as_ref() {
        Some(path) if !path.trim().is_empty() => {
            // Check if the path is already a relative path (from save_cropped_workspace_icon)
            // If it starts with the workspace icon directory, it's already saved
            if path.starts_with(WORKSPACE_ICON_DIR) {
                Some(path.to_string())
            } else {
                // Otherwise, it's a file path that needs to be copied
                match copy_workspace_icon(&app, workspace_id, path) {
                    Ok(relative) => Some(relative),
                    Err(error) => return Err(error),
                }
            }
        }
        _ => None,
    };

    let insert_result = sqlx::query(
        "INSERT INTO workspaces (id, name, color, icon_path, created_at, updated_at) VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))",
    )
    .bind(workspace_id)
    .bind(&name)
    .bind(normalized_color)
    .bind(&icon_path)
    .execute(&*pool)
    .await;

    if let Err(error) = insert_result {
        if let Some(relative) = icon_path.as_ref() {
            let _ = remove_workspace_icon_file(&app, relative);
        }
        log::error!("Failed to create workspace {workspace_id}: {error}");
        return Err(error.to_string());
    }

    sqlx::query("SELECT id, name, color, icon_path, created_at, updated_at, archived_at FROM workspaces WHERE id = ?")
        .bind(workspace_id)
        .try_map(map_workspace_row)
        .fetch_one(&*pool)
        .await
        .map_err(|e| {
            log::error!("Failed to load created workspace {workspace_id}: {e}");
            e.to_string()
        })
}

#[tauri::command]
async fn update_workspace(
    pool: State<'_, DbPool>,
    args: UpdateWorkspaceArgs,
) -> Result<(), String> {
    let workspace_id = args.id.trim();
    if workspace_id.is_empty() {
        return Err("Identificador do workspace inválido.".to_string());
    }

    let mut builder = QueryBuilder::<Sqlite>::new(
        "UPDATE workspaces SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
    );
    let mut has_changes = false;

    if let Some(name) = args.name.as_ref() {
        let trimmed = name.trim();
        if trimmed.is_empty() {
            return Err("O nome do workspace não pode ser vazio.".to_string());
        }
        validate_string_input(trimmed, 200, "Nome do workspace")?;
        builder.push(", name = ");
        builder.push_bind(trimmed.to_string());
        has_changes = true;
    }

    if let Some(color_payload) = args.color {
        let normalized_color = normalize_workspace_color(color_payload)?;
        builder.push(", color = ");
        if let Some(color) = normalized_color {
            builder.push_bind(color);
        } else {
            builder.push("NULL");
        }
        has_changes = true;
    }

    if !has_changes {
        return Ok(());
    }

    builder.push(" WHERE id = ");
    builder.push_bind(workspace_id.to_string());

    let result = builder.build().execute(&*pool).await.map_err(|e| {
        log::error!("Failed to update workspace {workspace_id}: {e}");
        e.to_string()
    })?;

    if result.rows_affected() == 0 {
        return Err("Workspace não encontrado.".to_string());
    }

    Ok(())
}

#[tauri::command]
async fn delete_workspace(
    app: AppHandle,
    pool: State<'_, DbPool>,
    id: String,
) -> Result<(), String> {
    let workspace_id = id.trim();
    if workspace_id.is_empty() {
        return Err("Identificador do workspace inválido.".to_string());
    }

    if workspace_id == DEFAULT_WORKSPACE_ID {
        return Err("Não é possível remover o workspace padrão.".to_string());
    }

    let board_count = sqlx::query_scalar::<_, Option<i64>>(
        "SELECT COUNT(*) FROM kanban_boards WHERE workspace_id = ?",
    )
    .bind(workspace_id)
    .fetch_one(&*pool)
    .await
    .map_err(|e| format!("Falha ao verificar quadros do workspace: {e}"))?
    .unwrap_or(0);

    if board_count > 0 {
        return Err("Remova ou mova os quadros antes de excluir o workspace.".to_string());
    }

    let existing_icon: Option<String> =
        sqlx::query_scalar("SELECT icon_path FROM workspaces WHERE id = ?")
            .bind(workspace_id)
            .fetch_optional(&*pool)
            .await
            .map_err(|e| format!("Falha ao carregar ícone do workspace: {e}"))?
            .flatten();

    let result = sqlx::query("DELETE FROM workspaces WHERE id = ?")
        .bind(workspace_id)
        .execute(&*pool)
        .await
        .map_err(|e| {
            log::error!("Failed to delete workspace {workspace_id}: {e}");
            e.to_string()
        })?;

    if result.rows_affected() == 0 {
        return Err("Workspace não encontrado.".to_string());
    }

    if let Some(relative) = existing_icon {
        let _ = remove_workspace_icon_file(&app, &relative);
    }

    Ok(())
}

#[tauri::command]
async fn update_workspace_icon(
    app: AppHandle,
    pool: State<'_, DbPool>,
    workspace_id: String,
    file_path: String,
) -> Result<Value, String> {
    let workspace_id = workspace_id.trim();
    if workspace_id.is_empty() {
        return Err("Identificador do workspace inválido.".to_string());
    }

    let existing_icon: Option<String> =
        sqlx::query_scalar("SELECT icon_path FROM workspaces WHERE id = ?")
            .bind(workspace_id)
            .fetch_optional(&*pool)
            .await
            .map_err(|e| format!("Falha ao carregar workspace: {e}"))?
            .flatten();

    let new_icon = copy_workspace_icon(&app, workspace_id, &file_path)?;

    let update_result = sqlx::query(
        "UPDATE workspaces SET icon_path = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
    )
    .bind(&new_icon)
    .bind(workspace_id)
    .execute(&*pool)
    .await;

    if let Err(error) = update_result {
        let _ = remove_workspace_icon_file(&app, &new_icon);
        log::error!("Failed to update workspace icon for {workspace_id}: {error}");
        return Err(error.to_string());
    }

    if let Some(previous) = existing_icon {
        let _ = remove_workspace_icon_file(&app, &previous);
    }

    sqlx::query("SELECT id, name, color, icon_path, created_at, updated_at, archived_at FROM workspaces WHERE id = ?")
        .bind(workspace_id)
        .try_map(map_workspace_row)
        .fetch_one(&*pool)
        .await
        .map_err(|e| {
            log::error!("Failed to load workspace after icon update {workspace_id}: {e}");
            e.to_string()
        })
}

#[tauri::command]
async fn remove_workspace_icon(
    app: AppHandle,
    pool: State<'_, DbPool>,
    workspace_id: String,
) -> Result<Value, String> {
    let workspace_id = workspace_id.trim();
    if workspace_id.is_empty() {
        return Err("Identificador do workspace inválido.".to_string());
    }

    let existing_icon: Option<String> =
        sqlx::query_scalar("SELECT icon_path FROM workspaces WHERE id = ?")
            .bind(workspace_id)
            .fetch_optional(&*pool)
            .await
            .map_err(|e| format!("Falha ao carregar workspace: {e}"))?
            .flatten();

    let result = sqlx::query(
        "UPDATE workspaces SET icon_path = NULL, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
    )
    .bind(workspace_id)
    .execute(&*pool)
    .await
    .map_err(|e| {
        log::error!("Failed to clear workspace icon for {workspace_id}: {e}");
        e.to_string()
    })?;

    if result.rows_affected() == 0 {
        return Err("Workspace não encontrado.".to_string());
    }

    if let Some(relative) = existing_icon {
        let _ = remove_workspace_icon_file(&app, &relative);
    }

    sqlx::query("SELECT id, name, color, icon_path, created_at, updated_at, archived_at FROM workspaces WHERE id = ?")
        .bind(workspace_id)
        .try_map(map_workspace_row)
        .fetch_one(&*pool)
        .await
        .map_err(|e| {
            log::error!("Failed to load workspace after icon removal {workspace_id}: {e}");
            e.to_string()
        })
}

#[tauri::command]
async fn load_columns(pool: State<'_, DbPool>, board_id: String) -> Result<Vec<Value>, String> {
    sqlx::query("SELECT id, board_id, title, position, color, icon, is_enabled, wip_limit, created_at, updated_at, archived_at FROM kanban_columns WHERE board_id = ? ORDER BY position ASC")
        .bind(board_id)
        .try_map(map_column_row)
        .fetch_all(&*pool)
        .await
        .map_err(|e| {
            log::error!("Failed to load columns: {e}");
            e.to_string()
        })
}

#[tauri::command]
async fn create_column(
    pool: State<'_, DbPool>,
    id: String,
    board_id: String,
    mut title: String,
    position: i64,
    color: Option<String>,
    icon: Option<String>,
    is_enabled: Option<bool>,
    wip_limit: Option<i64>,
) -> Result<(), String> {
    title = title.trim().to_string();
    if title.is_empty() {
        return Err("O nome da coluna não pode ser vazio.".to_string());
    }
    validate_string_input(&title, 200, "Nome da coluna")?;

    let normalized_color = normalize_column_color(color)?;
    let normalized_icon = normalize_column_icon(icon)?;
    let normalized_is_enabled = is_enabled.unwrap_or(true);

    let normalized_wip_limit = match wip_limit {
        Some(limit) if limit < 1 => {
            return Err("O limite WIP deve ser um número inteiro positivo.".to_string());
        }
        Some(limit) => Some(limit),
        None => None,
    };

    let mut tx = pool
        .begin()
        .await
        .map_err(|e| format!("Falha ao abrir transação: {e}"))?;

    let max_position = sqlx::query_scalar::<_, Option<i64>>(
        "SELECT MAX(position) FROM kanban_columns WHERE board_id = ?",
    )
    .bind(&board_id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| format!("Falha ao obter posição máxima das colunas: {e}"))?
    .unwrap_or(-1);

    let mut normalized_position = position;
    if normalized_position < 0 || normalized_position > max_position + 1 {
        normalized_position = max_position + 1;
    }

    let duplicate = sqlx::query_scalar::<_, Option<i64>>(
        "SELECT 1 FROM kanban_columns WHERE board_id = ? AND position = ? LIMIT 1",
    )
    .bind(&board_id)
    .bind(normalized_position)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| format!("Falha ao verificar posições duplicadas: {e}"))?;

    if duplicate.is_some() {
        return Err(format!(
            "Já existe uma coluna na posição {}. Ajuste a ordem e tente novamente.",
            normalized_position
        ));
    }

    sqlx::query(
        "INSERT INTO kanban_columns (id, board_id, title, position, color, icon, is_enabled, wip_limit, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))",
    )
    .bind(&id)
    .bind(&board_id)
    .bind(&title)
    .bind(normalized_position)
    .bind(normalized_color.as_deref())
    .bind(normalized_icon.as_deref())
    .bind(if normalized_is_enabled { 1 } else { 0 })
    .bind(normalized_wip_limit)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Falha ao criar coluna: {e}"))?;

    normalize_column_positions_tx(&mut tx, &board_id)
        .await
        .map_err(|e| format!("Falha ao normalizar posições das colunas: {e}"))?;

    tx.commit()
        .await
        .map_err(|e| format!("Falha ao confirmar transação: {e}"))?;

    Ok(())
}

#[tauri::command]
async fn update_column(pool: State<'_, DbPool>, args: UpdateColumnArgs) -> Result<(), String> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|e| format!("Falha ao abrir transação: {e}"))?;

    let existing_board =
        sqlx::query_scalar::<_, Option<String>>("SELECT board_id FROM kanban_columns WHERE id = ?")
            .bind(&args.id)
            .fetch_one(&mut *tx)
            .await
            .map_err(|e| format!("Falha ao carregar coluna: {e}"))?
            .ok_or_else(|| "Coluna não encontrada.".to_string())?;

    if existing_board != args.board_id {
        return Err("A coluna não pertence ao quadro informado.".to_string());
    }

    let mut builder = QueryBuilder::new(
        "UPDATE kanban_columns SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
    );
    let mut has_changes = false;

    if let Some(title) = args.title.as_ref() {
        let trimmed = title.trim();
        if trimmed.is_empty() {
            return Err("O nome da coluna não pode ser vazio.".to_string());
        }
        validate_string_input(trimmed, 200, "Nome da coluna")?;
        builder.push(", title = ");
        builder.push_bind(trimmed.to_string());
        has_changes = true;
    }

    if let Some(color_payload) = args.color {
        let normalized_color = normalize_column_color(color_payload)?;
        builder.push(", color = ");
        if let Some(color) = normalized_color {
            builder.push_bind(color);
        } else {
            builder.push("NULL");
        }
        has_changes = true;
    }

    if let Some(icon_payload) = args.icon {
        let normalized_icon = normalize_column_icon(icon_payload)?;
        builder.push(", icon = ");
        if let Some(icon) = normalized_icon {
            builder.push_bind(icon);
        } else {
            builder.push("NULL");
        }
        has_changes = true;
    }

    if let Some(is_enabled) = args.is_enabled {
        builder.push(", is_enabled = ");
        builder.push_bind(if is_enabled { 1 } else { 0 });
        has_changes = true;
    }

    if !has_changes {
        return Ok(());
    }

    builder.push(" WHERE id = ");
    builder.push_bind(&args.id);

    builder
        .build()
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Falha ao atualizar coluna: {e}"))?;

    tx.commit()
        .await
        .map_err(|e| format!("Falha ao confirmar transação: {e}"))?;

    Ok(())
}

#[tauri::command]
async fn load_cards(pool: State<'_, DbPool>, board_id: String) -> Result<Vec<Value>, String> {
    sqlx::query(
        "SELECT
            c.id,
            c.board_id,
            c.column_id,
            c.title,
            c.description,
            c.position,
            c.priority,
            c.due_date,
            c.attachments,
            c.created_at,
            c.updated_at,
            c.archived_at,
            (
                SELECT json_group_array(
                    json_object(
                        'id', t.id,
                        'boardId', t.board_id,
                        'label', t.label,
                        'color', t.color,
                        'createdAt', t.created_at,
                        'updatedAt', t.updated_at
                    )
                )
                FROM kanban_card_tags ct
                JOIN kanban_tags t ON t.id = ct.tag_id
                WHERE ct.card_id = c.id
            ) AS tags_json
        FROM kanban_cards c
        WHERE c.board_id = ?
        ORDER BY c.position ASC",
    )
    .bind(&board_id)
    .try_map(map_card_row)
    .fetch_all(&*pool)
    .await
    .map_err(|e| {
        log::error!("Failed to load cards: {e}");
        e.to_string()
    })
}

#[tauri::command]
async fn load_tags(pool: State<'_, DbPool>, board_id: String) -> Result<Vec<Value>, String> {
    sqlx::query(
        "SELECT id, board_id, label, color, created_at, updated_at FROM kanban_tags WHERE board_id = ? ORDER BY label COLLATE NOCASE ASC",
    )
    .bind(&board_id)
    .try_map(map_tag_row)
    .fetch_all(&*pool)
    .await
    .map_err(|e| {
        log::error!("Failed to load tags: {e}");
        e.to_string()
    })
}

#[tauri::command]
async fn create_tag(pool: State<'_, DbPool>, args: CreateTagArgs) -> Result<Value, String> {
    let label = args.label.trim().to_string();
    if label.is_empty() {
        return Err("O nome da tag não pode ser vazio.".to_string());
    }
    validate_string_input(&label, 100, "Nome da tag")?;

    let normalized_color = normalize_tag_color(args.color)?;

    sqlx::query(
        "INSERT INTO kanban_tags (id, board_id, label, color, created_at, updated_at) VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))",
    )
    .bind(&args.id)
    .bind(&args.board_id)
    .bind(&label)
    .bind(normalized_color.as_deref())
    .execute(&*pool)
    .await
    .map_err(|e| {
        log::error!("Failed to create tag: {e}");
        e.to_string()
    })?;

    sqlx::query(
        "SELECT id, board_id, label, color, created_at, updated_at FROM kanban_tags WHERE id = ?",
    )
    .bind(&args.id)
    .fetch_one(&*pool)
    .await
    .map_err(|e| {
        log::error!("Failed to load created tag: {e}");
        e.to_string()
    })
    .and_then(|row| map_tag_row(row).map_err(|e| e.to_string()))
}

#[tauri::command]
async fn update_tag(pool: State<'_, DbPool>, args: UpdateTagArgs) -> Result<Value, String> {
    let mut builder = QueryBuilder::<Sqlite>::new(
        "UPDATE kanban_tags SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
    );
    let mut has_changes = false;

    if let Some(label) = args.label.as_ref() {
        let trimmed = label.trim();
        if trimmed.is_empty() {
            return Err("O nome da tag não pode ser vazio.".to_string());
        }
        validate_string_input(trimmed, 100, "Nome da tag")?;
        builder.push(", label = ");
        builder.push_bind(trimmed);
        has_changes = true;
    }

    let mut color_binding: Option<Option<String>> = None;
    if let Some(color_payload) = args.color.clone() {
        let normalized = normalize_tag_color(color_payload)?;
        color_binding = Some(normalized);
        has_changes = true;
    }

    if let Some(normalized_color) = color_binding.as_ref() {
        builder.push(", color = ");
        builder.push_bind(normalized_color.as_deref());
    }

    if has_changes {
        builder.push(" WHERE id = ");
        builder.push_bind(&args.id);
        builder.push(" AND board_id = ");
        builder.push_bind(&args.board_id);

        let result = builder.build().execute(&*pool).await.map_err(|e| {
            log::error!("Failed to update tag: {e}");
            e.to_string()
        })?;

        if result.rows_affected() == 0 {
            return Err("Tag não encontrada.".to_string());
        }
    } else {
        // Nothing to update, but ensure tag exists
        let exists = sqlx::query_scalar::<_, Option<i64>>(
            "SELECT 1 FROM kanban_tags WHERE id = ? AND board_id = ? LIMIT 1",
        )
        .bind(&args.id)
        .bind(&args.board_id)
        .fetch_optional(&*pool)
        .await
        .map_err(|e| {
            log::error!("Failed to validate tag existence: {e}");
            e.to_string()
        })?
        .flatten()
        .is_some();

        if !exists {
            return Err("Tag não encontrada.".to_string());
        }
    }

    sqlx::query(
        "SELECT id, board_id, label, color, created_at, updated_at FROM kanban_tags WHERE id = ?",
    )
    .bind(&args.id)
    .fetch_one(&*pool)
    .await
    .map_err(|e| {
        log::error!("Failed to load updated tag: {e}");
        e.to_string()
    })
    .and_then(|row| map_tag_row(row).map_err(|e| e.to_string()))
}

#[tauri::command]
async fn delete_tag(pool: State<'_, DbPool>, args: DeleteTagArgs) -> Result<(), String> {
    let result = sqlx::query("DELETE FROM kanban_tags WHERE id = ? AND board_id = ?")
        .bind(&args.id)
        .bind(&args.board_id)
        .execute(&*pool)
        .await
        .map_err(|e| {
            log::error!("Failed to delete tag: {e}");
            e.to_string()
        })?;

    if result.rows_affected() == 0 {
        return Err("Tag não encontrada.".to_string());
    }

    Ok(())
}

#[tauri::command]
async fn set_card_tags(
    pool: State<'_, DbPool>,
    args: SetCardTagsArgs,
) -> Result<Vec<Value>, String> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|e| format!("Falha ao abrir transação: {e}"))?;

    let existing_board =
        sqlx::query_scalar::<_, Option<String>>("SELECT board_id FROM kanban_cards WHERE id = ?")
            .bind(&args.card_id)
            .fetch_one(&mut *tx)
            .await
            .map_err(|e| format!("Falha ao carregar cartão: {e}"))?
            .ok_or_else(|| "Cartão não encontrado.".to_string())?;

    if existing_board != args.board_id {
        return Err("O cartão não pertence ao quadro informado.".to_string());
    }

    let tags = set_card_tags_tx(&mut tx, &args.card_id, &args.board_id, &args.tag_ids)
        .await
        .map_err(|e| format!("Falha ao atualizar tags do cartão: {e}"))?;

    tx.commit()
        .await
        .map_err(|e| format!("Falha ao confirmar transação: {e}"))?;

    Ok(tags)
}
#[tauri::command]
async fn create_card(
    pool: State<'_, DbPool>,
    id: String,
    board_id: String,
    column_id: String,
    mut title: String,
    description: Option<String>,
    position: i64,
    priority: String,
    due_date: Option<String>,
    tag_ids: Option<Vec<String>>,
) -> Result<(), String> {
    title = title.trim().to_string();
    if title.is_empty() {
        return Err("O título do cartão não pode ser vazio.".to_string());
    }
    validate_string_input(&title, 200, "Título do cartão")?;
    validate_priority(&priority)?;

    let normalized_description = normalize_optional_text(description);

    let mut tx = pool
        .begin()
        .await
        .map_err(|e| format!("Falha ao abrir transação: {e}"))?;

    let stored_board_id =
        sqlx::query_scalar::<_, Option<String>>("SELECT board_id FROM kanban_columns WHERE id = ?")
            .bind(&column_id)
            .fetch_one(&mut *tx)
            .await
            .map_err(|e| format!("Falha ao validar coluna informada: {e}"))?;

    match stored_board_id {
        Some(db_board_id) if db_board_id == board_id => {}
        Some(_) => return Err("A coluna informada não pertence ao quadro selecionado.".to_string()),
        None => return Err("Coluna não encontrada.".to_string()),
    }

    let max_position = sqlx::query_scalar::<_, Option<i64>>(
        "SELECT MAX(position) FROM kanban_cards WHERE column_id = ?",
    )
    .bind(&column_id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| format!("Falha ao obter posição máxima dos cartões: {e}"))?
    .unwrap_or(-1);

    let mut normalized_position = position;
    if normalized_position < 0 || normalized_position > max_position + 1 {
        normalized_position = max_position + 1;
    }

    let duplicate = sqlx::query_scalar::<_, Option<i64>>(
        "SELECT 1 FROM kanban_cards WHERE column_id = ? AND position = ? LIMIT 1",
    )
    .bind(&column_id)
    .bind(normalized_position)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| format!("Falha ao verificar posições duplicadas de cartões: {e}"))?;

    if duplicate.is_some() {
        return Err(format!(
            "Já existe um cartão na posição {} desta coluna. Ajuste a ordem e tente novamente.",
            normalized_position
        ));
    }

    sqlx::query(
        "INSERT INTO kanban_cards (id, board_id, column_id, title, description, position, priority, due_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))",
    )
    .bind(&id)
    .bind(&board_id)
    .bind(&column_id)
    .bind(&title)
    .bind(normalized_description)
    .bind(normalized_position)
    .bind(&priority)
    .bind(due_date.filter(|v| !v.is_empty()))
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Falha ao criar cartão: {e}"))?;

    normalize_card_positions_tx(&mut tx, &column_id)
        .await
        .map_err(|e| format!("Falha ao normalizar posições dos cartões: {e}"))?;

    let tag_ids_vec = tag_ids.unwrap_or_default();
    set_card_tags_tx(&mut tx, &id, &board_id, &tag_ids_vec)
        .await
        .map_err(|e| format!("Falha ao associar tags ao cartão: {e}"))?;

    tx.commit()
        .await
        .map_err(|e| format!("Falha ao confirmar transação: {e}"))?;

    Ok(())
}

#[tauri::command]
async fn delete_card(pool: State<'_, DbPool>, id: String, board_id: String) -> Result<(), String> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|e| format!("Falha ao abrir transação: {e}"))?;

    let card_record = sqlx::query_as::<_, (String, String)>(
        "SELECT column_id, board_id FROM kanban_cards WHERE id = ?",
    )
    .bind(&id)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| format!("Falha ao carregar cartão: {e}"))?;

    let Some((column_id, stored_board_id)) = card_record else {
        return Err("Cartão não encontrado.".to_string());
    };

    if stored_board_id != board_id {
        return Err("O cartão não pertence ao quadro informado.".to_string());
    }

    sqlx::query("DELETE FROM kanban_cards WHERE id = ?")
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Falha ao excluir cartão: {e}"))?;

    normalize_card_positions_tx(&mut tx, &column_id)
        .await
        .map_err(|e| format!("Falha ao normalizar posições dos cartões: {e}"))?;

    tx.commit()
        .await
        .map_err(|e| format!("Falha ao confirmar transação: {e}"))?;

    Ok(())
}

// Validation functions
fn validate_filename(filename: &str) -> Result<(), String> {
    // Regex pattern: only alphanumeric, dash, underscore, dot
    let filename_pattern = Regex::new(r"^[a-zA-Z0-9_-]+(\.[a-zA-Z0-9]+)?$")
        .map_err(|e| format!("Regex compilation error: {e}"))?;

    if filename.is_empty() {
        return Err("Filename cannot be empty".to_string());
    }

    if filename.len() > 100 {
        return Err("Filename too long (max 100 characters)".to_string());
    }

    if !filename_pattern.is_match(filename) {
        return Err(
            "Invalid filename: only alphanumeric characters, dashes, underscores, and dots allowed"
                .to_string(),
        );
    }

    Ok(())
}

fn validate_string_input(input: &str, max_len: usize, field_name: &str) -> Result<(), String> {
    if input.len() > max_len {
        return Err(format!("{field_name} too long (max {max_len} characters)"));
    }
    Ok(())
}

fn validate_theme(theme: &str) -> Result<(), String> {
    match theme {
        "light" | "dark" | "system" => Ok(()),
        _ => Err("Invalid theme: must be 'light', 'dark', or 'system'".to_string()),
    }
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    // Input validation
    if let Err(e) = validate_string_input(name, 100, "Name") {
        log::warn!("Invalid greet input: {e}");
        return format!("Error: {e}");
    }

    log::info!("Greeting user: {name}");
    format!("Hello, {name}! You've been greeted from Rust!")
}

// Preferences data structure
// Only contains settings that should be persisted to disk
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppPreferences {
    pub theme: String,
    #[serde(default = "default_transparency_enabled")]
    pub transparency_enabled: bool,
    #[serde(default)]
    pub last_workspace_id: Option<String>,
    // Add new persistent preferences here, e.g.:
    // pub auto_save: bool,
    // pub language: String,
}

fn default_transparency_enabled() -> bool {
    true
}

impl Default for AppPreferences {
    fn default() -> Self {
        Self {
            theme: "system".to_string(),
            transparency_enabled: default_transparency_enabled(),
            last_workspace_id: None,
            // Add defaults for new preferences here
        }
    }
}

fn get_preferences_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {e}"))?;

    // Ensure the directory exists
    std::fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data directory: {e}"))?;

    Ok(app_data_dir.join("preferences.json"))
}

#[tauri::command]
async fn load_preferences(app: AppHandle) -> Result<AppPreferences, String> {
    log::debug!("Loading preferences from disk");
    let prefs_path = get_preferences_path(&app)?;

    if !prefs_path.exists() {
        log::info!("Preferences file not found, using defaults");
        return Ok(AppPreferences::default());
    }

    let contents = std::fs::read_to_string(&prefs_path).map_err(|e| {
        log::error!("Failed to read preferences file: {e}");
        format!("Failed to read preferences file: {e}")
    })?;

    let preferences: AppPreferences = serde_json::from_str(&contents).map_err(|e| {
        log::error!("Failed to parse preferences JSON: {e}");
        format!("Failed to parse preferences: {e}")
    })?;

    log::info!("Successfully loaded preferences");
    Ok(preferences)
}

#[tauri::command]
async fn save_preferences(app: AppHandle, preferences: AppPreferences) -> Result<(), String> {
    // Validate theme value
    validate_theme(&preferences.theme)?;

    log::debug!("Saving preferences to disk: {preferences:?}");
    let prefs_path = get_preferences_path(&app)?;

    let json_content = serde_json::to_string_pretty(&preferences).map_err(|e| {
        log::error!("Failed to serialize preferences: {e}");
        format!("Failed to serialize preferences: {e}")
    })?;

    // Write to a temporary file first, then rename (atomic operation)
    let temp_path = prefs_path.with_extension("tmp");

    std::fs::write(&temp_path, json_content).map_err(|e| {
        log::error!("Failed to write preferences file: {e}");
        format!("Failed to write preferences file: {e}")
    })?;

    std::fs::rename(&temp_path, &prefs_path).map_err(|e| {
        log::error!("Failed to finalize preferences file: {e}");
        format!("Failed to finalize preferences file: {e}")
    })?;

    log::info!("Successfully saved preferences to {prefs_path:?}");
    Ok(())
}

#[tauri::command]
async fn send_native_notification(
    app: AppHandle,
    title: String,
    body: Option<String>,
) -> Result<(), String> {
    log::info!("Sending native notification: {title}");

    #[cfg(not(mobile))]
    {
        use tauri_plugin_notification::NotificationExt;

        let mut notification = app.notification().builder().title(title);

        if let Some(body_text) = body {
            notification = notification.body(body_text);
        }

        match notification.show() {
            Ok(_) => {
                log::info!("Native notification sent successfully");
                Ok(())
            }
            Err(e) => {
                log::error!("Failed to send native notification: {e}");
                Err(format!("Failed to send notification: {e}"))
            }
        }
    }

    #[cfg(mobile)]
    {
        log::warn!("Native notifications not supported on mobile");
        Err("Native notifications not supported on mobile".to_string())
    }
}

// Recovery functions - simple pattern for saving JSON data to disk
fn get_recovery_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {e}"))?;

    let recovery_dir = app_data_dir.join("recovery");

    // Ensure the recovery directory exists
    std::fs::create_dir_all(&recovery_dir)
        .map_err(|e| format!("Failed to create recovery directory: {e}"))?;

    Ok(recovery_dir)
}

#[tauri::command]
async fn save_emergency_data(app: AppHandle, filename: String, data: Value) -> Result<(), String> {
    log::info!("Saving emergency data to file: {filename}");

    // Validate filename with proper security checks
    validate_filename(&filename)?;

    // Validate data size (10MB limit)
    let data_str = serde_json::to_string(&data)
        .map_err(|e| format!("Failed to serialize data for size check: {e}"))?;
    if data_str.len() > 10_485_760 {
        return Err("Data too large (max 10MB)".to_string());
    }

    let recovery_dir = get_recovery_dir(&app)?;
    let file_path = recovery_dir.join(format!("{filename}.json"));

    let json_content = serde_json::to_string_pretty(&data).map_err(|e| {
        log::error!("Failed to serialize emergency data: {e}");
        format!("Failed to serialize data: {e}")
    })?;

    // Write to a temporary file first, then rename (atomic operation)
    let temp_path = file_path.with_extension("tmp");

    std::fs::write(&temp_path, json_content).map_err(|e| {
        log::error!("Failed to write emergency data file: {e}");
        format!("Failed to write data file: {e}")
    })?;

    std::fs::rename(&temp_path, &file_path).map_err(|e| {
        log::error!("Failed to finalize emergency data file: {e}");
        format!("Failed to finalize data file: {e}")
    })?;

    log::info!("Successfully saved emergency data to {file_path:?}");
    Ok(())
}

#[tauri::command]
async fn load_emergency_data(app: AppHandle, filename: String) -> Result<Value, String> {
    log::info!("Loading emergency data from file: {filename}");

    // Validate filename with proper security checks
    validate_filename(&filename)?;

    let recovery_dir = get_recovery_dir(&app)?;
    let file_path = recovery_dir.join(format!("{filename}.json"));

    if !file_path.exists() {
        log::info!("Recovery file not found: {file_path:?}");
        return Err("File not found".to_string());
    }

    let contents = std::fs::read_to_string(&file_path).map_err(|e| {
        log::error!("Failed to read recovery file: {e}");
        format!("Failed to read file: {e}")
    })?;

    let data: Value = serde_json::from_str(&contents).map_err(|e| {
        log::error!("Failed to parse recovery JSON: {e}");
        format!("Failed to parse data: {e}")
    })?;

    log::info!("Successfully loaded emergency data");
    Ok(data)
}

#[tauri::command]
async fn cleanup_old_recovery_files(app: AppHandle) -> Result<u32, String> {
    log::info!("Cleaning up old recovery files");

    let recovery_dir = get_recovery_dir(&app)?;
    let mut removed_count = 0;

    // Calculate cutoff time (7 days ago)
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| format!("Failed to get current time: {e}"))?
        .as_secs();
    let seven_days_ago = now - (7 * 24 * 60 * 60);

    // Read directory and check each file
    let entries = std::fs::read_dir(&recovery_dir).map_err(|e| {
        log::error!("Failed to read recovery directory: {e}");
        format!("Failed to read directory: {e}")
    })?;

    for entry in entries {
        let entry = match entry {
            Ok(e) => e,
            Err(e) => {
                log::warn!("Failed to read directory entry: {e}");
                continue;
            }
        };

        let path = entry.path();

        // Only process JSON files
        if path.extension().is_none_or(|ext| ext != "json") {
            continue;
        }

        // Check file modification time
        let metadata = match std::fs::metadata(&path) {
            Ok(m) => m,
            Err(e) => {
                log::warn!("Failed to get file metadata: {e}");
                continue;
            }
        };

        let modified = match metadata.modified() {
            Ok(m) => m,
            Err(e) => {
                log::warn!("Failed to get file modification time: {e}");
                continue;
            }
        };

        let modified_secs = match modified.duration_since(UNIX_EPOCH) {
            Ok(d) => d.as_secs(),
            Err(e) => {
                log::warn!("Failed to convert modification time: {e}");
                continue;
            }
        };

        // Remove if older than 7 days
        if modified_secs < seven_days_ago {
            match std::fs::remove_file(&path) {
                Ok(_) => {
                    log::info!("Removed old recovery file: {path:?}");
                    removed_count += 1;
                }
                Err(e) => {
                    log::warn!("Failed to remove old recovery file: {e}");
                }
            }
        }
    }

    log::info!("Cleanup complete. Removed {removed_count} old recovery files");
    Ok(removed_count)
}

// Create the native menu system
fn create_app_menu(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    log::info!("Setting up native menu system");

    // Build the main application submenu
    let app_submenu = SubmenuBuilder::new(app, "Tauri Template")
        .item(&MenuItemBuilder::with_id("about", "About Tauri Template").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("check-updates", "Check for Updates...").build(app)?)
        .separator()
        .item(
            &MenuItemBuilder::with_id("preferences", "Preferences...")
                .accelerator("CmdOrCtrl+,")
                .build(app)?,
        )
        .separator()
        .item(&PredefinedMenuItem::hide(app, Some("Hide Tauri Template"))?)
        .item(&PredefinedMenuItem::hide_others(app, None)?)
        .item(&PredefinedMenuItem::show_all(app, None)?)
        .separator()
        .item(&PredefinedMenuItem::quit(app, Some("Quit Tauri Template"))?)
        .build()?;

    // Build the View submenu
    let view_submenu = SubmenuBuilder::new(app, "View")
        .item(
            &MenuItemBuilder::with_id("toggle-left-sidebar", "Toggle Left Sidebar")
                .accelerator("CmdOrCtrl+1")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("toggle-right-sidebar", "Toggle Right Sidebar")
                .accelerator("CmdOrCtrl+2")
                .build(app)?,
        )
        .build()?;

    // Build the main menu with submenus
    let menu = MenuBuilder::new(app)
        .item(&app_submenu)
        .item(&view_submenu)
        .build()?;

    // Set the menu for the app
    app.set_menu(menu)?;

    log::info!("Native menu system initialized successfully");
    Ok(())
}

async fn ensure_notes_board_id_column(pool: &DbPool) -> Result<(), String> {
    let column_exists = sqlx::query_scalar::<_, Option<i64>>(
        "SELECT 1 FROM pragma_table_info('notes') WHERE name = 'board_id' LIMIT 1",
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Failed to inspect notes schema: {e}"))?
    .flatten()
    .is_some();

    if !column_exists {
        sqlx::query("ALTER TABLE notes ADD COLUMN board_id TEXT")
            .execute(pool)
            .await
            .map_err(|e| format!("Failed to add board_id column to notes: {e}"))?;

        // Set board_id to the first board for existing notes
        sqlx::query(
            "UPDATE notes SET board_id = (SELECT id FROM kanban_boards LIMIT 1) WHERE board_id IS NULL"
        )
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to update existing notes with board_id: {e}"))?;
    }

    // Create indexes for notes table (safe to run multiple times)
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_notes_board_updated ON notes(board_id, updated_at DESC)",
    )
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to create idx_notes_board_updated: {e}"))?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_notes_board_pinned ON notes(board_id, pinned DESC, updated_at DESC)")
        .execute(pool)
        .await
        .map_err(|e| format!("Failed to create idx_notes_board_pinned: {e}"))?;

    Ok(())
}

// ============================================================================
// NOTES COMMANDS
// ============================================================================

#[derive(Debug, Deserialize)]
struct CreateNoteArgs {
    id: String,
    board_id: String,
    title: String,
    #[serde(default)]
    content: Option<String>,
}

#[derive(Debug, Deserialize)]
struct UpdateNoteArgs {
    id: String,
    board_id: String,
    #[serde(default)]
    title: Option<String>,
    #[serde(default)]
    content: Option<String>,
    #[serde(default)]
    pinned: Option<bool>,
}

#[tauri::command]
async fn load_notes(pool: State<'_, DbPool>, board_id: String) -> Result<Vec<Value>, String> {
    let rows = sqlx::query(
        "SELECT id, board_id, title, content, created_at, updated_at, archived_at, pinned, tags 
         FROM notes 
         WHERE board_id = ? AND archived_at IS NULL 
         ORDER BY pinned DESC, updated_at DESC",
    )
    .bind(&board_id)
    .fetch_all(&*pool)
    .await
    .map_err(|e| format!("Failed to load notes: {e}"))?;

    let notes: Vec<Value> = rows
        .iter()
        .map(|row| {
            json!({
                "id": row.get::<String, _>("id"),
                "boardId": row.get::<String, _>("board_id"),
                "title": row.get::<String, _>("title"),
                "content": row.get::<String, _>("content"),
                "createdAt": row.get::<String, _>("created_at"),
                "updatedAt": row.get::<String, _>("updated_at"),
                "archivedAt": row.get::<Option<String>, _>("archived_at"),
                "pinned": row.get::<i64, _>("pinned") != 0,
                "tags": row.get::<Option<String>, _>("tags")
                    .and_then(|s: String| serde_json::from_str::<Vec<String>>(&s).ok())
                    .unwrap_or_default(),
            })
        })
        .collect();

    Ok(notes)
}

#[tauri::command]
async fn create_note(pool: State<'_, DbPool>, args: CreateNoteArgs) -> Result<Value, String> {
    let content = args.content.unwrap_or_else(|| String::from(""));

    sqlx::query("INSERT INTO notes (id, board_id, title, content) VALUES (?, ?, ?, ?)")
        .bind(&args.id)
        .bind(&args.board_id)
        .bind(&args.title)
        .bind(&content)
        .execute(&*pool)
        .await
        .map_err(|e| format!("Failed to create note: {e}"))?;

    let row = sqlx::query(
        "SELECT id, board_id, title, content, created_at, updated_at, archived_at, pinned, tags 
         FROM notes WHERE id = ? AND board_id = ?",
    )
    .bind(&args.id)
    .bind(&args.board_id)
    .fetch_one(&*pool)
    .await
    .map_err(|e| format!("Failed to fetch created note: {e}"))?;

    Ok(json!({
        "id": row.get::<String, _>("id"),
        "boardId": row.get::<String, _>("board_id"),
        "title": row.get::<String, _>("title"),
        "content": row.get::<String, _>("content"),
        "createdAt": row.get::<String, _>("created_at"),
        "updatedAt": row.get::<String, _>("updated_at"),
        "archivedAt": row.get::<Option<String>, _>("archived_at"),
        "pinned": row.get::<i64, _>("pinned") != 0,
        "tags": row.get::<Option<String>, _>("tags")
            .and_then(|s: String| serde_json::from_str::<Vec<String>>(&s).ok())
            .unwrap_or_default(),
    }))
}

#[tauri::command]
async fn update_note(pool: State<'_, DbPool>, args: UpdateNoteArgs) -> Result<(), String> {
    let mut query_parts =
        vec!["UPDATE notes SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')"];
    let mut bindings: Vec<String> = vec![];

    if let Some(ref title) = args.title {
        query_parts.push("title = ?");
        bindings.push(title.clone());
    }

    if let Some(ref content) = args.content {
        query_parts.push("content = ?");
        bindings.push(content.clone());
    }

    if let Some(pinned) = args.pinned {
        query_parts.push("pinned = ?");
        bindings.push(if pinned { "1" } else { "0" }.to_string());
    }

    if bindings.is_empty() {
        return Ok(());
    }

    query_parts.push("WHERE id = ? AND board_id = ?");
    bindings.push(args.id.clone());
    bindings.push(args.board_id.clone());

    let query_str = query_parts.join(", ").replace(", WHERE", " WHERE");

    let mut query = sqlx::query(&query_str);
    for binding in bindings {
        query = query.bind(binding);
    }

    query
        .execute(&*pool)
        .await
        .map_err(|e| format!("Failed to update note: {e}"))?;

    Ok(())
}

#[tauri::command]
async fn delete_note(pool: State<'_, DbPool>, id: String, board_id: String) -> Result<(), String> {
    sqlx::query("DELETE FROM notes WHERE id = ? AND board_id = ?")
        .bind(&id)
        .bind(&board_id)
        .execute(&*pool)
        .await
        .map_err(|e| format!("Failed to delete note: {e}"))?;

    Ok(())
}

#[tauri::command]
async fn archive_note(pool: State<'_, DbPool>, id: String, board_id: String) -> Result<(), String> {
    sqlx::query(
        "UPDATE notes 
         SET archived_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = ? AND board_id = ?",
    )
    .bind(&id)
    .bind(&board_id)
    .execute(&*pool)
    .await
    .map_err(|e| format!("Failed to archive note: {e}"))?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                // Use Debug level in development, Info in production
                .level(if cfg!(debug_assertions) {
                    log::LevelFilter::Debug
                } else {
                    log::LevelFilter::Info
                })
                .targets([
                    // Always log to stdout for development
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
                    // Log to webview console for development
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Webview),
                    // Log to system logs on macOS (appears in Console.app)
                    #[cfg(target_os = "macos")]
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir {
                        file_name: None,
                    }),
                ])
                .build(),
        )
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_persisted_scope::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            log::info!("🚀 Application starting up");
            log::debug!(
                "App handle initialized for package: {}",
                app.package_info().name
            );

            let handle = app.handle();

            let pool =
                tauri::async_runtime::block_on(establish_pool(handle)).map_err(|e| anyhow!(e))?;

            tauri::async_runtime::block_on(initialize_schema(&pool)).map_err(|e| anyhow!(e))?;

            app.manage(pool);

            // Set up native menu system
            if let Err(e) = create_app_menu(app) {
                log::error!("Failed to create app menu: {e}");
                return Err(e);
            }

            // Set up menu event handlers
            app.on_menu_event(move |app, event| {
                log::debug!("Menu event received: {:?}", event.id());

                match event.id().as_ref() {
                    "about" => {
                        log::info!("About menu item clicked");
                        // Emit event to React for handling
                        match app.emit("menu-about", ()) {
                            Ok(_) => log::debug!("Successfully emitted menu-about event"),
                            Err(e) => log::error!("Failed to emit menu-about event: {e}"),
                        }
                    }
                    "check-updates" => {
                        log::info!("Check for Updates menu item clicked");
                        // Emit event to React for handling
                        match app.emit("menu-check-updates", ()) {
                            Ok(_) => log::debug!("Successfully emitted menu-check-updates event"),
                            Err(e) => log::error!("Failed to emit menu-check-updates event: {e}"),
                        }
                    }
                    "preferences" => {
                        log::info!("Preferences menu item clicked");
                        // Emit event to React for handling
                        match app.emit("menu-preferences", ()) {
                            Ok(_) => log::debug!("Successfully emitted menu-preferences event"),
                            Err(e) => log::error!("Failed to emit menu-preferences event: {e}"),
                        }
                    }
                    "toggle-left-sidebar" => {
                        log::info!("Toggle Left Sidebar menu item clicked");
                        // Emit event to React for handling
                        match app.emit("menu-toggle-left-sidebar", ()) {
                            Ok(_) => {
                                log::debug!("Successfully emitted menu-toggle-left-sidebar event")
                            }
                            Err(e) => {
                                log::error!("Failed to emit menu-toggle-left-sidebar event: {e}")
                            }
                        }
                    }
                    "toggle-right-sidebar" => {
                        log::info!("Toggle Right Sidebar menu item clicked");
                        // Emit event to React for handling
                        match app.emit("menu-toggle-right-sidebar", ()) {
                            Ok(_) => {
                                log::debug!("Successfully emitted menu-toggle-right-sidebar event")
                            }
                            Err(e) => {
                                log::error!("Failed to emit menu-toggle-right-sidebar event: {e}")
                            }
                        }
                    }
                    _ => {
                        log::debug!("Unhandled menu event: {:?}", event.id());
                    }
                }
            });

            // Example of different log levels
            log::trace!("This is a trace message (most verbose)");
            log::debug!("This is a debug message (development only)");
            log::info!("This is an info message (production)");
            log::warn!("This is a warning message");
            // log::error!("This is an error message");

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            load_preferences,
            save_preferences,
            send_native_notification,
            save_emergency_data,
            load_emergency_data,
            cleanup_old_recovery_files,
            load_workspaces,
            create_workspace,
            update_workspace,
            delete_workspace,
            update_workspace_icon,
            remove_workspace_icon,
            save_cropped_workspace_icon,
            get_workspace_icon_url,
            load_boards,
            create_board,
            rename_board,
            update_board_icon,
            update_board_workspace,
            delete_board,
            load_columns,
            create_column,
            update_column,
            move_column,
            load_cards,
            load_tags,
            create_tag,
            update_tag,
            delete_tag,
            set_card_tags,
            create_card,
            delete_card,
            update_card,
            move_card,
            upload_image,
            remove_image,
            get_attachment_url,
            load_notes,
            create_note,
            update_note,
            delete_note,
            archive_note
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct UploadImageResponse {
    success: bool,
    file_path: String,
    error: Option<String>,
}

fn copy_workspace_icon(
    app: &AppHandle,
    workspace_id: &str,
    file_path: &str,
) -> Result<String, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {e}"))?;

    let icons_dir = app_data_dir.join(WORKSPACE_ICON_DIR);
    fs::create_dir_all(&icons_dir)
        .map_err(|e| format!("Failed to create workspace icon directory: {e}"))?;

    let source_path = PathBuf::from(file_path);
    if !source_path.exists() {
        return Err("Arquivo selecionado não existe.".to_string());
    }

    let extension = source_path
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("")
        .to_lowercase();

    let mime_type = mime_guess::from_path(&source_path).first_or_octet_stream();
    let is_image_by_mime = mime_type.essence_str().starts_with("image/");
    let is_image_by_extension = matches!(
        extension.as_str(),
        "jpg" | "jpeg" | "png" | "gif" | "webp" | "svg" | "bmp" | "ico" | "tiff" | "tif"
    );

    if !is_image_by_mime && !is_image_by_extension {
        return Err(format!(
            "Arquivo selecionado não é uma imagem válida. MIME detectado: {}",
            mime_type
        ));
    }

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| format!("System time error: {e}"))?
        .as_secs();

    let filename = if extension.is_empty() {
        format!("{workspace_id}_{timestamp}")
    } else {
        format!("{workspace_id}_{timestamp}.{extension}")
    };

    let destination_path = icons_dir.join(&filename);
    fs::copy(&source_path, &destination_path)
        .map_err(|e| format!("Falha ao copiar arquivo de ícone: {e}"))?;

    Ok(format!("{WORKSPACE_ICON_DIR}/{filename}"))
}

fn remove_workspace_icon_file(app: &AppHandle, relative_path: &str) -> Result<(), String> {
    if relative_path.trim().is_empty() {
        return Ok(());
    }

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {e}"))?;

    let full_path = app_data_dir.join(relative_path);
    if full_path.exists() {
        fs::remove_file(&full_path)
            .map_err(|e| format!("Falha ao remover arquivo de ícone antigo: {e}"))?;
    }

    Ok(())
}

#[tauri::command]
async fn save_cropped_workspace_icon(
    app: AppHandle,
    workspace_id: String,
    image_data: Vec<u8>,
) -> Result<String, String> {
    let workspace_id = workspace_id.trim();
    if workspace_id.is_empty() {
        return Err("Invalid workspace ID".to_string());
    }

    if image_data.is_empty() {
        return Err("No image data provided".to_string());
    }

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {e}"))?;

    let workspace_icon_dir = app_data_dir.join(WORKSPACE_ICON_DIR);
    fs::create_dir_all(&workspace_icon_dir)
        .map_err(|e| format!("Failed to create workspace icon directory: {e}"))?;

    // Generate a unique filename for the cropped image
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or(Duration::from_secs(0))
        .as_millis();
    let filename = format!("{}_cropped_{}.png", workspace_id, timestamp);
    let full_path = workspace_icon_dir.join(&filename);

    // Write the image data to file
    fs::write(&full_path, &image_data)
        .map_err(|e| format!("Failed to write cropped image file: {e}"))?;

    // Return the relative path
    let relative_path = format!("{}/{}", WORKSPACE_ICON_DIR, filename);
    Ok(relative_path)
}

#[tauri::command]
async fn get_workspace_icon_url(
    app: AppHandle,
    relative_path: String,
) -> Result<String, String> {
    if relative_path.trim().is_empty() {
        return Err("Invalid relative path".to_string());
    }

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {e}"))?;

    let full_path = app_data_dir.join(&relative_path);
    
    if !full_path.exists() {
        return Err(format!("Workspace icon file not found: {}", relative_path));
    }

    // Read the file and convert to base64 data URL
    let file_bytes = fs::read(&full_path)
        .map_err(|e| format!("Failed to read workspace icon file: {e}"))?;
    
    // Determine MIME type based on file extension
    let mime_type = match full_path.extension().and_then(|ext| ext.to_str()) {
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        Some("svg") => "image/svg+xml",
        Some("bmp") => "image/bmp",
        _ => "image/png", // Default fallback
    };

    // Encode as base64 data URL
    let base64_data = general_purpose::STANDARD.encode(&file_bytes);
    Ok(format!("data:{};base64,{}", mime_type, base64_data))
}

#[tauri::command]
async fn upload_image(
    app: AppHandle,
    pool: State<'_, DbPool>,
    card_id: String,
    board_id: String,
    file_path: String,
) -> Result<UploadImageResponse, String> {
    println!(
        "Starting upload image for card: {}, board: {}, file: {}",
        card_id, board_id, file_path
    );

    let app_data_dir = app.path().app_data_dir().map_err(|e| {
        println!("Failed to resolve app data directory: {}", e);
        format!("Failed to resolve app data directory: {e}")
    })?;

    let attachments_dir = app_data_dir.join("attachments");
    println!("Creating attachments directory: {:?}", attachments_dir);

    fs::create_dir_all(&attachments_dir).map_err(|e| {
        println!("Failed to create attachments directory: {}", e);
        format!("Failed to create attachments directory: {e}")
    })?;

    let source_path = PathBuf::from(&file_path);
    println!("Checking source path: {:?}", source_path);

    if !source_path.exists() {
        println!("Source file does not exist");
        return Ok(UploadImageResponse {
            success: false,
            file_path: String::new(),
            error: Some("Source file does not exist".to_string()),
        });
    }

    let file_extension = source_path
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("");

    println!("File extension: {}", file_extension);

    let mime_type = mime_guess::from_path(&source_path).first_or_octet_stream();
    println!("Detected MIME type: {}", mime_type);
    println!("MIME type string: {}", mime_type.as_ref());

    // Check if it's an image by extension as fallback
    let is_image_by_extension = match file_extension.to_lowercase().as_str() {
        "jpg" | "jpeg" | "png" | "gif" | "webp" | "svg" | "bmp" | "ico" | "tiff" | "tif" => true,
        _ => false,
    };

    println!("Is image by extension: {}", is_image_by_extension);

    if !mime_type.type_().as_str().starts_with("image/") && !is_image_by_extension {
        println!(
            "File is not an image - MIME: {}, extension: {}",
            mime_type, file_extension
        );
        return Ok(UploadImageResponse {
            success: false,
            file_path: String::new(),
            error: Some(format!(
                "File is not an image. Detected MIME: {}, extension: {}",
                mime_type, file_extension
            )),
        });
    }

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| {
            println!("System time error: {}", e);
            format!("System time error: {e}")
        })?
        .as_secs();

    let filename = format!("{}_{}.{}", card_id, timestamp, file_extension);
    let destination_path = attachments_dir.join(&filename);

    println!("Copying from {:?} to {:?}", source_path, destination_path);

    fs::copy(&source_path, &destination_path).map_err(|e| {
        println!("Failed to copy file: {}", e);
        format!("Failed to copy file: {e}")
    })?;

    let relative_path = format!("attachments/{}", filename);
    println!("Generated relative path: {}", relative_path);

    let mut tx = pool.begin().await.map_err(|e| {
        println!("Failed to begin transaction: {}", e);
        format!("Failed to begin transaction: {e}")
    })?;

    println!("Fetching existing attachments for card: {}", card_id);

    let existing_attachments: Option<String> =
        sqlx::query_scalar("SELECT attachments FROM kanban_cards WHERE id = ? AND board_id = ?")
            .bind(&card_id)
            .bind(&board_id)
            .fetch_one(&mut *tx)
            .await
            .map_err(|e| {
                println!("Failed to fetch existing attachments: {}", e);
                format!("Failed to fetch existing attachments: {e}")
            })?;

    println!("Existing attachments: {:?}", existing_attachments);

    let mut attachments_vec = match existing_attachments {
        Some(json_str) => serde_json::from_str(&json_str).unwrap_or_else(|e| {
            println!(
                "Failed to parse existing attachments JSON: {}, using empty array",
                e
            );
            vec![]
        }),
        None => vec![],
    };

    attachments_vec.push(relative_path.clone());

    let attachments_json = serde_json::to_string(&attachments_vec).map_err(|e| {
        println!("Failed to serialize attachments: {}", e);
        format!("Failed to serialize attachments: {e}")
    })?;

    println!("Updating card with attachments: {}", attachments_json);

    sqlx::query(
        "UPDATE kanban_cards SET attachments = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? AND board_id = ?"
    )
    .bind(&attachments_json)
    .bind(&card_id)
    .bind(&board_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| {
        println!("Failed to update card attachments: {}", e);
        format!("Failed to update card attachments: {e}")
    })?;

    tx.commit().await.map_err(|e| {
        println!("Failed to commit transaction: {}", e);
        format!("Failed to commit transaction: {e}")
    })?;

    println!("Upload completed successfully");

    Ok(UploadImageResponse {
        success: true,
        file_path: relative_path,
        error: None,
    })
}

#[tauri::command]
async fn remove_image(
    app: AppHandle,
    pool: State<'_, DbPool>,
    card_id: String,
    board_id: String,
    file_path: String,
) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {e}"))?;

    let mut tx = pool
        .begin()
        .await
        .map_err(|e| format!("Failed to begin transaction: {e}"))?;

    let existing_attachments: Option<String> =
        sqlx::query_scalar("SELECT attachments FROM kanban_cards WHERE id = ? AND board_id = ?")
            .bind(&card_id)
            .bind(&board_id)
            .fetch_one(&mut *tx)
            .await
            .map_err(|e| format!("Failed to fetch existing attachments: {e}"))?;

    let mut attachments_vec: Vec<String> = match existing_attachments {
        Some(json_str) => serde_json::from_str(&json_str).unwrap_or_else(|_| vec![]),
        None => vec![],
    };

    attachments_vec.retain(|path| path != &file_path);

    let attachments_json = serde_json::to_string(&attachments_vec)
        .map_err(|e| format!("Failed to serialize attachments: {e}"))?;

    sqlx::query(
        "UPDATE kanban_cards SET attachments = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? AND board_id = ?"
    )
    .bind(&attachments_json)
    .bind(&card_id)
    .bind(&board_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to update card attachments: {e}"))?;

    tx.commit()
        .await
        .map_err(|e| format!("Failed to commit transaction: {e}"))?;

    let full_file_path = app_data_dir.join(&file_path);
    if full_file_path.exists()
        && let Err(e) = fs::remove_file(&full_file_path)
    {
        eprintln!(
            "Warning: Failed to delete file {}: {}",
            full_file_path.display(),
            e
        );
    }

    Ok(())
}

#[tauri::command]
async fn get_attachment_url(app: AppHandle, file_path: String) -> Result<String, String> {
    // Read the image file and convert to base64
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {e}"))?;

    let full_path = app_data_dir.join(&file_path);
    if !full_path.exists() {
        return Err(format!("File does not exist: {:?}", full_path));
    }

    let image_data = std::fs::read(&full_path).map_err(|e| format!("Failed to read file: {e}"))?;

    // Determine MIME type from file extension
    let extension = full_path
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("");

    let mime_type = match extension.to_lowercase().as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "bmp" => "image/bmp",
        "ico" => "image/x-icon",
        _ => "image/jpeg",
    };

    let base64_data = general_purpose::STANDARD.encode(&image_data);
    let data_url = format!("data:{};base64,{}", mime_type, base64_data);

    Ok(data_url)
}
