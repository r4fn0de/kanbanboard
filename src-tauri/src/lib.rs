use anyhow::anyhow;
use base64::{Engine as _, engine::general_purpose};
use chrono::{DateTime, Utc};
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use sqlx::{
    Acquire, QueryBuilder, Row, Sqlite, Transaction,
    sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePool, SqlitePoolOptions, SqliteRow},
};
use std::collections::{BTreeSet, HashMap};
use std::convert::TryInto;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_opener::OpenerExt;
use tokio::time as tokio_time;
use uuid::Uuid;

const KANBAN_SCHEMA: &str = include_str!("../schema/kanban.sql");
const DATABASE_FILE: &str = "modulo.db";
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

#[tauri::command]
async fn create_subtask(pool: State<'_, DbPool>, args: CreateSubtaskArgs) -> Result<Value, String> {
    let title = args.title.trim().to_string();
    if title.is_empty() {
        return Err("O título da subtask não pode ser vazio.".to_string());
    }
    validate_string_input(&title, 200, "Título da subtask")?;

    let mut tx = pool
        .begin()
        .await
        .map_err(|e| format!("Falha ao abrir transação: {e}"))?;

    let card_board_id =
        sqlx::query_scalar::<_, Option<String>>("SELECT board_id FROM kanban_cards WHERE id = ?")
            .bind(&args.card_id)
            .fetch_one(&mut *tx)
            .await
            .map_err(|e| format!("Falha ao carregar cartão: {e}"))?
            .ok_or_else(|| "Cartão não encontrado.".to_string())?;

    if card_board_id != args.board_id {
        return Err("A subtask precisa pertencer ao mesmo quadro do cartão.".to_string());
    }

    let existing_count = sqlx::query_scalar::<_, Option<i64>>(
        "SELECT COUNT(*) FROM kanban_subtasks WHERE card_id = ?",
    )
    .bind(&args.card_id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| format!("Falha ao contar subtasks: {e}"))?
    .unwrap_or(0);

    let mut target_position = args.position.unwrap_or(existing_count);
    if target_position < 0 {
        target_position = 0;
    }
    if target_position > existing_count {
        target_position = existing_count;
    }

    sqlx::query(
        "UPDATE kanban_subtasks SET position = position + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE card_id = ? AND position >= ?",
    )
    .bind(&args.card_id)
    .bind(target_position)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Falha ao ajustar posições das subtasks: {e}"))?;

    sqlx::query(
        "INSERT INTO kanban_subtasks (id, board_id, card_id, title, is_completed, position, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))",
    )
    .bind(&args.id)
    .bind(&args.board_id)
    .bind(&args.card_id)
    .bind(&title)
    .bind(target_position)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Falha ao criar subtask: {e}"))?;

    normalize_subtask_positions_tx(&mut tx, &args.card_id)
        .await
        .map_err(|e| format!("Falha ao normalizar posições das subtasks: {e}"))?;

    let row = sqlx::query(
        "SELECT id, board_id, card_id, title, is_completed, position, created_at, updated_at FROM kanban_subtasks WHERE id = ?",
    )
    .bind(&args.id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| format!("Falha ao carregar subtask: {e}"))?;

    let mapped = map_subtask_row(row).map_err(|e| e.to_string())?;

    tx.commit()
        .await
        .map_err(|e| format!("Falha ao confirmar transação: {e}"))?;

    Ok(mapped)
}

#[tauri::command]
async fn update_subtask(pool: State<'_, DbPool>, args: UpdateSubtaskArgs) -> Result<Value, String> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|e| format!("Falha ao abrir transação: {e}"))?;

    let record = sqlx::query_as::<_, (String, String)>(
        "SELECT board_id, card_id FROM kanban_subtasks WHERE id = ?",
    )
    .bind(&args.id)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| format!("Falha ao carregar subtask: {e}"))?;

    let Some((board_id_db, card_id_db)) = record else {
        return Err("Subtask não encontrada.".to_string());
    };

    if board_id_db != args.board_id {
        return Err("A subtask não pertence ao quadro informado.".to_string());
    }

    if card_id_db != args.card_id {
        return Err("A subtask não pertence ao cartão informado.".to_string());
    }

    let mut builder = QueryBuilder::<Sqlite>::new(
        "UPDATE kanban_subtasks SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
    );
    let mut has_changes = false;

    if let Some(title) = args.title.as_ref() {
        let trimmed = title.trim();
        if trimmed.is_empty() {
            return Err("O título da subtask não pode ser vazio.".to_string());
        }
        validate_string_input(trimmed, 200, "Título da subtask")?;
        builder.push(", title = ");
        builder.push_bind(trimmed);
        has_changes = true;
    }

    if let Some(is_completed) = args.is_completed {
        builder.push(", is_completed = ");
        builder.push_bind(if is_completed { 1 } else { 0 });
        has_changes = true;
    }

    if has_changes {
        builder.push(" WHERE id = ");
        builder.push_bind(&args.id);
        builder.push(" AND card_id = ");
        builder.push_bind(&args.card_id);

        builder.build().execute(&mut *tx).await.map_err(|e| {
            log::error!("Falha ao atualizar subtask: {e}");
            e.to_string()
        })?;
    }

    if let Some(target_position) = args.target_position {
        let subtask_ids = sqlx::query_as::<_, (String,)>(
            "SELECT id FROM kanban_subtasks WHERE card_id = ? ORDER BY position ASC, created_at ASC",
        )
        .bind(&args.card_id)
        .fetch_all(&mut *tx)
        .await
        .map_err(|e| format!("Falha ao carregar subtasks: {e}"))?;

        let current_index = subtask_ids
            .iter()
            .position(|(id,)| id == &args.id)
            .ok_or_else(|| "Subtask não encontrada.".to_string())?;

        let mut ordered: Vec<String> = subtask_ids.into_iter().map(|(id,)| id).collect();
        let moving = ordered.remove(current_index);

        let mut clamped = target_position;
        if clamped < 0 {
            clamped = 0;
        }
        if clamped as usize > ordered.len() {
            clamped = ordered.len() as i64;
        }

        ordered.insert(clamped as usize, moving);

        let offset = ordered.len() as i64;
        for (index, id) in ordered.iter().enumerate() {
            sqlx::query(
                "UPDATE kanban_subtasks SET position = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
            )
            .bind(index as i64 + offset)
            .bind(id)
            .execute(&mut *tx)
            .await
            .map_err(|e| format!("Falha ao reordenar subtasks: {e}"))?;
        }

        normalize_subtask_positions_tx(&mut tx, &args.card_id)
            .await
            .map_err(|e| format!("Falha ao normalizar posições das subtasks: {e}"))?;
    }

    let row = sqlx::query(
        "SELECT id, board_id, card_id, title, is_completed, position, created_at, updated_at FROM kanban_subtasks WHERE id = ?",
    )
    .bind(&args.id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| format!("Falha ao recuperar subtask: {e}"))?;

    let mapped = map_subtask_row(row).map_err(|e| e.to_string())?;

    tx.commit()
        .await
        .map_err(|e| format!("Falha ao confirmar transação: {e}"))?;

    Ok(mapped)
}

#[tauri::command]
async fn delete_subtask(pool: State<'_, DbPool>, args: DeleteSubtaskArgs) -> Result<(), String> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|e| format!("Falha ao abrir transação: {e}"))?;

    let record = sqlx::query_as::<_, (String, String)>(
        "SELECT board_id, card_id FROM kanban_subtasks WHERE id = ?",
    )
    .bind(&args.id)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| format!("Falha ao carregar subtask: {e}"))?;

    let Some((board_id_db, card_id_db)) = record else {
        return Err("Subtask não encontrada.".to_string());
    };

    if board_id_db != args.board_id {
        return Err("A subtask não pertence ao quadro informado.".to_string());
    }

    if card_id_db != args.card_id {
        return Err("A subtask não pertence ao cartão informado.".to_string());
    }

    sqlx::query("DELETE FROM kanban_subtasks WHERE id = ?")
        .bind(&args.id)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Falha ao excluir subtask: {e}"))?;

    normalize_subtask_positions_tx(&mut tx, &args.card_id)
        .await
        .map_err(|e| format!("Falha ao normalizar posições das subtasks: {e}"))?;

    tx.commit()
        .await
        .map_err(|e| format!("Falha ao confirmar transação: {e}"))?;

    Ok(())
}

