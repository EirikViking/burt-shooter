// Cloudflare Pages Function for highscores API
import { getRankFromLevel } from '../shared/RankPolicy.js';

const BLOCKED_PUBLIC_NAME_TERMS = [
  ['K', 'LAUS'].join(''),
  ['F', 'ITTE'].join(''),
  ['K', 'UKEN'].join(''),
  ['FAT', 'MAN'].join(''),
  ['MOR', 'DER'].join('')
];
const PUBLIC_PILOT_NAME_MAX_LENGTH = 14;

function validatePublicPilotName(rawName, { allowBlank = false } = {}) {
  const cleaned = String(rawName || '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .trim()
    .slice(0, PUBLIC_PILOT_NAME_MAX_LENGTH);
  if (!cleaned) {
    return allowBlank
      ? { valid: true, publicName: '', reason: null }
      : { valid: false, publicName: '', reason: 'blank' };
  }
  const compact = cleaned.replace(/\s+/g, '');
  if (BLOCKED_PUBLIC_NAME_TERMS.some(term => compact.includes(term))) {
    return { valid: false, publicName: cleaned, reason: 'blocked' };
  }
  return { valid: true, publicName: cleaned, reason: null };
}

function toPublicPilotName(rawName, fallbackSeed = 0) {
  const seed = Math.abs(Number(fallbackSeed) || 0).toString().slice(-2).padStart(2, '0');
  const validation = validatePublicPilotName(rawName, { allowBlank: false });
  if (!validation.valid) return `PILOT${seed}`;
  return validation.publicName;
}

function readScoreLevel(entry = {}, fallback = 1) {
  const details = Array.isArray(entry.details)
    ? entry.details
    : Array.isArray(entry.scoreDetails)
      ? entry.scoreDetails
      : Array.isArray(entry.metadata?.details)
        ? entry.metadata.details
        : [];
  for (const value of [
    entry.level,
    entry.levelReached,
    entry.metadata?.level,
    entry.metadata?.levelReached,
    details[0]
  ]) {
    if (value === null || value === undefined || value === '') continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.max(1, Math.floor(parsed));
  }
  return Math.max(1, Math.floor(Number(fallback) || 1));
}

function hasScoreLevel(entry = {}) {
  const details = Array.isArray(entry.details)
    ? entry.details
    : Array.isArray(entry.scoreDetails)
      ? entry.scoreDetails
      : Array.isArray(entry.metadata?.details)
        ? entry.metadata.details
        : [];
  return [
    entry.level,
    entry.levelReached,
    entry.metadata?.level,
    entry.metadata?.levelReached,
    details[0]
  ].some(value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)));
}

// Schema detection cache
let schemaChecked = false;
let hasRankIndexColumn = false;

async function checkSchema(db) {
  if (schemaChecked) return { hasRankIndexColumn };

  try {
    const { results } = await db.prepare('PRAGMA table_info(game_highscores)').all();
    hasRankIndexColumn = results.some(col => col.name === 'rank_index');
    schemaChecked = true;
  } catch (error) {
    console.error('Schema check failed, assuming no rank_index column:', error);
    hasRankIndexColumn = false;
    schemaChecked = true;
  }

  return { hasRankIndexColumn };
}

