// Cloudflare Pages Function for highscores API
import { getRankFromScore } from '../shared/RankPolicy.js';

// Schema detection cache
let schemaChecked = false;
let hasRankIndexColumn = false;
let hasWalletColumn = false;

async function checkSchema(db) {
  if (schemaChecked) return { hasRankIndexColumn, hasWalletColumn };

  try {
    const { results } = await db.prepare('PRAGMA table_info(game_highscores)').all();
    hasRankIndexColumn = results.some(col => col.name === 'rank_index');
    hasWalletColumn = results.some(col => col.name === 'wallet_address');
    schemaChecked = true;
  } catch (error) {
    console.error('Schema check failed, assuming no rank_index column:', error);
    hasRankIndexColumn = false;
    hasWalletColumn = false;
    schemaChecked = true;
  }

  return { hasRankIndexColumn, hasWalletColumn };
}

export async function onRequestGet(context) {
  try {
    const db = context.env.DB;
    const { hasRankIndexColumn: hasRankIndex, hasWalletColumn } = await checkSchema(db);

    // Build query based on schema
    const selectFields = hasRankIndex
      ? 'id, name, score, level, rank_index, created_at'
      : 'id, name, score, level, created_at';
    const selectWithWallet = hasWalletColumn ? `${selectFields}, wallet_address` : selectFields;

    const { results } = await db.prepare(
      `SELECT ${selectWithWallet}
       FROM game_highscores
       ORDER BY score DESC, created_at DESC
       LIMIT 10`
    ).all();

    // Always compute rank_index for response (compute if missing)
    const enrichedResults = results.map(entry => {
      const rank_index = (hasRankIndex && entry.rank_index !== null && entry.rank_index !== undefined)
        ? entry.rank_index
        : getRankFromScore(entry.score);

      const walletAddress = (hasWalletColumn && typeof entry.wallet_address === 'string' && entry.wallet_address.trim().length > 0)
        ? entry.wallet_address
        : null;
      const hasWallet = !!walletAddress;
      return { ...entry, rank_index, walletAddress, hasWallet };
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

    const { name, score, level, submissionId, walletAddress } = body;
    // NOTE: Ignore any client-provided rank or rankIndex - backend is authoritative

    // Validation
    if (!name || typeof score !== 'number' || typeof level !== 'number') {
      return new Response(JSON.stringify({ error: 'Invalid input' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Sanitize name
    const sanitizedName = name.slice(0, 10).toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (sanitizedName.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid name' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Compute rank_index from score (backend authority)
    const computedRankIndex = getRankFromScore(score);
    const { hasRankIndexColumn: hasRankIndex, hasWalletColumn } = await checkSchema(db);
    const trimmedWallet = (typeof walletAddress === 'string') ? walletAddress.trim().slice(0, 120) : '';
    const walletValue = trimmedWallet.length > 0 ? trimmedWallet : null;

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
          if (hasWalletColumn) {
            result = await db.prepare(
              'INSERT INTO game_highscores (name, score, level, rank_index, submission_id, wallet_address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
            ).bind(sanitizedName, score, level, computedRankIndex, submissionId, walletValue, new Date().toISOString()).run();
          } else {
            result = await db.prepare(
              'INSERT INTO game_highscores (name, score, level, rank_index, submission_id, created_at) VALUES (?, ?, ?, ?, ?, ?)'
            ).bind(sanitizedName, score, level, computedRankIndex, submissionId, new Date().toISOString()).run();
          }
        } catch (err) {
          // Fallback if submission_id column doesn't exist
          console.warn('[Highscores] submission_id insert failed, falling back:', err.message);
          if (hasWalletColumn) {
            result = await db.prepare(
              'INSERT INTO game_highscores (name, score, level, rank_index, wallet_address, created_at) VALUES (?, ?, ?, ?, ?, ?)'
            ).bind(sanitizedName, score, level, computedRankIndex, walletValue, new Date().toISOString()).run();
          } else {
            result = await db.prepare(
              'INSERT INTO game_highscores (name, score, level, rank_index, created_at) VALUES (?, ?, ?, ?, ?)'
            ).bind(sanitizedName, score, level, computedRankIndex, new Date().toISOString()).run();
          }
        }
      } else {
        if (hasWalletColumn) {
          result = await db.prepare(
            'INSERT INTO game_highscores (name, score, level, rank_index, wallet_address, created_at) VALUES (?, ?, ?, ?, ?, ?)'
          ).bind(sanitizedName, score, level, computedRankIndex, walletValue, new Date().toISOString()).run();
        } else {
          result = await db.prepare(
            'INSERT INTO game_highscores (name, score, level, rank_index, created_at) VALUES (?, ?, ?, ?, ?)'
          ).bind(sanitizedName, score, level, computedRankIndex, new Date().toISOString()).run();
        }
      }
    } else {
      if (hasWalletColumn) {
        result = await db.prepare(
          'INSERT INTO game_highscores (name, score, level, wallet_address, created_at) VALUES (?, ?, ?, ?, ?)'
        ).bind(sanitizedName, score, level, walletValue, new Date().toISOString()).run();
      } else {
        result = await db.prepare(
          'INSERT INTO game_highscores (name, score, level, created_at) VALUES (?, ?, ?, ?)'
        ).bind(sanitizedName, score, level, new Date().toISOString()).run();
      }
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