fn directory_size(path: &Path) -> Result<u64, std::io::Error> {
    let mut total = 0;
    if !path.exists() {
        return Ok(0);
    }

    for entry in fs::read_dir(path)? {
        let entry = entry?;
        let metadata = entry.metadata()?;
        if metadata.is_dir() {
            total += directory_size(&entry.path())?;
        } else {
            total += metadata.len();
        }
    }

    Ok(total)
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct StorageStats {
    database_bytes: u64,
    attachments_bytes: u64,
    workspace_icons_bytes: u64,
    preferences_bytes: u64,
    total_bytes: u64,
    database_path: String,
    attachments_path: String,
    workspace_icons_path: String,
    preferences_path: String,
}

#[tauri::command]
async fn get_storage_stats(app: AppHandle) -> Result<StorageStats, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {e}"))?;

    let db_path = app_data_dir.join(DATABASE_FILE);
    let attachments_path = app_data_dir.join("attachments");
    let workspace_icons_path = app_data_dir.join(WORKSPACE_ICON_DIR);
    let preferences_path = get_preferences_path(&app).map_err(|e| e.to_string())?;

    let database_bytes = fs::metadata(&db_path).map(|m| m.len()).unwrap_or(0);
    let attachments_bytes = directory_size(&attachments_path).map_err(|e| {
        log::error!("Failed to measure attachments directory size: {e}");
        format!("Failed to measure attachments directory size: {e}")
    })?;
    let workspace_icons_bytes = directory_size(&workspace_icons_path).map_err(|e| {
        log::error!("Failed to measure workspace icon directory size: {e}");
        format!("Failed to measure workspace icon directory size: {e}")
    })?;
    let preferences_bytes = fs::metadata(&preferences_path)
        .map(|m| m.len())
        .unwrap_or(0);

    Ok(StorageStats {
        database_bytes,
        attachments_bytes,
        workspace_icons_bytes,
        preferences_bytes,
        total_bytes: database_bytes + attachments_bytes + workspace_icons_bytes + preferences_bytes,
        database_path: db_path.to_string_lossy().into_owned(),
        attachments_path: attachments_path.to_string_lossy().into_owned(),
        workspace_icons_path: workspace_icons_path.to_string_lossy().into_owned(),
        preferences_path: preferences_path.to_string_lossy().into_owned(),
    })
}

#[tauri::command]
async fn clear_attachments(app: AppHandle) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {e}"))?;
    let attachments_dir = app_data_dir.join("attachments");

    if attachments_dir.exists() {
        fs::remove_dir_all(&attachments_dir)
            .map_err(|e| format!("Failed to delete attachments directory: {e}"))?;
    }

    fs::create_dir_all(&attachments_dir)
        .map_err(|e| format!("Failed to recreate attachments directory: {e}"))?;

    Ok(())
}

#[tauri::command]
async fn reset_application_data(app: AppHandle, pool: State<'_, DbPool>) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {e}"))?;

    if app_data_dir.exists() {
        // Remove everything except the directory itself
        for entry in fs::read_dir(&app_data_dir)
            .map_err(|e| format!("Failed to read application data directory: {e}"))?
        {
            let entry = entry.map_err(|e| format!("Failed to access entry: {e}"))?;
            let path = entry.path();
            if path.is_dir() {
                fs::remove_dir_all(&path)
                    .map_err(|e| format!("Failed to remove directory {path:?}: {e}"))?;
            } else {
                fs::remove_file(&path)
                    .map_err(|e| format!("Failed to remove file {path:?}: {e}"))?;
            }
        }
    }

    // Ensure critical directories exist again
    let attachments_dir = app_data_dir.join("attachments");
    fs::create_dir_all(&attachments_dir)
        .map_err(|e| format!("Failed to recreate attachments directory: {e}"))?;

    let icons_dir = app_data_dir.join(WORKSPACE_ICON_DIR);
    fs::create_dir_all(&icons_dir)
        .map_err(|e| format!("Failed to recreate workspace icon directory: {e}"))?;

    if let Ok(pref_path) = get_preferences_path(&app)
        && pref_path.exists()
    {
        fs::remove_file(&pref_path)
            .map_err(|e| format!("Failed to remove preferences file: {e}"))?;
    }

    // Clear database contents
    let mut conn = pool
        .acquire()
        .await
        .map_err(|e| format!("Failed to acquire database connection: {e}"))?;

    let mut tx = conn
        .begin()
        .await
        .map_err(|e| format!("Failed to begin reset transaction: {e}"))?;

    sqlx::query("PRAGMA foreign_keys = OFF")
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to disable foreign keys: {e}"))?;

    for table in [
        "kanban_activity",
        "kanban_subtasks",
        "kanban_card_tags",
        "kanban_attachments",
        "kanban_cards",
        "kanban_columns",
        "kanban_tags",
        "kanban_boards",
        "notes",
        "workspaces",
    ] {
        let stmt = format!("DELETE FROM {table}");
        if let Err(e) = sqlx::query(&stmt).execute(&mut *tx).await {
            let msg = e.to_string();
            if msg.contains("no such table") {
                log::warn!("Skipping reset for missing table {table}: {msg}");
            } else {
                return Err(format!("Failed to reset table {table}: {e}"));
            }
        }
    }

    sqlx::query("PRAGMA foreign_keys = ON")
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to re-enable foreign keys: {e}"))?;

    tx.commit()
        .await
        .map_err(|e| format!("Failed to finalize reset transaction: {e}"))?;

    // Run maintenance to reclaim space after data purge
    let pool_ref = pool.inner();

    sqlx::query("VACUUM")
        .execute(pool_ref)
        .await
        .map_err(|e| format!("Failed to vacuum database: {e}"))?;

    sqlx::query("ANALYZE")
        .execute(pool_ref)
        .await
        .map_err(|e| format!("Failed to analyze database: {e}"))?;

    // Reinitialize schema artifacts and default data
    initialize_schema(pool_ref)
        .await
        .map_err(|e| format!("Failed to reinitialize schema after reset: {e}"))?;

    Ok(())
}

