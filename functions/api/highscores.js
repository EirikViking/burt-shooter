// Cloudflare Pages Function for highscores API

export async function onRequestGet(context) {
  try {
    const db = context.env.DB;

    // Get ALL scores, not grouped by name - show every game played
    const { results } = await db.prepare(
      `SELECT name, score, level, created_at
       FROM game_highscores
       ORDER BY score DESC, created_at DESC
       LIMIT 50`
    ).all();

    return new Response(JSON.stringify(results), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
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

    const { name, score, level } = body;

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

    // Insert score
    const result = await db.prepare(
      'INSERT INTO game_highscores (name, score, level, created_at) VALUES (?, ?, ?, ?)'
    ).bind(sanitizedName, score, level, new Date().toISOString()).run();

    return new Response(JSON.stringify({ success: true, id: result.meta.last_row_id }), {
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
    // DELETE ALL
    await db.prepare('DELETE FROM game_highscores').run();

    return new Response(JSON.stringify({ success: true, message: 'Leaderboard reset' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Error resetting highscores:', error);
    return new Response(JSON.stringify({ error: 'Failed to reset' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