export async function onRequestGet(context) {
  try {
    const db = context.env.DB;
    const { hasRankIndexColumn: hasRankIndex } = await checkSchema(db);

    // Build query based on schema
    const selectFields = hasRankIndex
      ? 'id, name, score, level, rank_index, created_at'
      : 'id, name, score, level, created_at';

    const { results } = await db.prepare(
      `SELECT ${selectFields}
       FROM game_highscores
       ORDER BY score DESC, created_at DESC
       LIMIT 20`
    ).all();

    // Always compute rank_index for response (compute if missing)
    const enrichedResults = results.map(entry => {
      const rank_index = (hasRankIndex && entry.rank_index !== null && entry.rank_index !== undefined)
        ? entry.rank_index
        : getRankFromLevel(entry.level);

      return {
        id: entry.id,
        name: toPublicPilotName(entry.name, entry.id),
        score: entry.score,
        level: entry.level,
        rank_index,
        created_at: entry.created_at
      };
    });

    return new Response(JSON.stringify(enrichedResults), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
      }
    });
  } catch (error) {
    console.error('Error fetching highscores:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch highscores' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

export async function onRequestPost(context) {
  try {
    const db = context.env.DB;
    const body = await context.request.json();

    const { name, score, submissionId } = body;
    const level = hasScoreLevel(body) ? readScoreLevel(body, 1) : NaN;
    // NOTE: Ignore any client-provided rank or rankIndex - backend is authoritative

    // Validation
    if (!name || typeof score !== 'number' || !Number.isFinite(score) || !Number.isFinite(level)) {
      return new Response(JSON.stringify({ error: 'Invalid input' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const nameValidation = validatePublicPilotName(name);
    if (!nameValidation.valid) {
      return new Response(JSON.stringify({ error: nameValidation.reason === 'blocked' ? 'Name not available' : 'Invalid name' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    const sanitizedName = nameValidation.publicName;

    // Compute rank_index from level (backend authority)
    const computedRankIndex = getRankFromLevel(level);
    const { hasRankIndexColumn: hasRankIndex } = await checkSchema(db);

    // DEDUPLICATION: Check if submissionId already exists
    if (submissionId) {
      try {
        // Check for existing submission with this ID
        // Note: This assumes submission_id column exists. If not, this will be a no-op.
        const existing = await db.prepare(
          'SELECT id, score, rank_index FROM game_highscores WHERE submission_id = ? LIMIT 1'
        ).bind(submissionId).first();

        if (existing) {
          console.log('[Highscores] Duplicate submissionId detected, returning existing entry:', submissionId);
          return new Response(JSON.stringify({
            success: true,
            id: existing.id,
            rank_index: existing.rank_index || computedRankIndex,
            duplicate: true
          }), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
      } catch (err) {
        // Column might not exist yet, continue with insert
        console.warn('[Highscores] submission_id column not found, skipping dedup check:', err.message);
      }
    }

    // Insert based on schema
    let result;
    if (hasRankIndex) {
      // Try to insert with submission_id if provided
      if (submissionId) {
        try {
          result = await db.prepare(
            'INSERT INTO game_highscores (name, score, level, rank_index, submission_id, created_at) VALUES (?, ?, ?, ?, ?, ?)'
          ).bind(sanitizedName, score, level, computedRankIndex, submissionId, new Date().toISOString()).run();
        } catch (err) {
          // Fallback if submission_id column doesn't exist
          console.warn('[Highscores] submission_id insert failed, falling back:', err.message);
          result = await db.prepare(
            'INSERT INTO game_highscores (name, score, level, rank_index, created_at) VALUES (?, ?, ?, ?, ?)'
          ).bind(sanitizedName, score, level, computedRankIndex, new Date().toISOString()).run();
        }
      } else {
        result = await db.prepare(
          'INSERT INTO game_highscores (name, score, level, rank_index, created_at) VALUES (?, ?, ?, ?, ?)'
        ).bind(sanitizedName, score, level, computedRankIndex, new Date().toISOString()).run();
      }
    } else {
      result = await db.prepare(
        'INSERT INTO game_highscores (name, score, level, created_at) VALUES (?, ?, ?, ?)'
      ).bind(sanitizedName, score, level, new Date().toISOString()).run();
    }

    return new Response(JSON.stringify({ success: true, id: result.meta.last_row_id, rank_index: computedRankIndex }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Error submitting score:', error);
    return new Response(JSON.stringify({ error: 'Failed to submit score' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

export async function onRequestDelete(context) {
  try {
    const db = context.env.DB;
    const url = new URL(context.request.url);
    const entryId = url.searchParams.get('id');

    if (entryId) {
      // DELETE specific entry by ID
      const result = await db.prepare('DELETE FROM game_highscores WHERE id = ?')
        .bind(parseInt(entryId, 10))
        .run();

      return new Response(JSON.stringify({
        success: true,
        message: `Entry ${entryId} deleted`,
        changes: result.meta.changes
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } else {
      // DELETE ALL (reset leaderboard)
      await db.prepare('DELETE FROM game_highscores').run();

      return new Response(JSON.stringify({ success: true, message: 'Leaderboard reset' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  } catch (error) {
    console.error('Error deleting highscores:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
