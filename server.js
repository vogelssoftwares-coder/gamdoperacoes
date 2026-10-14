require("dotenv").config();

const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

pool.connect()
    .then(() => console.log('Conectado ao banco de dados PostgreSQL'))
    .catch(err => console.error('Erro ao conectar ao banco de dados:', err));

app.use(express.json());

app.use('/cadastros', express.static(path.join(__dirname, 'Cadastros')));
app.use('/listas', express.static(path.join(__dirname, 'Listas')));

// Rotas HTML
app.get('/cadastros/cd_ondutystaff.html', (req, res) => res.sendFile(path.join(__dirname, 'Cadastros', 'cd_ondutystaff.html')));
app.get('/listas/list_ondutystaff.html', (req, res) => res.sendFile(path.join(__dirname, 'Listas', 'list_ondutystaff.html')));
app.get('/cadastros/cd_clubs.html', (req, res) => res.sendFile(path.join(__dirname, 'Cadastros', 'cd_clubs.html')));
app.get('/listas/list_clubs.html', (req, res) => res.sendFile(path.join(__dirname, 'Listas', 'list_clubs.html')));
app.get('/cadastros/cd_events.html', (req, res) => res.sendFile(path.join(__dirname, 'Cadastros', 'cd_events.html')));
app.get('/listas/list_events.html', (req, res) => res.sendFile(path.join(__dirname, 'Listas', 'list_events.html')));
app.get('/cadastros/sidebar.js', (req, res) => res.sendFile(path.join(__dirname, 'Cadastros', 'sidebar.js')));

// API ONDUTYSTAFF
app.get('/api/ondutystaff', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM ondutystaff ORDER BY id ASC');
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao buscar membros.' });
    }
});

app.post('/api/ondutystaff', async (req, res) => {
    const { name, color } = req.body;
    if (!name || !color) return res.status(400).json({ error: 'Nome e cor são obrigatórios.' });
    try {
        const result = await pool.query('INSERT INTO ondutystaff (name, color) VALUES ($1, $2) RETURNING *', [name, color]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao cadastrar membro.' });
    }
});

app.put('/api/ondutystaff/:id', async (req, res) => {
    const { id } = req.params;
    const { name, color } = req.body;
    if (!name || !color) return res.status(400).json({ error: 'Nome e cor são obrigatórios.' });
    try {
        const result = await pool.query('UPDATE ondutystaff SET name = $1, color = $2 WHERE id = $3 RETURNING *', [name, color, id]);
        res.status(200).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao atualizar membro.' });
    }
});

app.delete('/api/ondutystaff/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM ondutystaff WHERE id = $1', [req.params.id]);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: 'Erro ao deletar membro.' });
    }
});

// API CLUBS
app.get('/api/clubs', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM clubs ORDER BY id ASC');
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao buscar clubes.' });
    }
});

app.post('/api/clubs', async (req, res) => {
    const { name_club, split_ab, split_ing, valor_cortesia } = req.body;
    if (!name_club) return res.status(400).json({ error: 'O nome do clube é obrigatório.' });
    try {
        const result = await pool.query(
            `INSERT INTO clubs (name_club, split_ab, split_ing, valor_cortesia) VALUES ($1, $2, $3, $4) RETURNING *`,
            [name_club, split_ab || 0, split_ing || 0, valor_cortesia || 0]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao cadastrar clube.' });
    }
});

app.put('/api/clubs/:id', async (req, res) => {
    const { id } = req.params;
    const { name_club, split_ab, split_ing, valor_cortesia } = req.body;
    if (!name_club) return res.status(400).json({ error: 'O nome do clube é obrigatório.' });
    try {
        const result = await pool.query(
            `UPDATE clubs SET name_club = $1, split_ab = $2, split_ing = $3, valor_cortesia = $4 WHERE id = $5 RETURNING *`,
            [name_club, split_ab || 0, split_ing || 0, valor_cortesia || 0, id]
        );
        res.status(200).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao atualizar clube.' });
    }
});

app.delete('/api/clubs/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM clubs WHERE id = $1', [req.params.id]);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: 'Erro ao deletar clube.' });
    }
});

// API EVENTS
app.get('/api/events', async (req, res) => {
    try {
        const query = `
            SELECT 
                e.*,
                c.name_club,
                s.name AS staff_name,
                s.color AS staff_color
            FROM events e
            JOIN clubs c ON e.club_id = c.id
            JOIN ondutystaff s ON e.staff_id = s.id
            ORDER BY e.event_date ASC, e.event_time ASC
        `;
        const result = await pool.query(query);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar eventos.' });
    }
});

