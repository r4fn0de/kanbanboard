use anyhow::anyhow;
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::{
    sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePool, SqlitePoolOptions, SqliteRow},
    Row, Sqlite, Transaction,
};
use std::fs;
use std::path::PathBuf;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};
use tauri::{AppHandle, Emitter, Manager, State};

const KANBAN_SCHEMA: &str = include_str!("../schema/kanban.sql");
const DATABASE_FILE: &str = "flowspace.db";

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

    let mut columns = sqlx::query_as::<_, (String,)>(
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

    let (current_column_id, card_board_id) = card_info.ok_or_else(|| "Cartão não encontrado.".to_string())?;

    if card_board_id != board_id {
        return Err("O cartão não pertence ao quadro informado.".to_string());
    }

    if current_column_id != from_column_id {
        return Err("O cartão não pertence à coluna de origem informada.".to_string());
    }

    let target_column_board = sqlx::query_scalar::<_, Option<String>>(
        "SELECT board_id FROM kanban_columns WHERE id = ?",
    )
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

        let mut target_cards = sqlx::query_as::<_, (String,)>(
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

    Ok(())
}

fn map_board_row(row: SqliteRow) -> Result<Value, sqlx::Error> {
    Ok(json!({
        "id": row.try_get::<String, _>("id")?,
        "title": row.try_get::<String, _>("title")?,
        "description": row.try_get::<Option<String>, _>("description")?,
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
        "createdAt": row.try_get::<String, _>("created_at")?,
        "updatedAt": row.try_get::<String, _>("updated_at")?,
        "archivedAt": row.try_get::<Option<String>, _>("archived_at")?,
    }))
}

fn map_card_row(row: SqliteRow) -> Result<Value, sqlx::Error> {
    Ok(json!({
        "id": row.try_get::<String, _>("id")?,
        "boardId": row.try_get::<String, _>("board_id")?,
        "columnId": row.try_get::<String, _>("column_id")?,
        "title": row.try_get::<String, _>("title")?,
        "description": row.try_get::<Option<String>, _>("description")?,
        "position": row.try_get::<i64, _>("position")?,
        "priority": row.try_get::<String, _>("priority")?,
        "dueDate": row.try_get::<Option<String>, _>("due_date")?,
        "createdAt": row.try_get::<String, _>("created_at")?,
        "updatedAt": row.try_get::<String, _>("updated_at")?,
        "archivedAt": row.try_get::<Option<String>, _>("archived_at")?,
        "tags": Vec::<String>::new(),
    }))
}

fn normalize_optional_text(value: Option<String>) -> Option<String> {
    value
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
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

#[tauri::command]
async fn load_boards(pool: State<'_, DbPool>) -> Result<Vec<Value>, String> {
    sqlx::query("SELECT id, title, description, created_at, updated_at, archived_at FROM kanban_boards ORDER BY created_at ASC")
        .try_map(map_board_row)
        .fetch_all(&*pool)
        .await
        .map_err(|e| {
            log::error!("Failed to load boards: {e}");
            e.to_string()
        })
}

#[tauri::command]
async fn create_board(
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

    sqlx::query(
        "INSERT INTO kanban_boards (id, title, description, created_at, updated_at) VALUES (?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))",
    )
    .bind(id)
    .bind(title)
    .bind(normalized_description)
    .execute(&*pool)
    .await
    .map(|_| ())
    .map_err(|e| {
        log::error!("Failed to create board: {e}");
        e.to_string()
    })
}

#[tauri::command]
async fn load_columns(pool: State<'_, DbPool>, board_id: String) -> Result<Vec<Value>, String> {
    sqlx::query("SELECT id, board_id, title, position, wip_limit, created_at, updated_at, archived_at FROM kanban_columns WHERE board_id = ? ORDER BY position ASC")
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
    wip_limit: Option<i64>,
) -> Result<(), String> {
    title = title.trim().to_string();
    if title.is_empty() {
        return Err("O nome da coluna não pode ser vazio.".to_string());
    }
    validate_string_input(&title, 200, "Nome da coluna")?;

    let normalized_wip_limit = match wip_limit {
        Some(limit) if limit < 1 => {
            return Err("O limite WIP deve ser um número inteiro positivo.".to_string())
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
        "INSERT INTO kanban_columns (id, board_id, title, position, wip_limit, created_at, updated_at) VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))",
    )
    .bind(&id)
    .bind(&board_id)
    .bind(&title)
    .bind(normalized_position)
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
async fn load_cards(pool: State<'_, DbPool>, board_id: String) -> Result<Vec<Value>, String> {
    sqlx::query("SELECT id, board_id, column_id, title, description, position, priority, due_date, created_at, updated_at, archived_at FROM kanban_cards WHERE board_id = ? ORDER BY position ASC")
        .bind(board_id)
        .try_map(map_card_row)
        .fetch_all(&*pool)
        .await
        .map_err(|e| {
            log::error!("Failed to load cards: {e}");
            e.to_string()
        })
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

    let stored_board_id = sqlx::query_scalar::<_, Option<String>>(
        "SELECT board_id FROM kanban_columns WHERE id = ?",
    )
    .bind(&column_id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| format!("Falha ao validar coluna informada: {e}"))?;

    match stored_board_id {
        Some(db_board_id) if db_board_id == board_id => {}
        Some(_) => {
            return Err("A coluna informada não pertence ao quadro selecionado.".to_string())
        }
        None => {
            return Err("Coluna não encontrada.".to_string())
        }
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

            let pool = tauri::async_runtime::block_on(establish_pool(&handle))
                .map_err(|e| anyhow!(e))?;

            tauri::async_runtime::block_on(initialize_schema(&pool))
                .map_err(|e| anyhow!(e))?;

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
            load_boards,
            create_board,
            load_columns,
            create_column,
            move_column,
            load_cards,
            create_card,
            move_card
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