#[tauri::command]
async fn open_attachment(app: AppHandle, file_path: String) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {e}"))?;

    let full_path = app_data_dir.join(&file_path);

    if !full_path.exists() {
        return Err(format!("Attachment not found: {}", file_path));
    }

    let path_str = full_path
        .to_str()
        .ok_or_else(|| format!("Failed to convert path to string: {}", file_path))?
        .to_string();

    app.opener()
        .open_path(path_str, Option::<String>::None)
        .map_err(|e| format!("Failed to open attachment: {e}"))?;

    Ok(())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
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
    #[serde(default)]
    clear_due_date: Option<bool>,
    #[serde(default)]
    remind_at: Option<Option<String>>,
    #[serde(default)]
    clear_remind_at: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateSubtaskArgs {
    id: String,
    board_id: String,
    card_id: String,
    title: String,
    #[serde(default)]
    position: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpdateSubtaskArgs {
    id: String,
    board_id: String,
    card_id: String,
    #[serde(default)]
    title: Option<String>,
    #[serde(default)]
    is_completed: Option<bool>,
    #[serde(default)]
    target_position: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DeleteSubtaskArgs {
    id: String,
    board_id: String,
    card_id: String,
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
async fn update_card(
    app: AppHandle,
    pool: State<'_, DbPool>,
    args: UpdateCardArgs,
) -> Result<(), String> {
    log::info!(
        "Attempting to update card with id: {}, board_id: {}",
        args.id,
        args.board_id
    );

    log::info!("update_card: raw due_date arg = {:?}", args.due_date);

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

    let mut has_changes = false;
    let mut new_remind_at: Option<String> = None;

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
    if args.clear_due_date.unwrap_or(false) {
        // Pedido explícito para limpar a data de vencimento
        sql.push_str(", due_date = NULL");
        has_changes = true;
    } else if let Some(ref due_date) = args.due_date {
        match due_date {
            // Frontend enviou uma string (possivelmente vazia)
            Some(value) => {
                let trimmed = value.trim();
                if trimmed.is_empty() {
                    // String vazia ou só espaços: limpar o campo no banco
                    sql.push_str(", due_date = NULL");
                } else {
                    let escaped = trimmed.replace('\'', "''");
                    sql.push_str(&format!(", due_date = '{}'", escaped));
                }
            }
            // Frontend enviou null explicitamente: limpar o campo
            None => {
                sql.push_str(", due_date = NULL");
            }
        }
        has_changes = true;
    }

    // Handle reminder update
    if args.clear_remind_at.unwrap_or(false) {
        sql.push_str(", remind_at = NULL");
        has_changes = true;
    } else if let Some(ref remind_at) = args.remind_at {
        match remind_at {
            Some(value) => {
                let trimmed = value.trim();
                if trimmed.is_empty() {
                    sql.push_str(", remind_at = NULL");
                } else {
                    let escaped = trimmed.replace('\'', "''");
                    sql.push_str(&format!(", remind_at = '{}'", escaped));
                    new_remind_at = Some(trimmed.to_string());
                }
            }
            None => {
                sql.push_str(", remind_at = NULL");
            }
        }
        has_changes = true;
    }

    if !has_changes {
        log::info!(
            "update_card: no changes detected for card id {}, skipping UPDATE",
            args.id
        );
        return Ok(());
    }

    sql.push_str(&format!(" WHERE id = '{}'", args.id.replace('\'', "''")));

    log::info!("Executing SQL: {}", sql);

    // Execute the query
    let result = sqlx::query(&sql).execute(&mut *tx).await.map_err(|e| {
        log::error!("Failed to execute update query: {}", e);
        format!("Falha ao atualizar cartão: {e}")
    })?;

    // Schedule reminder notification if a new remind_at was set
    if let Some(when) = new_remind_at.clone() {
        let app_handle = app.clone();
        schedule_card_reminder(app_handle, when, args.id.clone());
    }

    log::info!("Update affected {} rows", result.rows_affected());

    tx.commit().await.map_err(|e| {
        log::error!("Failed to commit transaction: {}", e);
        format!("Falha ao confirmar transação: {e}")
    })?;

    log::info!("Card update completed successfully");
    Ok(())
}

fn schedule_card_reminder(app: AppHandle, when_iso: String, card_id: String) {
    log::info!("Scheduling reminder for card {} at {}", card_id, when_iso);

    tauri::async_runtime::spawn(async move {
        let parsed = match DateTime::parse_from_rfc3339(&when_iso) {
            Ok(dt) => dt.with_timezone(&Utc),
            Err(e) => {
                log::warn!(
                    "Failed to parse remind_at '{}' for card {}: {}",
                    when_iso,
                    card_id,
                    e
                );
                return;
            }
        };

        let now = Utc::now();
        let delay_ms = (parsed - now).num_milliseconds();

        if delay_ms <= 0 {
            log::info!(
                "Reminder time already passed or is now for card {}, firing immediately",
                card_id
            );
        } else {
            let delay = delay_ms as u64;
            log::info!(
                "Waiting {} ms before firing reminder for card {}",
                delay,
                card_id
            );
            tokio_time::sleep(Duration::from_millis(delay)).await;
        }

        if let Err(e) = send_native_notification(
            app,
            "Task reminder".to_string(),
            Some(format!("You asked to be reminded about card {}", card_id)),
        )
        .await
        {
            log::error!(
                "Failed to send scheduled reminder notification for card {}: {}",
                card_id,
                e
            );
        }
    });
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
    ensure_board_emoji_color_columns(pool).await?;
    ensure_card_attachments_column(pool).await?;
    ensure_card_remind_at_column(pool).await?;
    ensure_column_customization_columns(pool).await?;
    ensure_notes_board_id_column(pool).await?;
    ensure_board_favorite_column(pool).await?;

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

async fn ensure_board_emoji_color_columns(pool: &DbPool) -> Result<(), String> {
    let emoji_exists = sqlx::query_scalar::<_, Option<i64>>(
        "SELECT 1 FROM pragma_table_info('kanban_boards') WHERE name = 'emoji' LIMIT 1",
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Failed to inspect kanban_boards schema: {e}"))?
    .flatten()
    .is_some();

    if !emoji_exists {
        sqlx::query("ALTER TABLE kanban_boards ADD COLUMN emoji TEXT")
            .execute(pool)
            .await
            .map_err(|e| format!("Failed to add emoji column to kanban_boards: {e}"))?;
    }

    let color_exists = sqlx::query_scalar::<_, Option<i64>>(
        "SELECT 1 FROM pragma_table_info('kanban_boards') WHERE name = 'color' LIMIT 1",
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Failed to inspect kanban_boards schema: {e}"))?
    .flatten()
    .is_some();

    if !color_exists {
        sqlx::query("ALTER TABLE kanban_boards ADD COLUMN color TEXT")
            .execute(pool)
            .await
            .map_err(|e| format!("Failed to add color column to kanban_boards: {e}"))?;
    }

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

async fn ensure_card_remind_at_column(pool: &DbPool) -> Result<(), String> {
    let column_exists = sqlx::query_scalar::<_, Option<i64>>(
        "SELECT 1 FROM pragma_table_info('kanban_cards') WHERE name = 'remind_at' LIMIT 1",
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Failed to inspect kanban_cards schema: {e}"))?
    .flatten()
    .is_some();

    if !column_exists {
        println!("Adding remind_at column to kanban_cards table");
        sqlx::query("ALTER TABLE kanban_cards ADD COLUMN remind_at TEXT")
            .execute(pool)
            .await
            .map_err(|e| format!("Failed to add remind_at column to kanban_cards: {e}"))?;
        println!("remind_at column added successfully");
    } else {
        println!("remind_at column already exists in kanban_cards table");
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
        "emoji": row.try_get::<Option<String>, _>("emoji")?,
        "color": row.try_get::<Option<String>, _>("color")?,
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

fn map_subtask_row(row: SqliteRow) -> Result<Value, sqlx::Error> {
    Ok(json!({
        "id": row.try_get::<String, _>("id")?,
        "boardId": row.try_get::<String, _>("board_id")?,
        "cardId": row.try_get::<String, _>("card_id")?,
        "title": row.try_get::<String, _>("title")?,
        "isCompleted": row.try_get::<i64, _>("is_completed")? != 0,
        "position": row.try_get::<i64, _>("position")?,
        "createdAt": row.try_get::<String, _>("created_at")?,
        "updatedAt": row.try_get::<String, _>("updated_at")?,
    }))
}

#[derive(Debug, Clone)]
#[allow(dead_code)]
struct AttachmentRecord {
    id: String,
    card_id: String,
    board_id: String,
    version: i64,
    filename: String,
    original_name: String,
    mime_type: Option<String>,
    size_bytes: Option<i64>,
    checksum: Option<String>,
    storage_path: String,
    thumbnail_path: Option<String>,
    created_at: String,
    updated_at: String,
}

impl AttachmentRecord {
    fn from_row(row: SqliteRow) -> Result<Self, sqlx::Error> {
        Ok(Self {
            id: row.try_get("id")?,
            card_id: row.try_get("card_id")?,
            board_id: row.try_get("board_id")?,
            version: row.try_get("version")?,
            filename: row.try_get("filename")?,
            original_name: row.try_get("original_name")?,
            mime_type: row.try_get("mime_type")?,
            size_bytes: row.try_get("size_bytes")?,
            checksum: row.try_get("checksum")?,
            storage_path: row.try_get("storage_path")?,
            thumbnail_path: row.try_get("thumbnail_path")?,
            created_at: row.try_get("created_at")?,
            updated_at: row.try_get("updated_at")?,
        })
    }

    fn into_json(self) -> Value {
        json!({
            "id": self.id,
            "boardId": self.board_id,
            "cardId": self.card_id,
            "version": self.version,
            "filename": self.filename,
            "originalName": self.original_name,
            "mimeType": self.mime_type,
            "sizeBytes": self.size_bytes,
            "checksum": self.checksum,
            "storagePath": self.storage_path,
            "thumbnailPath": self.thumbnail_path,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at,
        })
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
struct ListAttachmentsArgs {
    board_id: String,
    card_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
struct ManageAttachmentVersionArgs {
    board_id: String,
    card_id: String,
    attachment_id: String,
    target_version: Option<i64>,
}

fn map_card_row(row: SqliteRow) -> Result<Value, sqlx::Error> {
    let card_id: String = row.try_get("id")?;
    let board_id: String = row.try_get("board_id")?;
    let column_id: String = row.try_get("column_id")?;
    let title: String = row.try_get("title")?;
    let description: Option<String> = row.try_get("description")?;
    let position: i64 = row.try_get("position")?;
    let priority: String = row.try_get("priority")?;
    let due_date: Option<String> = row.try_get("due_date")?;
    let remind_at: Option<String> = row.try_get("remind_at")?;
    let created_at: String = row.try_get("created_at")?;
    let updated_at: String = row.try_get("updated_at")?;
    let archived_at: Option<String> = row.try_get("archived_at")?;

    let attachments_json: Option<String> = row.try_get("attachments_json")?;
    let legacy_attachments_json: Option<String> = row.try_get("legacy_attachments")?;

    let attachments: Vec<Value> = if let Some(json_str) = attachments_json {
        serde_json::from_str::<Vec<Value>>(&json_str).unwrap_or_default()
    } else if let Some(json_str) = legacy_attachments_json {
        serde_json::from_str::<Vec<String>>(&json_str)
            .unwrap_or_default()
            .into_iter()
            .map(|storage_path| {
                let filename = storage_path
                    .split('/')
                    .next_back()
                    .map(|segment| segment.to_string())
                    .unwrap_or_else(|| storage_path.clone());

                json!({
                    "id": storage_path.clone(),
                    "cardId": card_id.clone(),
                    "boardId": board_id.clone(),
                    "version": 1,
                    "filename": filename.clone(),
                    "originalName": filename,
                    "mimeType": Value::Null,
                    "sizeBytes": Value::Null,
                    "checksum": Value::Null,
                    "storagePath": storage_path,
                    "thumbnailPath": Value::Null,
                    "createdAt": created_at.clone(),
                    "updatedAt": updated_at.clone(),
                })
            })
            .collect()
    } else {
        Vec::new()
    };

    let tags_json: Option<String> = row.try_get("tags_json")?;
    let tags: Vec<Value> = tags_json
        .as_deref()
        .and_then(|json_str| serde_json::from_str(json_str).ok())
        .unwrap_or_default();

    let subtasks_json: Option<String> = row.try_get("subtasks_json")?;
    let subtasks: Vec<Value> = subtasks_json
        .as_deref()
        .and_then(|json_str| serde_json::from_str(json_str).ok())
        .unwrap_or_default();

    Ok(json!({
        "id": card_id,
        "boardId": board_id,
        "columnId": column_id,
        "title": title,
        "description": description,
        "position": position,
        "priority": priority,
        "dueDate": due_date,
        "remindAt": remind_at,
        "attachments": attachments,
        "createdAt": created_at,
        "updatedAt": updated_at,
        "archivedAt": archived_at,
        "subtasks": subtasks,
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
        "none" | "low" | "medium" | "high" => Ok(()),
        _ => Err("Prioridade inválida. Utilize 'none', 'low', 'medium' ou 'high'.".to_string()),
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

async fn normalize_subtask_positions_tx(
    tx: &mut Transaction<'_, Sqlite>,
    card_id: &str,
) -> Result<(), sqlx::Error> {
    let subtask_ids = sqlx::query_as::<_, (String,)>(
        "SELECT id FROM kanban_subtasks WHERE card_id = ? ORDER BY position ASC, created_at ASC",
    )
    .bind(card_id)
    .fetch_all(&mut **tx)
    .await?;

    for (index, (subtask_id,)) in subtask_ids.into_iter().enumerate() {
        sqlx::query(
            "UPDATE kanban_subtasks SET position = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
        )
        .bind(index as i64)
        .bind(subtask_id)
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
    sqlx::query("SELECT id, workspace_id, title, description, icon, emoji, color, created_at, updated_at, archived_at FROM kanban_boards ORDER BY created_at ASC")
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

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateBoardArgs {
    id: String,
    workspace_id: String,
    title: String,
    #[serde(default)]
    description: Option<String>,
    #[serde(default)]
    icon: Option<String>,
    #[serde(default)]
    emoji: Option<String>,
    #[serde(default)]
    color: Option<String>,
}

#[tauri::command]
async fn create_board(pool: State<'_, DbPool>, args: CreateBoardArgs) -> Result<(), String> {
    if args.workspace_id.is_empty() {
        return Err("O workspace informado é inválido.".to_string());
    }

    let workspace_exists =
        sqlx::query_scalar::<_, Option<i64>>("SELECT 1 FROM workspaces WHERE id = ? LIMIT 1")
            .bind(&args.workspace_id)
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

    let title = args.title.trim().to_string();
    if title.is_empty() {
        return Err("O nome do quadro não pode ser vazio.".to_string());
    }
    validate_string_input(&title, 200, "Nome do quadro")?;

    let normalized_description = normalize_optional_text(args.description);
    let normalized_icon = normalize_board_icon(args.icon)?;
    let normalized_emoji = normalize_optional_text(args.emoji);
    let normalized_color = normalize_optional_text(args.color);

    sqlx::query(
        "INSERT INTO kanban_boards (id, workspace_id, title, description, icon, emoji, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))",
    )
    .bind(&args.id)
    .bind(&args.workspace_id)
    .bind(&title)
    .bind(normalized_description)
    .bind(normalized_icon)
    .bind(normalized_emoji)
    .bind(normalized_color)
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
#[allow(clippy::too_many_arguments)]
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
async fn delete_column(
    pool: State<'_, DbPool>,
    id: String,
    board_id: String,
) -> Result<(), String> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|e| format!("Falha ao abrir transação: {e}"))?;

    // Check if column exists and belongs to the board
    let existing_board =
        sqlx::query_scalar::<_, Option<String>>("SELECT board_id FROM kanban_columns WHERE id = ?")
            .bind(&id)
            .fetch_one(&mut *tx)
            .await
            .map_err(|e| format!("Falha ao carregar coluna: {e}"))?
            .ok_or_else(|| "Coluna não encontrada.".to_string())?;

    if existing_board != board_id {
        return Err("A coluna não pertence ao quadro informado.".to_string());
    }

    // Check if column has any cards
    let card_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM kanban_cards WHERE column_id = ? AND archived_at IS NULL",
    )
    .bind(&id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| format!("Falha ao contar cartões da coluna: {e}"))?;

    if card_count > 0 {
        return Err(format!(
            "Não é possível excluir a coluna pois ela possui {} cartão(es). Mova ou exclua os cartões primeiro.",
            card_count
        ));
    }

    // Delete the column
    sqlx::query("DELETE FROM kanban_columns WHERE id = ?")
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Falha ao excluir coluna: {e}"))?;

    // Normalize positions of remaining columns
    normalize_column_positions_tx(&mut tx, &board_id)
        .await
        .map_err(|e| format!("Falha ao normalizar posições das colunas: {e}"))?;

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
            c.remind_at,
            c.attachments AS legacy_attachments,
            (
                SELECT json_group_array(
                    json_object(
                        'id', att.id,
                        'boardId', att.board_id,
                        'cardId', att.card_id,
                        'version', att.version,
                        'filename', att.filename,
                        'originalName', att.original_name,
                        'mimeType', att.mime_type,
                        'sizeBytes', att.size_bytes,
                        'checksum', att.checksum,
                        'storagePath', att.storage_path,
                        'thumbnailPath', att.thumbnail_path,
                        'createdAt', att.created_at,
                        'updatedAt', att.updated_at
                    )
                )
                FROM kanban_attachments att
                WHERE att.card_id = c.id
                ORDER BY att.created_at ASC, att.version ASC
            ) AS attachments_json,
            c.created_at,
            c.updated_at,
            c.archived_at,
            (
                SELECT json_group_array(
                    json_object(
                        'id', sub.id,
                        'boardId', sub.board_id,
                        'cardId', sub.card_id,
                        'title', sub.title,
                        'isCompleted', CASE WHEN sub.is_completed <> 0 THEN 1 ELSE 0 END,
                        'position', sub.position,
                        'createdAt', sub.created_at,
                        'updatedAt', sub.updated_at
                    )
                )
                FROM (
                    SELECT st.id, st.board_id, st.card_id, st.title, st.is_completed, st.position, st.created_at, st.updated_at
                    FROM kanban_subtasks st
                    WHERE st.card_id = c.id
                    ORDER BY st.position ASC, st.created_at ASC
                ) sub
            ) AS subtasks_json,
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
#[allow(clippy::too_many_arguments)]
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
    let app_submenu = SubmenuBuilder::new(app, "Modulo")
        .item(&MenuItemBuilder::with_id("about", "About Modulo").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("check-updates", "Check for Updates...").build(app)?)
        .separator()
        .item(
            &MenuItemBuilder::with_id("preferences", "Preferences...")
                .accelerator("CmdOrCtrl+,")
                .build(app)?,
        )
        .separator()
        .item(&PredefinedMenuItem::hide(app, Some("Hide Modulo"))?)
        .item(&PredefinedMenuItem::hide_others(app, None)?)
        .item(&PredefinedMenuItem::show_all(app, None)?)
        .separator()
        .item(&PredefinedMenuItem::quit(app, Some("Quit Modulo"))?)
        .build()?;

    // Build the View submenu
    let view_submenu = SubmenuBuilder::new(app, "View")
        .item(
            &MenuItemBuilder::with_id("toggle-left-sidebar", "Toggle Left Sidebar")
                .accelerator("CmdOrCtrl+1")
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

async fn ensure_board_favorite_column(pool: &DbPool) -> Result<(), String> {
    let column_exists = sqlx::query_scalar::<_, Option<i64>>(
        "SELECT 1 FROM pragma_table_info('kanban_boards') WHERE name = 'is_favorite' LIMIT 1",
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Failed to inspect kanban_boards schema: {e}"))?
    .flatten()
    .is_some();

    if !column_exists {
        sqlx::query("ALTER TABLE kanban_boards ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0")
            .execute(pool)
            .await
            .map_err(|e| format!("Failed to add is_favorite column to kanban_boards: {e}"))?;
        sqlx::query("UPDATE kanban_boards SET is_favorite = 0 WHERE is_favorite IS NULL")
            .execute(pool)
            .await
            .map_err(|e| format!("Failed to backfill is_favorite values in kanban_boards: {e}"))?;
    } else {
        sqlx::query("UPDATE kanban_boards SET is_favorite = 0 WHERE is_favorite IS NULL")
            .execute(pool)
            .await
            .map_err(|e| format!("Failed to normalize is_favorite values in kanban_boards: {e}"))?;
    }

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

// ============================================================================
// HOME DASHBOARD COMMANDS
// ============================================================================

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskStats {
    pub total_projects: i64,
    pub active_projects: i64,
    pub tasks_today: i64,
    pub tasks_this_week: i64,
    pub completed_today: i64,
    pub completed_this_week: i64,
    pub overdue_tasks: i64,
}

#[tauri::command]
async fn get_task_statistics(pool: State<'_, DbPool>) -> Result<TaskStats, String> {
    let query = r#"
        SELECT
            COUNT(DISTINCT b.id) as total_projects,
            COUNT(DISTINCT CASE WHEN b.archived_at IS NULL THEN b.id END) as active_projects,
            COUNT(CASE WHEN date(t.due_date) = date('now') AND t.archived_at IS NULL THEN 1 END) as tasks_today,
            COUNT(CASE WHEN t.due_date >= date('now', '-7 days') AND t.archived_at IS NULL THEN 1 END) as tasks_this_week,
            COUNT(CASE WHEN t.archived_at IS NULL AND (
                SELECT COUNT(*) FROM kanban_columns c2 WHERE c2.id = t.column_id AND (
                    LOWER(c2.title) LIKE '%done%' OR
                    LOWER(c2.title) LIKE '%complete%' OR
                    LOWER(c2.title) LIKE '%finished%'
                )
            ) > 0 THEN 1 END) as completed_today,
            COUNT(CASE WHEN t.archived_at IS NULL AND t.updated_at >= date('now', '-7 days') AND (
                SELECT COUNT(*) FROM kanban_columns c2 WHERE c2.id = t.column_id AND (
                    LOWER(c2.title) LIKE '%done%' OR
                    LOWER(c2.title) LIKE '%complete%' OR
                    LOWER(c2.title) LIKE '%finished%'
                )
            ) > 0 THEN 1 END) as completed_this_week,
            COUNT(CASE WHEN t.due_date < datetime('now') AND t.archived_at IS NULL AND (
                SELECT COUNT(*) FROM kanban_columns c2 WHERE c2.id = t.column_id AND (
                    LOWER(c2.title) NOT LIKE '%done%' AND
                    LOWER(c2.title) NOT LIKE '%complete%' AND
                    LOWER(c2.title) NOT LIKE '%finished%'
                )
            ) > 0 THEN 1 END) as overdue_tasks
        FROM kanban_boards b
        LEFT JOIN kanban_columns col ON col.board_id = b.id
        LEFT JOIN kanban_cards t ON t.column_id = col.id
    "#;

    let row = sqlx::query(query)
        .fetch_one(&*pool)
        .await
        .map_err(|e| format!("Failed to get task statistics: {e}"))?;

    Ok(TaskStats {
        total_projects: row.get::<i64, _>("total_projects"),
        active_projects: row.get::<i64, _>("active_projects"),
        tasks_today: row.get::<i64, _>("tasks_today"),
        tasks_this_week: row.get::<i64, _>("tasks_this_week"),
        completed_today: row.get::<i64, _>("completed_today"),
        completed_this_week: row.get::<i64, _>("completed_this_week"),
        overdue_tasks: row.get::<i64, _>("overdue_tasks"),
    })
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Activity {
    pub id: String,
    pub activity_type: String,
    pub title: String,
    pub board_name: String,
    pub board_icon: Option<String>,
    pub timestamp: String,
    pub entity_id: String,
    pub entity_type: String,
}

#[tauri::command]
async fn get_recent_activity(
    pool: State<'_, DbPool>,
    limit: Option<i32>,
) -> Result<Vec<Activity>, String> {
    let limit = limit.unwrap_or(10);

    let query = r#"
        SELECT
            'card_created' as activity_type,
            c.id as entity_id,
            'card' as entity_type,
            c.title,
            b.title as board_name,
            b.icon as board_icon,
            c.created_at as timestamp
        FROM kanban_cards c
        JOIN kanban_boards b ON b.id = c.board_id
        WHERE c.archived_at IS NULL

        UNION ALL

        SELECT
            'card_updated' as activity_type,
            c.id as entity_id,
            'card' as entity_type,
            c.title,
            b.title as board_name,
            b.icon as board_icon,
            c.updated_at as timestamp
        FROM kanban_cards c
        JOIN kanban_boards b ON b.id = c.board_id
        WHERE c.archived_at IS NULL

        UNION ALL

        SELECT
            'board_created' as activity_type,
            b.id as entity_id,
            'board' as entity_type,
            b.title,
            b.title as board_name,
            b.icon as board_icon,
            b.created_at as timestamp
        FROM kanban_boards b
        WHERE b.archived_at IS NULL

        ORDER BY timestamp DESC
        LIMIT ?
    "#;

    let activities = sqlx::query(query)
        .bind(limit)
        .fetch_all(&*pool)
        .await
        .map_err(|e| format!("Failed to get recent activity: {e}"))?;

    let mapped_activities: Vec<Activity> = activities
        .into_iter()
        .map(|row| {
            let activity_type = row.get::<String, _>("activity_type");
            let entity_id = row.get::<String, _>("entity_id");
            let title = row.get::<String, _>("title");
            let board_name = row.get::<String, _>("board_name");
            let board_icon = row.get::<Option<String>, _>("board_icon");
            let timestamp = row.get::<String, _>("timestamp");
            let entity_type = row.get::<String, _>("entity_type");

            Activity {
                id: format!("{}-{}", activity_type, entity_id),
                activity_type,
                title,
                board_name,
                board_icon,
                timestamp,
                entity_id,
                entity_type,
            }
        })
        .collect();

    Ok(mapped_activities)
}

#[tauri::command]
async fn get_favorite_boards(pool: State<'_, DbPool>) -> Result<Vec<Value>, String> {
    let query = r#"
        SELECT
            b.id,
            b.title,
            b.icon,
            b.emoji,
            b.color,
            b.created_at,
            b.updated_at,
            b.is_favorite,
            COUNT(DISTINCT c.id) as total_cards,
            COUNT(DISTINCT CASE WHEN c.archived_at IS NULL THEN c.id END) as active_cards
        FROM kanban_boards b
        LEFT JOIN kanban_columns col ON col.board_id = b.id
        LEFT JOIN kanban_cards c ON c.column_id = col.id
        WHERE b.is_favorite = 1 AND b.archived_at IS NULL
        GROUP BY b.id
        ORDER BY b.updated_at DESC
    "#;

    let boards = sqlx::query(query)
        .fetch_all(&*pool)
        .await
        .map_err(|e| format!("Failed to get favorite boards: {e}"))?;

    let mapped_boards: Vec<Value> = boards
        .into_iter()
        .map(|board| {
            let id = board.get::<String, _>("id");
            let title = board.get::<String, _>("title");
            let icon = board.get::<String, _>("icon");
            let emoji = board.get::<Option<String>, _>("emoji");
            let color = board.get::<Option<String>, _>("color");
            let created_at = board.get::<String, _>("created_at");
            let updated_at = board.get::<String, _>("updated_at");
            let is_favorite: i32 = board.get("is_favorite");
            let total_cards: i64 = board.get("total_cards");
            let active_cards: i64 = board.get("active_cards");

            json!({
                "id": id,
                "title": title,
                "icon": icon,
                "emoji": emoji,
                "color": color,
                "isFavorite": is_favorite != 0,
                "createdAt": created_at,
                "updatedAt": updated_at,
                "totalCards": total_cards,
                "activeCards": active_cards,
            })
        })
        .collect();

    Ok(mapped_boards)
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskWithDeadline {
    pub id: String,
    pub title: String,
    pub deadline: String,
    pub board_name: String,
    pub board_id: String,
    pub is_overdue: bool,
    pub days_until: i64,
}

#[tauri::command]
async fn get_upcoming_deadlines(
    pool: State<'_, DbPool>,
    days_ahead: Option<i32>,
) -> Result<Vec<TaskWithDeadline>, String> {
    let days_ahead = days_ahead.unwrap_or(7);

    let query = r#"
        SELECT
            c.id,
            c.title,
            c.due_date,
            b.title as board_name,
            b.id as board_id
        FROM kanban_cards c
        JOIN kanban_columns col ON col.id = c.column_id
        JOIN kanban_boards b ON b.id = col.board_id
        WHERE c.due_date IS NOT NULL
        AND c.archived_at IS NULL
        AND date(c.due_date) <= date('now', '+' || ? || ' days')
        AND b.archived_at IS NULL
        ORDER BY c.due_date ASC
    "#;

    let tasks = sqlx::query(query)
        .bind(days_ahead as i64)
        .fetch_all(&*pool)
        .await
        .map_err(|e| format!("Failed to get upcoming deadlines: {e}"))?;

    let mapped_tasks: Vec<TaskWithDeadline> = tasks
        .into_iter()
        .map(|task| {
            let id = task.get::<String, _>("id");
            let title = task.get::<String, _>("title");
            let due_date: String = task.get("due_date");
            let board_name = task.get::<String, _>("board_name");
            let board_id = task.get::<String, _>("board_id");
            let is_overdue = due_date < chrono::Utc::now().to_rfc3339();

            TaskWithDeadline {
                id,
                title,
                deadline: due_date,
                board_name,
                board_id,
                is_overdue,
                days_until: 0, // Will be calculated below
            }
        })
        .collect();

    // Calculate days until for each task
    let mut mapped_tasks_with_days: Vec<TaskWithDeadline> = Vec::new();
    for task in mapped_tasks {
        let days_until = sqlx::query_scalar::<_, Option<i64>>(
            "SELECT CAST(julianday(?) - julianday('now') AS INTEGER)",
        )
        .bind(&task.deadline)
        .fetch_one(&*pool)
        .await
        .unwrap_or(None)
        .unwrap_or(0);

        mapped_tasks_with_days.push(TaskWithDeadline { days_until, ..task });
    }

    Ok(mapped_tasks_with_days)
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub id: String,
    pub title: String,
    pub item_type: String,
    pub board_id: String,
    pub board_name: String,
    pub description: Option<String>,
}

#[tauri::command]
async fn global_search(
    pool: State<'_, DbPool>,
    query: String,
) -> Result<Vec<SearchResult>, String> {
    let search_term = format!("%{}%", query.trim());
    let mut results = Vec::new();

    // Search in boards
    let board_rows = sqlx::query(
        r#"
        SELECT
            b.id,
            b.title,
            b.description,
            b.title as board_name,
            'board' as item_type,
            b.id as board_id
        FROM kanban_boards b
        WHERE b.archived_at IS NULL
        AND (b.title LIKE ? OR b.description LIKE ?)
        ORDER BY b.title ASC
        LIMIT 20
        "#,
    )
    .bind(&search_term)
    .bind(&search_term)
    .fetch_all(&*pool)
    .await
    .map_err(|e| format!("Failed to search boards: {e}"))?;

    for row in board_rows {
        results.push(SearchResult {
            id: row.get("id"),
            title: row.get("title"),
            item_type: "board".to_string(),
            board_id: row.get("board_id"),
            board_name: row.get("board_name"),
            description: row.get("description"),
        });
    }

    // Search in cards
    let card_rows = sqlx::query(
        r#"
        SELECT
            c.id,
            c.title,
            c.description,
            b.title as board_name,
            b.id as board_id,
            'card' as item_type
        FROM kanban_cards c
        JOIN kanban_columns col ON col.id = c.column_id
        JOIN kanban_boards b ON b.id = col.board_id
        WHERE c.archived_at IS NULL
        AND (c.title LIKE ? OR c.description LIKE ?)
        ORDER BY c.updated_at DESC
        LIMIT 50
        "#,
    )
    .bind(&search_term)
    .bind(&search_term)
    .fetch_all(&*pool)
    .await
    .map_err(|e| format!("Failed to search cards: {e}"))?;

    for row in card_rows {
        results.push(SearchResult {
            id: row.get("id"),
            title: row.get("title"),
            item_type: "card".to_string(),
            board_id: row.get("board_id"),
            board_name: row.get("board_name"),
            description: row.get("description"),
        });
    }

    // Search in notes
    let note_rows = sqlx::query(
        r#"
        SELECT
            n.id,
            n.title,
            n.content as description,
            b.title as board_name,
            b.id as board_id,
            'note' as item_type
        FROM notes n
        JOIN kanban_boards b ON b.id = n.board_id
        WHERE n.archived_at IS NULL
        AND (n.title LIKE ? OR n.content LIKE ?)
        ORDER BY n.updated_at DESC
        LIMIT 30
        "#,
    )
    .bind(&search_term)
    .bind(&search_term)
    .fetch_all(&*pool)
    .await
    .map_err(|e| format!("Failed to search notes: {e}"))?;

    for row in note_rows {
        results.push(SearchResult {
            id: row.get("id"),
            title: row.get("title"),
            item_type: "note".to_string(),
            board_id: row.get("board_id"),
            board_name: row.get("board_name"),
            description: row.get("description"),
        });
    }

    Ok(results)
}

#[tauri::command]
async fn set_workspace_icon_path(
    app: AppHandle,
    pool: State<'_, DbPool>,
    workspace_id: String,
    icon_path: String,
) -> Result<Value, String> {
    let workspace_id = workspace_id.trim();
    if workspace_id.is_empty() {
        return Err("Identificador do workspace inválido.".to_string());
    }

    let icon_path = icon_path.trim();
    if icon_path.is_empty() {
        return Err("Caminho do ícone inválido.".to_string());
    }

    // Get the existing icon to clean it up
    let existing_icon: Option<String> =
        sqlx::query_scalar("SELECT icon_path FROM workspaces WHERE id = ?")
            .bind(workspace_id)
            .fetch_optional(&*pool)
            .await
            .map_err(|e| format!("Falha ao carregar workspace: {e}"))?
            .flatten();

    // Update the icon_path in the database
    let result = sqlx::query(
        "UPDATE workspaces SET icon_path = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?",
    )
    .bind(icon_path)
    .bind(workspace_id)
    .execute(&*pool)
    .await
    .map_err(|e| {
        log::error!("Failed to update workspace icon path for {workspace_id}: {e}");
        e.to_string()
    })?;

    if result.rows_affected() == 0 {
        return Err("Workspace não encontrado.".to_string());
    }

    // Clean up the old icon file if it exists and is different
    if let Some(previous) = existing_icon
        && previous != icon_path
    {
        let _ = remove_workspace_icon_file(&app, &previous);
    }

    // Return the updated workspace
    sqlx::query("SELECT id, name, color, icon_path, created_at, updated_at, archived_at FROM workspaces WHERE id = ?")
        .bind(workspace_id)
        .try_map(map_workspace_row)
        .fetch_one(&*pool)
        .await
        .map_err(|e| {
            log::error!("Failed to load workspace after icon path update {workspace_id}: {e}");
            e.to_string()
        })
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
            set_workspace_icon_path,
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
            delete_column,
            move_column,
            load_cards,
            load_tags,
            create_tag,
            update_tag,
            delete_tag,
            set_card_tags,
            create_subtask,
            update_subtask,
            delete_subtask,
            create_card,
            delete_card,
            update_card,
            move_card,
            upload_image,
            remove_image,
            get_attachment_url,
            open_attachment,
            get_storage_stats,
            clear_attachments,
            reset_application_data,
            load_notes,
            create_note,
            update_note,
            delete_note,
            archive_note,
            get_task_statistics,
            get_recent_activity,
            get_favorite_boards,
            get_upcoming_deadlines,
            global_search
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct UploadImageResponse {
    success: bool,
    file_path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    attachment: Option<Value>,
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
async fn get_workspace_icon_url(app: AppHandle, relative_path: String) -> Result<String, String> {
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
    let file_bytes =
        fs::read(&full_path).map_err(|e| format!("Failed to read workspace icon file: {e}"))?;

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

    let card_attachments_dir = attachments_dir.join(&card_id);
    println!(
        "Ensuring card attachment directory exists: {:?}",
        card_attachments_dir
    );

    fs::create_dir_all(&card_attachments_dir).map_err(|e| {
        println!("Failed to create card attachment directory: {}", e);
        format!("Failed to create card attachment directory: {e}")
    })?;

    let source_path = PathBuf::from(&file_path);
    println!("Checking source path: {:?}", source_path);

    if !source_path.exists() {
        println!("Source file does not exist");
        return Ok(UploadImageResponse {
            success: false,
            file_path: String::new(),
            attachment: None,
            error: Some("Source file does not exist".to_string()),
        });
    }

    let file_extension = source_path
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("");

    println!("File extension: {}", file_extension);

    let ext_lower = file_extension.to_lowercase();
    let image_extensions = [
        "jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico", "tiff", "tif",
    ];
    let document_extensions = [
        "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "md", "rtf", "zip",
        "rar", "7z", "tar", "json",
    ];

    let is_image_by_extension = image_extensions.contains(&ext_lower.as_str());
    let is_document_by_extension = document_extensions.contains(&ext_lower.as_str());

    if !is_image_by_extension && !is_document_by_extension {
        println!(
            "Unsupported attachment extension received: {}",
            file_extension
        );
        return Ok(UploadImageResponse {
            success: false,
            file_path: String::new(),
            attachment: None,
            error: Some(format!("Unsupported attachment type: .{}", file_extension)),
        });
    }

    let mime_type = mime_guess::from_path(&source_path).first_or_octet_stream();
    println!("Detected MIME type: {}", mime_type);
    println!("MIME type string: {}", mime_type.as_ref());

    if !is_image_by_extension && mime_type.type_().as_str().starts_with("image/") {
        println!(
            "Attachment extension {} detected as image MIME {}; treating as document",
            file_extension, mime_type
        );
    }

    let original_name = source_path
        .file_name()
        .and_then(|name| name.to_str())
        .map(|name| name.replace(['/', '\\'], "_"))
        .filter(|name| !name.trim().is_empty())
        .unwrap_or_else(|| {
            let fallback = format!("attachment.{}", file_extension);
            println!(
                "Unable to determine original filename, falling back to {}",
                fallback
            );
            fallback
        });

    let mut destination_path = card_attachments_dir.join(&original_name);

    if destination_path.exists() {
        println!(
            "Attachment with same name exists, generating unique filename for {:?}",
            destination_path
        );

        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|e| {
                println!("System time error: {}", e);
                format!("System time error: {e}")
            })?
            .as_secs();

        let (base, ext) = match destination_path.file_stem().and_then(|s| s.to_str()) {
            Some(stem) => (
                stem.to_string(),
                source_path
                    .extension()
                    .and_then(|e| e.to_str())
                    .map(|e| e.to_string()),
            ),
            None => (
                "attachment".to_string(),
                source_path
                    .extension()
                    .and_then(|e| e.to_str())
                    .map(|e| e.to_string()),
            ),
        };

        let mut counter = 1u32;
        loop {
            let candidate_name = if let Some(ref ext) = ext {
                format!("{}_{timestamp}_{counter}.{}", base, ext)
            } else {
                format!("{}_{timestamp}_{counter}", base)
            };

            let candidate_path = card_attachments_dir.join(&candidate_name);
            if !candidate_path.exists() {
                destination_path = candidate_path;
                break;
            }

            counter += 1;
        }
    }

    println!("Copying from {:?} to {:?}", source_path, destination_path);

    fs::copy(&source_path, &destination_path).map_err(|e| {
        println!("Failed to copy file: {}", e);
        format!("Failed to copy file: {e}")
    })?;

    let relative_path = destination_path
        .strip_prefix(&app_data_dir)
        .map_err(|e| {
            println!(
                "Failed to compute relative path for {:?}: {}",
                destination_path, e
            );
            format!("Failed to compute relative attachment path: {e}")
        })?
        .iter()
        .map(|component| component.to_string_lossy())
        .collect::<Vec<_>>()
        .join("/");

    println!("Generated relative path: {}", relative_path);

    let file_metadata = fs::metadata(&destination_path).map_err(|e| {
        println!("Failed to read file metadata: {}", e);
        format!("Failed to read file metadata: {e}")
    })?;

    let file_size: i64 = file_metadata.len().try_into().unwrap_or(i64::MAX);

    let mut file_reader = fs::File::open(&destination_path).map_err(|e| {
        println!("Failed to open file for checksum: {}", e);
        format!("Failed to open file for checksum: {e}")
    })?;

    let mut hasher = Sha256::new();
    use std::io::Read;
    let mut buffer = [0u8; 8192];
    loop {
        let bytes_read = file_reader
            .read(&mut buffer)
            .map_err(|e| format!("Failed to read file for checksum: {e}"))?;
        if bytes_read == 0 {
            break;
        }
        hasher.update(&buffer[..bytes_read]);
    }

    let checksum = format!("{:x}", hasher.finalize());

    let now = chrono::Utc::now().to_rfc3339();
    let mime_string = mime_type.essence_str().to_string();

    let mut tx = pool.begin().await.map_err(|e| {
        println!("Failed to begin transaction: {}", e);
        format!("Failed to begin transaction: {e}")
    })?;

    // Maintain legacy attachment JSON for existing clients
    let existing_attachments: Option<String> =
        sqlx::query_scalar("SELECT attachments FROM kanban_cards WHERE id = ? AND board_id = ?")
            .bind(&card_id)
            .bind(&board_id)
            .fetch_one(&mut *tx)
            .await
            .map_err(|e| {
                println!("Failed to fetch legacy attachments: {}", e);
                format!("Failed to fetch legacy attachments: {e}")
            })?;

    let mut attachments_vec: Vec<String> = existing_attachments
        .as_deref()
        .and_then(|json_str| serde_json::from_str(json_str).ok())
        .unwrap_or_default();
    attachments_vec.push(relative_path.clone());

    let attachments_json = serde_json::to_string(&attachments_vec).map_err(|e| {
        println!("Failed to serialize attachments JSON: {}", e);
        format!("Failed to serialize attachments JSON: {e}")
    })?;

    sqlx::query(
        "UPDATE kanban_cards SET attachments = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? AND board_id = ?",
    )
    .bind(&attachments_json)
    .bind(&card_id)
    .bind(&board_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| {
        println!("Failed to update legacy attachments column: {}", e);
        format!("Failed to update legacy attachments column: {e}")
    })?;

    let attachment_id = Uuid::new_v4().to_string();
    let version = 1i64;

    sqlx::query(
        "INSERT INTO kanban_attachments (
            id, card_id, board_id, version, filename, original_name, mime_type, size_bytes,
            checksum, storage_path, thumbnail_path, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&attachment_id)
    .bind(&card_id)
    .bind(&board_id)
    .bind(version)
    .bind(&original_name)
    .bind(&original_name)
    .bind(&mime_string)
    .bind(file_size)
    .bind(&checksum)
    .bind(&relative_path)
    .bind(Option::<String>::None)
    .bind(&now)
    .bind(&now)
    .execute(&mut *tx)
    .await
    .map_err(|e| {
        println!("Failed to insert attachment metadata: {}", e);
        format!("Failed to insert attachment metadata: {e}")
    })?;

    tx.commit()
        .await
        .map_err(|e| format!("Failed to commit transaction: {e}"))?;

    println!("Attachment uploaded successfully: {}", relative_path);

    Ok(UploadImageResponse {
        success: true,
        file_path: relative_path.clone(),
        attachment: Some(json!({
            "id": attachment_id,
            "boardId": board_id,
            "cardId": card_id,
            "version": version,
            "filename": original_name.clone(),
            "originalName": original_name,
            "mimeType": mime_string,
            "sizeBytes": file_size,
            "checksum": checksum,
            "storagePath": relative_path,
            "thumbnailPath": Value::Null,
            "createdAt": now,
            "updatedAt": now,
        })),
        error: None,
    })
}

#[tauri::command]
#[allow(dead_code)]
async fn list_card_attachments(
    pool: State<'_, DbPool>,
    args: ListAttachmentsArgs,
) -> Result<Value, String> {
    let attachments = sqlx::query(
        "SELECT id, card_id, board_id, version, filename, original_name, mime_type, size_bytes, checksum, storage_path, thumbnail_path, created_at, updated_at FROM kanban_attachments WHERE board_id = ? AND card_id = ? ORDER BY created_at DESC, version DESC",
    )
    .bind(&args.board_id)
    .bind(&args.card_id)
    .map(|row: SqliteRow| AttachmentRecord::from_row(row))
    .fetch_all(&*pool)
    .await
    .map_err(|e| format!("Failed to load attachments: {e}"))?
    .into_iter()
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| format!("Failed to map attachment row: {e}"))?;

    Ok(Value::Array(
        attachments
            .into_iter()
            .map(AttachmentRecord::into_json)
            .collect(),
    ))
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

    let attachment_row: Option<(String, i64)> = sqlx::query_as(
        "SELECT id, version FROM kanban_attachments WHERE card_id = ? AND board_id = ? AND storage_path = ? ORDER BY version DESC LIMIT 1",
    )
    .bind(&card_id)
    .bind(&board_id)
    .bind(&file_path)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| format!("Failed to look up attachment metadata: {e}"))?;

    if let Some((_id, _version)) = attachment_row {
        sqlx::query(
            "DELETE FROM kanban_attachments WHERE card_id = ? AND board_id = ? AND storage_path = ?",
        )
        .bind(&card_id)
        .bind(&board_id)
        .bind(&file_path)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to delete attachment metadata: {e}"))?;
    }

    let existing_attachments: Option<String> =
        sqlx::query_scalar("SELECT attachments FROM kanban_cards WHERE id = ? AND board_id = ?")
            .bind(&card_id)
            .bind(&board_id)
            .fetch_one(&mut *tx)
            .await
            .map_err(|e| format!("Failed to fetch existing attachments: {e}"))?;

    let mut attachments_vec: Vec<String> = existing_attachments
        .as_deref()
        .and_then(|json_str| serde_json::from_str(json_str).ok())
        .unwrap_or_default();
    attachments_vec.retain(|path| path != &file_path);

    let attachments_json = serde_json::to_string(&attachments_vec)
        .map_err(|e| format!("Failed to serialize attachments: {e}"))?;

    sqlx::query(
        "UPDATE kanban_cards SET attachments = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? AND board_id = ?",
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

    let remaining_references: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM kanban_attachments WHERE storage_path = ?")
            .bind(&file_path)
            .fetch_one(&*pool)
            .await
            .map_err(|e| format!("Failed to check attachment references: {e}"))?;

    if remaining_references == 0 {
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

#[tauri::command]
#[allow(dead_code)]
async fn restore_attachment_version(
    pool: State<'_, DbPool>,
    args: ManageAttachmentVersionArgs,
) -> Result<Value, String> {
    let ManageAttachmentVersionArgs {
        board_id,
        card_id,
        attachment_id,
        target_version,
    } = args;

    let mut tx = pool
        .begin()
        .await
        .map_err(|e| format!("Failed to begin transaction: {e}"))?;

    let version = match target_version {
        Some(version) => version,
        None => sqlx::query_scalar::<_, Option<i64>>(
            "SELECT MAX(version) FROM kanban_attachments WHERE id = ? AND board_id = ? AND card_id = ?",
        )
        .bind(&attachment_id)
        .bind(&board_id)
        .bind(&card_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| format!("Failed to load attachment versions: {e}"))?
        .ok_or_else(|| "Attachment not found".to_string())?,
    };

    let attachment = sqlx::query(
        "SELECT id, card_id, board_id, version, filename, original_name, mime_type, size_bytes, checksum, storage_path, thumbnail_path, created_at, updated_at FROM kanban_attachments WHERE id = ? AND board_id = ? AND card_id = ? AND version = ?",
    )
    .bind(&attachment_id)
    .bind(&board_id)
    .bind(&card_id)
    .bind(version)
    .map(|row: SqliteRow| AttachmentRecord::from_row(row))
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| format!("Failed to load attachment version: {e}"))?
    .ok_or_else(|| "Attachment version not found".to_string())?
    .map_err(|e| format!("Failed to parse attachment row: {e}"))?;

    let attachment_clone = attachment.clone();

    let existing_attachments: Option<String> =
        sqlx::query_scalar("SELECT attachments FROM kanban_cards WHERE id = ? AND board_id = ?")
            .bind(&card_id)
            .bind(&board_id)
            .fetch_one(&mut *tx)
            .await
            .map_err(|e| format!("Failed to fetch existing attachments: {e}"))?;

    let mut attachments_vec: Vec<String> = existing_attachments
        .as_deref()
        .and_then(|json_str| serde_json::from_str(json_str).ok())
        .unwrap_or_default();
    if !attachments_vec.contains(&attachment.storage_path) {
        attachments_vec.push(attachment.storage_path.clone());
    }

    let attachments_json = serde_json::to_string(&attachments_vec)
        .map_err(|e| format!("Failed to serialize attachments: {e}"))?;

    sqlx::query(
        "UPDATE kanban_cards SET attachments = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? AND board_id = ?",
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

    Ok(attachment_clone.into_json())
}

#[tauri::command]
#[allow(dead_code)]
async fn delete_attachment_version(
    app: AppHandle,
    pool: State<'_, DbPool>,
    args: ManageAttachmentVersionArgs,
) -> Result<(), String> {
    let ManageAttachmentVersionArgs {
        board_id,
        card_id,
        attachment_id,
        target_version,
    } = args;

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {e}"))?;

    let mut tx = pool
        .begin()
        .await
        .map_err(|e| format!("Failed to begin transaction: {e}"))?;

    let storage_paths_to_check: Vec<String> = if let Some(version) = target_version {
        sqlx::query_scalar(
            "SELECT storage_path FROM kanban_attachments WHERE id = ? AND board_id = ? AND card_id = ? AND version = ?",
        )
        .bind(&attachment_id)
        .bind(&board_id)
        .bind(&card_id)
        .bind(version)
        .fetch_all(&mut *tx)
        .await
        .map_err(|e| format!("Failed to fetch attachment storage path: {e}"))?
    } else {
        sqlx::query_scalar(
            "SELECT storage_path FROM kanban_attachments WHERE id = ? AND board_id = ? AND card_id = ?",
        )
        .bind(&attachment_id)
        .bind(&board_id)
        .bind(&card_id)
        .fetch_all(&mut *tx)
        .await
        .map_err(|e| format!("Failed to fetch attachment storage paths: {e}"))?
    };

    if storage_paths_to_check.is_empty() {
        return Err("Attachment version not found".to_string());
    }

    let delete_query = if let Some(version) = target_version {
        sqlx::query(
            "DELETE FROM kanban_attachments WHERE id = ? AND board_id = ? AND card_id = ? AND version = ?",
        )
        .bind(&attachment_id)
        .bind(&board_id)
        .bind(&card_id)
        .bind(version)
    } else {
        sqlx::query("DELETE FROM kanban_attachments WHERE id = ? AND board_id = ? AND card_id = ?")
            .bind(&attachment_id)
            .bind(&board_id)
            .bind(&card_id)
    };

    delete_query
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to delete attachment version: {e}"))?;

    let remaining_storage_paths: Vec<String> = sqlx::query_scalar(
        "SELECT DISTINCT storage_path FROM kanban_attachments WHERE card_id = ? AND board_id = ?",
    )
    .bind(&card_id)
    .bind(&board_id)
    .fetch_all(&mut *tx)
    .await
    .map_err(|e| format!("Failed to fetch remaining attachments: {e}"))?;

    let attachments_json = serde_json::to_string(&remaining_storage_paths)
        .map_err(|e| format!("Failed to serialize attachments: {e}"))?;

    sqlx::query(
        "UPDATE kanban_cards SET attachments = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? AND board_id = ?",
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

    for storage_path in storage_paths_to_check {
        let remaining: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM kanban_attachments WHERE storage_path = ?")
                .bind(&storage_path)
                .fetch_one(&*pool)
                .await
                .map_err(|e| format!("Failed to check attachment references: {e}"))?;

        if remaining == 0 {
            let full_file_path = app_data_dir.join(&storage_path);
            if full_file_path.exists()
                && let Err(e) = fs::remove_file(&full_file_path)
            {
                eprintln!(
                    "Warning: Failed to delete file {}: {}",
                    full_file_path.display(),
                    e
                );
            }
        }
    }

    Ok(())
}