// POST: Criar evento
app.post('/api/events', async (req, res) => {
    const { 
        event_name, month, event_date, event_time, sales_start_date, club_id, staff_id,
        has_tickets, has_courtesies, has_ab, has_transactions, has_gamd_zoop, has_split, has_invoicing,
        total_transacted, total_split_ab, split_tickets, qty_tickets, qty_courtesies, total_tickets, total_courtesies
    } = req.body;

    // Removido staff_id da validação obrigatória
    if (!event_name || !month || !event_date || !club_id) {
        return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO events (
                event_name, month, event_date, event_time, sales_start_date, club_id, staff_id,
                has_tickets, has_courtesies, has_ab, has_transactions, has_gamd_zoop, has_split, has_invoicing,
                total_transacted, total_split_ab, split_tickets, qty_tickets, qty_courtesies, total_tickets, total_courtesies
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21) RETURNING *`,
            [
                event_name, month, event_date, event_time || null, sales_start_date || null, club_id, staff_id || null,
                !!has_tickets, !!has_courtesies, !!has_ab, !!has_transactions, !!has_gamd_zoop, !!has_split, !!has_invoicing,
                total_transacted || null, total_split_ab || null, split_tickets || null,
                qty_tickets || null, qty_courtesies || null, total_tickets || null, total_courtesies || null
            ]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao cadastrar evento.' });
    }
});

// PUT: Atualizar evento
app.put('/api/events/:id', async (req, res) => {
    const { id } = req.params;
    const { 
        event_name, month, event_date, event_time, sales_start_date, club_id, staff_id,
        has_tickets, has_courtesies, has_ab, has_transactions, has_gamd_zoop, has_split, has_invoicing,
        total_transacted, total_split_ab, split_tickets, qty_tickets, qty_courtesies, total_tickets, total_courtesies
    } = req.body;

    if (!event_name || !month || !event_date || !club_id) {
        return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
    }

    try {
        const result = await pool.query(
            `UPDATE events SET 
                event_name = $1, month = $2, event_date = $3, event_time = $4, sales_start_date = $5, club_id = $6, staff_id = $7,
                has_tickets = $8, has_courtesies = $9, has_ab = $10, has_transactions = $11, has_gamd_zoop = $12, has_split = $13, has_invoicing = $14,
                total_transacted = $15, total_split_ab = $16, split_tickets = $17, qty_tickets = $18, qty_courtesies = $19, total_tickets = $20, total_courtesies = $21
             WHERE id = $22 RETURNING *`,
            [
                event_name, month, event_date, event_time || null, sales_start_date || null, club_id, staff_id || null,
                !!has_tickets, !!has_courtesies, !!has_ab, !!has_transactions, !!has_gamd_zoop, !!has_split, !!has_invoicing,
                total_transacted || null, total_split_ab || null, split_tickets || null,
                qty_tickets || null, qty_courtesies || null, total_tickets || null, total_courtesies || null,
                id
            ]
        );
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao atualizar evento.' });
    }
});

app.delete('/api/events/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM events WHERE id = $1', [req.params.id]);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: 'Erro ao deletar evento.' });
    }
});

// DASHBOARD
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const totalEventsQuery = 'SELECT COUNT(*)::INT AS total_events FROM events';
        const splitsQuery = `
            SELECT 
                COALESCE(AVG(c.split_ing), 0)::NUMERIC(5,2) AS avg_split_ing,
                COALESCE(AVG(c.split_ab), 0)::NUMERIC(5,2) AS avg_split_ab
            FROM events e
            LEFT JOIN clubs c ON e.club_id = c.id
        `;
        const chartQuery = `
            SELECT month, COUNT(*)::INT as total
            FROM events GROUP BY month ORDER BY MIN(event_date) ASC
        `;

        const [totalRes, splitsRes, chartRes] = await Promise.all([
            pool.query(totalEventsQuery),
            pool.query(splitsQuery),
            pool.query(chartQuery)
        ]);

        res.status(200).json({
            metrics: {
                total_events: totalRes.rows[0].total_events,
                avg_split_ing: splitsRes.rows[0].avg_split_ing,
                avg_split_ab: splitsRes.rows[0].avg_split_ab
            },
            chartData: chartRes.rows
        });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao carregar dados do dashboard.' });
    }
});

app.get('/dashboard.html', (req, res) => res.sendFile(path.join(__dirname, 'Listas', 'dashboard.html')));
app.get('/', (req, res) => res.redirect('/dashboard.html'));

app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));